package main

import (
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/shafins-course/backend/internal/services"
)

func main() {
	// Load .env
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Could not load .env file in the current directory")
	}

	fmt.Println("STORE_ID:", os.Getenv("SSLCOMMERZ_STORE_ID"))
	fmt.Println("STORE_PASSWORD:", os.Getenv("SSLCOMMERZ_STORE_PASSWORD"))
	fmt.Println("IS_SANDBOX:", os.Getenv("SSLCOMMERZ_IS_SANDBOX"))

	svc := services.NewSSLCommerzService()
	tranID := uuid.New().String()
	url, err := svc.InitiatePayment(tranID, 100.0, "BDT", "Scratch Course Test", "customer@example.com", "customer@example.com")
	if err != nil {
		log.Fatalf("InitiatePayment failed: %v", err)
	}
	fmt.Println("Payment initiated successfully! URL:", url)
}
