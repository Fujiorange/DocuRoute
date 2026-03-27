# Stage 1: Build Go binary
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o pdf-worker ./main.go

# Stage 2: Production image with Ghostscript
FROM alpine:latest

# Install Ghostscript and dependencies
RUN apk add --no-cache \
    ghostscript \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create directory for Ghostscript scripts
RUN mkdir -p /etc/ghostscript

# Copy binary from builder
COPY --from=builder /app/pdf-worker /usr/local/bin/pdf-worker

# Copy Ghostscript watermark script
COPY --from=builder /app/ghostscript/watermark.sh /etc/ghostscript/watermark.sh
RUN chmod +x /etc/ghostscript/watermark.sh

# Create temp directory with proper permissions
RUN mkdir -p /tmp && chmod 1777 /tmp

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV PDF_WORKER_MEMORY_LIMIT_MB=1024

# Run as non-root user for security
RUN adduser -D -u 1000 pdfworker
USER pdfworker

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the service
CMD ["pdf-worker"]
