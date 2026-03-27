package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	qrcode "github.com/skip2/go-qrcode"
)

type WatermarkRequest struct {
	FileKey      string `json:"fileKey"`
	DocumentId   string `json:"documentId"`
	RevisionId   string `json:"revisionId"`
	RevisionCode string `json:"revisionCode"`
	IssuePurpose string `json:"issuePurpose"`
	CompanyId    string `json:"companyId"`
}

type WatermarkResponse struct {
	Success        bool   `json:"success"`
	WatermarkedKey string `json:"watermarkedKey,omitempty"`
	Error          string `json:"error,omitempty"`
}

type WatermarkHandler struct {
	s3Client   *s3.S3
	bucketName string
	qrBaseURL  string
}

func NewWatermarkHandler() *WatermarkHandler {
	// Initialize S3 client for R2
	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", os.Getenv("R2_ACCOUNT_ID"))

	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String("auto"),
		Endpoint:    aws.String(r2Endpoint),
		Credentials: credentials.NewStaticCredentials(os.Getenv("R2_ACCESS_KEY_ID"), os.Getenv("R2_SECRET_ACCESS_KEY"), ""),
		S3ForcePathStyle: aws.Bool(true),
	})

	if err != nil {
		log.Fatalf("Failed to create AWS session: %v", err)
	}

	qrBaseURL := os.Getenv("QR_VERIFICATION_BASE_URL")
	if qrBaseURL == "" {
		qrBaseURL = "https://docuroute.io"
	}

	return &WatermarkHandler{
		s3Client:   s3.New(sess),
		bucketName: os.Getenv("R2_BUCKET_NAME"),
		qrBaseURL:  qrBaseURL,
	}
}

func (h *WatermarkHandler) HandleWatermark(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request
	var req WatermarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Processing watermark request for document %s, revision %s", req.DocumentId, req.RevisionId)

	// Download file from R2
	pdfBytes, err := h.downloadFromR2(req.FileKey)
	if err != nil {
		log.Printf("Failed to download file from R2: %v", err)
		respondWithError(w, fmt.Sprintf("Failed to download file: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate QR code
	qrURL := fmt.Sprintf("%s/verify/%s?rev=%s", h.qrBaseURL, req.DocumentId, req.RevisionId)
	qrBytes, err := qrcode.Encode(qrURL, qrcode.High, 200)
	if err != nil {
		log.Printf("Failed to generate QR code: %v", err)
		respondWithError(w, "Failed to generate QR code", http.StatusInternalServerError)
		return
	}

	// Create temporary files
	tmpDir, err := os.MkdirTemp("", "pdf-watermark-*")
	if err != nil {
		log.Printf("Failed to create temp directory: %v", err)
		respondWithError(w, "Failed to create temp directory", http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(tmpDir)

	inputPath := filepath.Join(tmpDir, "input.pdf")
	qrPath := filepath.Join(tmpDir, "qr.png")
	outputPath := filepath.Join(tmpDir, "output.pdf")

	// Write input files
	if err := os.WriteFile(inputPath, pdfBytes, 0644); err != nil {
		log.Printf("Failed to write input PDF: %v", err)
		respondWithError(w, "Failed to write input PDF", http.StatusInternalServerError)
		return
	}

	if err := os.WriteFile(qrPath, qrBytes, 0644); err != nil {
		log.Printf("Failed to write QR code: %v", err)
		respondWithError(w, "Failed to write QR code", http.StatusInternalServerError)
		return
	}

	// Call Ghostscript watermarking script
	scriptPath := "/etc/ghostscript/watermark.sh"
	cmd := exec.Command(scriptPath, inputPath, outputPath, qrPath, req.RevisionCode)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Printf("Ghostscript failed: %v, stderr: %s", err, stderr.String())
		respondWithError(w, fmt.Sprintf("Watermarking failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Read watermarked PDF
	watermarkedBytes, err := os.ReadFile(outputPath)
	if err != nil {
		log.Printf("Failed to read watermarked PDF: %v", err)
		respondWithError(w, "Failed to read watermarked PDF", http.StatusInternalServerError)
		return
	}

	// Upload to R2
	watermarkedKey := fmt.Sprintf("watermarked/%s", req.FileKey)
	if err := h.uploadToR2(watermarkedKey, watermarkedBytes); err != nil {
		log.Printf("Failed to upload to R2: %v", err)
		respondWithError(w, fmt.Sprintf("Failed to upload: %v", err), http.StatusInternalServerError)
		return
	}

	// Return success response
	resp := WatermarkResponse{
		Success:        true,
		WatermarkedKey: watermarkedKey,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
	log.Printf("Successfully watermarked document %s", req.DocumentId)
}

func (h *WatermarkHandler) downloadFromR2(fileKey string) ([]byte, error) {
	result, err := h.s3Client.GetObject(&s3.GetObjectInput{
		Bucket: aws.String(h.bucketName),
		Key:    aws.String(fileKey),
	})
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()

	return io.ReadAll(result.Body)
}

func (h *WatermarkHandler) uploadToR2(fileKey string, data []byte) error {
	_, err := h.s3Client.PutObject(&s3.PutObjectInput{
		Bucket:      aws.String(h.bucketName),
		Key:         aws.String(fileKey),
		Body:        bytes.NewReader(data),
		ContentType: aws.String("application/pdf"),
	})
	return err
}

func respondWithError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	resp := WatermarkResponse{
		Success: false,
		Error:   message,
	}
	json.NewEncoder(w).Encode(resp)
}
