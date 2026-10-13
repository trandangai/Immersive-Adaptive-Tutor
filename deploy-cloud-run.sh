#!/usr/bin/env bash
# ========================================================
# Google Cloud Run Deployment Script
# Immersive Adaptive Tutor
# ========================================================

set -euo pipefail

# Configuration Defaults (modify or pass as environment variables)
PROJECT_ID="${GCP_PROJECT_ID:-gen-lang-client-0143328501}"
SERVICE_NAME="${SERVICE_NAME:-immersive-adaptive-tutor}"
REGION="${GCP_REGION:-asia-northeast1}"

echo "=========================================================="
echo "🚀 Deploying Immersive Adaptive Tutor to Google Cloud Run"
echo "Project ID:   ${PROJECT_ID}"
echo "Service Name: ${SERVICE_NAME}"
echo "Region:       ${REGION}"
echo "=========================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: Google Cloud SDK (gcloud) is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Ensure user is authenticated
echo "🔍 Verifying active Google Cloud account..."
gcloud config set project "${PROJECT_ID}"

# Enable necessary Google Cloud APIs if not already enabled
echo "⚙️  Enabling required Google Cloud APIs (run, cloudbuild, artifactregistry)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Check for GEMINI_API_KEY
if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo "⚠️  Note: GEMINI_API_KEY is not set in your current shell."
    read -r -s -p "Enter your GEMINI_API_KEY (press Enter to skip if configured in Secret Manager): " USER_KEY
    echo ""
    if [ -n "${USER_KEY}" ]; then
        GEMINI_API_KEY="${USER_KEY}"
    fi
fi

ENV_VARS_FLAG=""
if [ -n "${GEMINI_API_KEY:-}" ]; then
    ENV_VARS_FLAG="--set-env-vars=GEMINI_API_KEY=${GEMINI_API_KEY},NODE_ENV=production"
else
    ENV_VARS_FLAG="--set-env-vars=NODE_ENV=production"
fi

echo "📦 Building and deploying directly from local source via Google Cloud Build..."
gcloud run deploy "${SERVICE_NAME}" \
    --source . \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    ${ENV_VARS_FLAG}

echo "=========================================================="
echo "✅ Deployment successful! Your service is live on Cloud Run."
echo "=========================================================="
