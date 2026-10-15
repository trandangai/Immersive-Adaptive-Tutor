# Deployment Guide — Immersive Adaptive Tutor

This application is a full-stack Node.js + Express + React SPA that includes:
- Vite React Frontend
- Express API server (`server.ts`) with Gemini 2.5 Flash endpoints
- Firebase Firestore & Firebase Auth integration
- Cloud Run container readiness (`Dockerfile` with multi-stage compilation)

---

## 0. Current Live AI Studio URL (Already Deployed)
Your application is currently deployed and hosted live on Google Cloud Run within Google AI Studio:
- **Shared App URL**: `https://ais-pre-dfv7sjf2sbbchsbeol4afb-248435255954.asia-northeast1.run.app`
- This URL runs 24/7 on Google Cloud Run with your Firebase database and Gemini API connected.

---

## 1. Why Did the Previous Cloud Run Deployment Fail & What Was Fixed?

1. **Docker Container Node Execution**:
   - Previously, the Dockerfile attempted to run `node server.ts` directly in production. Because `npm prune --omit=dev` stripped TypeScript development tools, standard Node 22 in Debian slim threw an `Unknown file extension ".ts"` error, causing the container to crash before listening on port 8080.
   - **Fix Applied**: The `Dockerfile` now builds the server via `esbuild` into `dist/server.js` during the multi-stage build. The container runs `node dist/server.js`, starting in <15ms with zero TypeScript overhead.

2. **Static Asset Resolution in Production**:
   - `server.ts` path resolution was updated to dynamically locate `dist/` whether executed from source or bundled inside the container.

3. **Cloud Build IAM Permissions**:
   - In Google Cloud projects like `gen-lang-client-0143328501`, the Cloud Build service account often lacks `roles/run.admin` by default.
   - **Fix Applied**: `deploy-cloud-run.sh` now automatically grants Cloud Run Admin permissions to your project's Cloud Build service account.

---

## 2. Deploy to Google Cloud Run (Recommended Method)

### Step 1: Run the updated deployment script
From your local project folder:
```bash
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

### Or run the direct `gcloud` command:
```bash
gcloud run deploy immersive-adaptive-tutor \
  --source . \
  --project gen-lang-client-0143328501 \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars="NODE_ENV=production,GEMINI_API_KEY=YOUR_GEMINI_API_KEY"
```

> **Note on Region**: If `asia-northeast1` encounters quota or regional restrictions, change `--region` to `us-central1` or `asia-southeast1`.

---

## 3. Alternative 1: Local Docker Build & Push (Bypasses Cloud Build)
If your Google Cloud Build service account has permission or billing restrictions, you can build the image on your local machine using Docker and deploy directly:

```bash
PROJECT_ID="gen-lang-client-0143328501"
IMAGE_TAG="gcr.io/${PROJECT_ID}/immersive-adaptive-tutor:latest"

# 1. Configure Docker with gcloud credentials
gcloud auth configure-docker

# 2. Build image locally
docker build -t "${IMAGE_TAG}" .

# 3. Push image to Google Container / Artifact Registry
docker push "${IMAGE_TAG}"

# 4. Deploy container image directly to Cloud Run
gcloud run deploy immersive-adaptive-tutor \
  --image "${IMAGE_TAG}" \
  --project "${PROJECT_ID}" \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,GEMINI_API_KEY=YOUR_GEMINI_API_KEY"
```

---

## 4. Alternative 2: Deploy to Render.com (1-Click, Free Tier, Zero GCP Config)
If you prefer not to manage GCP IAM permissions or Cloud Build quotas:

1. Push your repository to GitHub (or GitLab).
2. Go to [https://dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Web Service**.
3. Select your repository.
4. Render will auto-detect Node.js. Configure settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build && npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/server.js`
   - **Start Command**: `node dist/server.js`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `NODE_ENV`: `production`
6. Click **Create Web Service**. Render provides an automatic HTTPS URL and handles auto-restarts and continuous deployment.

---

## 5. Alternative 3: Deploy to Railway.app
1. Go to [https://railway.app](https://railway.app) and click **New Project** -> **Deploy from GitHub repo**.
2. Railway detects the `Dockerfile` automatically.
3. In **Variables**, add `GEMINI_API_KEY`.
4. Click **Deploy**. Railway will build the multi-stage Docker container and give you a public `.up.railway.app` URL.

---

## 6. Pre-Flight Checklist Before Deploying
- [x] Server bundle builds cleanly (`dist/server.js` and `dist/index.html`).
- [x] Port dynamically configured (`process.env.PORT || 8080`).
- [x] Server binds to `0.0.0.0` (required for containers).
- [x] Gemini API key provided via environment variable.
- [x] Firebase configuration files (`firebase-applet-config.json`) included in container.
