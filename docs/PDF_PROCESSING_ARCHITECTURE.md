# PDF Processing Architecture - Performance & Scalability Analysis

## Current Implementation (Phase 1)

### Architecture Overview

**Location:** `packages/core/src/watermark.ts` and `apps/worker/src/workers/watermark.worker.ts`

**Technology Stack:**
- Node.js worker pool (`workerpool` v10.0.1)
- `pdf-lib` v1.17.1 for PDF manipulation
- Child process isolation with memory limits
- BullMQ for job queue management

**Configuration:**
```typescript
POOL_SIZE = 2 workers
MAX_WORKER_MEMORY_MB = 512 MB per worker
MAX_WATERMARK_SIZE_BYTES = 200 MB per file
```

### Current Limitations

#### 1. Memory Bottleneck (CRITICAL)
**The Reality:** Even with 512MB memory cap per worker, large CAD exports (P&ID drawings from AVEVA, Tribon) cause issues:

- **Base64 Encoding Overhead:** Converting 200MB files to base64 creates 267MB buffers (33% overhead)
- **PDF-lib Memory Usage:** Parsing complex vector graphics can spike to 3-4x file size
- **Garbage Collection Pressure:** V8 GC pauses can block the event loop for seconds
- **Risk:** 180MB+ technical drawings will likely cause OOM crashes on standard Render instances

#### 2. Processing Speed
**Current Performance:**
- Simple PDFs (text-based): 2-5 seconds
- Complex CAD drawings (vector-heavy): 30-120 seconds
- 200MB files: Frequently timeout or crash

#### 3. Scalability Concerns
**Render Standard Instance:**
- 512MB RAM per instance
- Limited to 2 workers = max 2 concurrent PDF jobs
- Under load, queue backlog will grow rapidly

### Problem Statement from Gemini Feedback

> "Even with the worker pool, a 180MB P&ID drawing from AVEVA will likely cause an OOM crash or block the event loop for minutes. Render standard instances will choke."

**Why Node.js is Wrong Tool for This:**
1. **V8 Heap Limitations:** Not designed for heavy binary manipulation
2. **Single-threaded GC:** Major GC pauses affect entire process
3. **Buffer Management:** Multiple large buffer allocations (input, base64, output)
4. **PDF Parsing:** `pdf-lib` parses entire document into memory (not streaming)

---

## Recommended Solution: External PDF Processing Service

### Option 1: Go/Rust Microservice (RECOMMENDED)

**Architecture:**
- Lightweight Go or Rust service dedicated to PDF processing
- Deployed as separate Render Web Service or Docker container
- Communicates with main app via HTTP API or shared Redis queue

**Benefits:**
- **Better Memory Management:** Native memory allocation, no GC pauses
- **Superior Performance:** Go/Rust 5-10x faster than Node.js for PDF ops
- **Streaming Support:** Can process PDFs without loading entire file into memory
- **Isolated Failures:** PDF service crashes don't affect main application
- **Horizontal Scaling:** Can scale PDF service independently based on load

**Libraries:**
- Go: `pdfcpu`, `unidoc/unipdf`, `jung-kurt/gofpdf`
- Rust: `lopdf`, `printpdf`

**Implementation Sketch:**
```go
// Go microservice example
package main

import (
    "github.com/pdfcpu/pdfcpu/pkg/api"
    "github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
)

func watermarkPDF(inputPath, outputPath, watermarkText string) error {
    wm, _ := pdfcpu.ParseTextWatermarkDetails(watermarkText, "font:Helvetica, points:48, rot:45, opacity:0.2")
    return api.AddWatermarksFile(inputPath, outputPath, nil, wm, nil)
}
```

**Deployment:**
- Separate Render Web Service (512MB RAM, ~$7/month)
- Docker image: ~50MB (vs Node.js 200MB+)
- Auto-scaling based on queue depth

### Option 2: AWS Lambda with Specialized Binary (GOOD ALTERNATIVE)

**Architecture:**
- AWS Lambda function triggered by BullMQ or S3 upload events
- Use precompiled binaries: Ghostscript, QPDF, or PDFtk
- Input/output via S3 (no memory concerns)

**Benefits:**
- **Zero Infrastructure:** Fully serverless
- **Cost Efficient:** Pay per invocation (typically $0.001-0.01 per PDF)
- **Proven Tools:** Ghostscript handles 500MB+ files reliably
- **Automatic Scaling:** Lambda scales to 1000s of concurrent executions
- **10GB Memory Available:** Can configure up to 10GB per function

**Tools:**
- **Ghostscript:** Industry standard, handles encrypted/corrupted PDFs
- **QPDF:** Excellent for PDF manipulation, linearization
- **PDFtk:** Simple CLI for stamps/watermarks

**Implementation Sketch:**
```typescript
// Lambda handler
import { S3, Lambda } from 'aws-sdk'
import { spawn } from 'child_process'

export async function handler(event: any) {
  const { fileKey, documentId, revisionId } = event

  // Download from S3 to /tmp
  const inputPath = `/tmp/${fileKey}`
  await downloadFromS3(fileKey, inputPath)

  // Run ghostscript for watermark
  await execShellCommand(`
    gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite \
       -sOutputFile=/tmp/output.pdf \
       /tmp/watermark.pdf ${inputPath}
  `)

  // Upload result back to S3
  await uploadToS3('/tmp/output.pdf', `watermarked/${fileKey}`)

  return { success: true }
}
```

**Cost Estimate:**
- 1000 PDFs/month @ 30 seconds each = $5-10/month
- Much cheaper than dedicated server

### Option 3: Cloudflare Workers + R2 (EXPLORATORY)

**Architecture:**
- Cloudflare Workers for orchestration
- Heavy processing delegated to Cloudflare's PDF rendering API (if available)
- Or use Cloudflare Workers Unbound for longer execution times

**Benefits:**
- Already using Cloudflare R2 for storage
- Workers run at edge (low latency)
- Generous free tier

**Limitations:**
- Workers have 128MB memory limit (standard)
- Unbound: 30-second CPU time limit
- May still need external tool for complex PDFs

---

## Migration Strategy (Phase 2)

### Step 1: Prepare External Service
1. Choose architecture (Go microservice recommended)
2. Implement PDF watermark service with QR code embedding
3. Deploy to Render as separate service
4. Add health checks and monitoring

### Step 2: Update DocuRoute Integration
1. Modify `watermark.worker.ts` to call external service via HTTP
2. Keep existing workerpool as fallback for small files (<10MB)
3. Route large files (>10MB) to external service
4. Update BullMQ retry logic for HTTP failures

### Step 3: Testing & Rollout
1. Test with real AVEVA/Tribon CAD exports (180MB+)
2. Load test: 100 concurrent PDFs
3. Monitor memory usage and OOM events
4. Gradual rollout with feature flag

### Step 4: Decommission Node.js Workers (Optional)
Once confident in external service:
1. Route ALL PDFs to external service
2. Remove `workerpool` and `pdf-lib` dependencies
3. Simplify worker to HTTP client only

---

## Interim Optimizations (If External Service Delayed)

### 1. Use File System Instead of Base64
```typescript
// Instead of base64 encoding (33% overhead)
const tempFile = `/tmp/${documentId}-${Date.now()}.pdf`
await fs.writeFile(tempFile, inputBuffer)

// Pass file path to worker (not base64 string)
const result = await workerPool.exec('watermarkPDFFromFile', [tempFile])
```

**Benefit:** Eliminates 67MB overhead on 200MB files

### 2. Increase Worker Memory Limit
```typescript
MAX_WORKER_MEMORY_MB = 1024 // Double to 1GB
```

**Trade-off:** Render instance needs more RAM (upgrade to Pro plan)

### 3. Implement Streaming Where Possible
```typescript
// Use pdf-lib streaming mode (if supported)
const pdfDoc = await PDFDocument.load(inputStream, {
  ignoreEncryption: true,
  updateMetadata: false
})
```

**Benefit:** Reduces peak memory usage

### 4. Add Circuit Breaker for Large Files
```typescript
if (fileSize > 100 * 1024 * 1024) { // 100MB
  return {
    watermarkApplied: false,
    reason: 'FILE_TOO_LARGE',
    recommendation: 'Contact support for manual processing'
  }
}
```

**Benefit:** Prevents OOM crashes, better user experience

---

## Recommendation Summary

**For Production Launch (Mid-April 2026):**
1. **Immediate:** Implement interim optimizations (file system, circuit breaker)
2. **Within 2 weeks:** Deploy Go microservice for PDF processing
3. **Migration:** Route large files (>50MB) to Go service
4. **Phase 2:** Migrate all PDFs to external service, remove Node.js workers

**Cost Impact:**
- Go microservice: +$7-15/month (Render Web Service)
- Lambda approach: +$5-20/month (usage-based)
- **ROI:** Eliminates OOM crashes, supports 500MB+ files, better compliance story

**Timeline:**
- Go microservice MVP: 3-5 days
- Integration & testing: 2-3 days
- Production deployment: 1 day
- **Total:** ~1 week for full implementation

---

## Additional Phase 2 Considerations

From Gemini feedback on BIM Import and Offline Conflict Resolution:

### 1. Offline Conflict Resolution
**Concern:** "Last physical timestamp wins" is dangerous for commissioning data

**Recommendation:**
- Implement manual conflict resolution queue for critical field data
- Flag conflicting updates (e.g., Engineer A fails test, Engineer B passes while offline)
- Require supervisor review before applying offline changes to test results
- Store both versions with metadata: `{ appliedVersion, conflictedVersion, resolvedBy }`

### 2. BIM Import Bulk Updates
**Concern:** One-way import from AVEVA/Tribon means model changes cause orphaned documents

**Recommendation:**
- Implement bulk tag update API with audit trail
- Support CSV import for tag mapping changes
- Provide reconciliation report: "50 documents now orphaned, 20 tags renamed"
- Allow bulk document re-association with updated equipment tags

---

## Performance Monitoring Checklist

Add these metrics to production monitoring:

- [ ] Average PDF processing time by file size
- [ ] OOM crash rate per worker
- [ ] Queue depth over time
- [ ] P95/P99 latency for watermark jobs
- [ ] Failed job reasons (FILE_TOO_LARGE, ENCRYPTED, TIMEOUT)
- [ ] Memory usage per worker over time
- [ ] GC pause duration (Node.js only)
