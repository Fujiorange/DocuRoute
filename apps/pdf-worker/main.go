package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/Fujiorange/DocuRoute/apps/pdf-worker/handlers"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize handler
	handler := handlers.NewWatermarkHandler()

	// Routes
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/watermark", handler.HandleWatermark)

	// Start server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("PDF Worker starting on port %s", port)
	log.Printf("Memory limit: %s MB", os.Getenv("PDF_WORKER_MEMORY_LIMIT_MB"))

	server := &http.Server{
		Addr:         addr,
		ReadTimeout:  10 * time.Minute, // Long timeout for large files
		WriteTimeout: 10 * time.Minute,
		IdleTimeout:  30 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"ok","service":"pdf-worker"}`)
}
