# PDF Worker - Go Microservice

High-performance PDF watermarking service using Ghostscript for handling large AVEVA drawings (200MB+).

## Features

- HTTP API on port 8080
- Ghostscript-based watermarking (handles files >200MB)
- QR code generation for document verification
- Direct R2 storage integration
- Memory-efficient processing

## Environment Variables

Required:
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - R2 bucket name
- `QR_VERIFICATION_BASE_URL` - Base URL for QR verification (default: https://docuroute.io)

Optional:
- `PORT` - HTTP port (default: 8080)
- `PDF_WORKER_MEMORY_LIMIT_MB` - Memory limit in MB (default: 1024)

## API

### POST /watermark

Request:
```json
{
  "fileKey": "documents/abc123.pdf",
  "documentId": "doc-id",
  "revisionId": "rev-id",
  "revisionCode": "A1",
  "issuePurpose": "FOR_CONSTRUCTION",
  "companyId": "company-id"
}
```

Response (Success):
```json
{
  "success": true,
  "watermarkedKey": "watermarked/documents/abc123.pdf"
}
```

Response (Error):
```json
{
  "success": false,
  "error": "Error message"
}
```

### GET /health

Returns service health status.

## Building

```bash
docker build -t pdf-worker .
```

## Running Locally

```bash
export R2_ACCOUNT_ID=your-account-id
export R2_ACCESS_KEY_ID=your-access-key
export R2_SECRET_ACCESS_KEY=your-secret-key
export R2_BUCKET_NAME=your-bucket
export QR_VERIFICATION_BASE_URL=https://docuroute.io

go run main.go
```

## Deployment

See `render.yaml` for production deployment configuration on Render.com.
