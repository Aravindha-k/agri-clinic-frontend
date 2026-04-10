# Render Deployment Guide - Frontend

This guide covers deploying the Agri Admin Enterprise React frontend to Render.

## Prerequisites

- GitHub account with the repository pushed
- Render account (render.com)
- Backend API deployed to Render (get the URL)

## Step 1: Prepare Your Repository

Ensure all files are committed and pushed to GitHub:

```bash
git add .
git commit -m "Configure for Render deployment"
git push origin main
```

## Step 2: Connect GitHub to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Click **Connect a repository**
4. Search for and select: `agri-clinic-frontend`
5. Click **Connect**

## Step 3: Configure Render Settings

### Basic Settings

| Field | Value |
|-------|-------|
| **Name** | `agri-admin-frontend` |
| **Environment** | Select your region |
| **Branch** | `main` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | Leave empty (static site) |
| **Publish Directory** | `dist` |

### Environment Variables

Add the following environment variable:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://your-backend-url.onrender.com/api/v1/` |

**Replace `your-backend-url`** with your actual backend domain.

## Step 4: API Configuration

The API configuration is already updated to use environment variables:

```javascript
// src/api/axios.js
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1/";
```

During development, it uses `localhost`. In production (Render), it uses the `VITE_API_BASE_URL` environment variable.

## Step 5: Routing Configuration

The `public/_redirects` file ensures React Router works correctly:

```
/* /index.html 200
```

This redirects all requests to `index.html`, allowing React Router to handle them.

## Step 6: Deploy

1. Click **Create Web Service**
2. Render will automatically start building
3. Wait for the deploy to complete (usually 2-5 minutes)
4. Your site will be available at: `https://agri-admin-frontend.onrender.com`

## Step 7: Verify Deployment

1. Open your site URL
2. Check the browser console (F12) for any errors
3. Test API calls - ensure they reach the backend
4. Verify authentication/login works

## Redeploy

Any push to the `main` branch will trigger an automatic redeploy.

To manually trigger a redeploy:
1. Go to your Render dashboard
2. Click your service
3. Click **Manual Deploy** → **Deploy latest commit**

## Troubleshooting

### Blank Page or 404 Errors

- Verify `_redirects` file exists in `public/` folder
- Check that Publish Directory is set to `dist`

### API Connection Fails

- Verify `VITE_API_BASE_URL` environment variable is set correctly
- Check backend is accessible (test URL in browser)
- Check CORS is enabled on backend
- Review browser console for error messages

### Environment Variables Not Recognized

- Environment variables must start with `VITE_` to be accessible in the frontend code
- Redeploy after adding/changing environment variables

### Slow Initial Load

- Vite creates optimized bundles, but large dependencies take time
- Add `npm ci` instead of `npm install` in build command for faster builds:
  ```
  npm ci && npm run build
  ```

## Local Development

For development, run:

```bash
npm run dev
```

The development server runs on `http://localhost:5173` with proxy to `http://localhost:8000/api/v1/`.

## Production Build

To test the production build locally:

```bash
npm run build
npm run preview
```

This builds the optimized version and previews it.

## Setting Up Backend API

If you haven't deployed the backend yet:

1. Deploy Django backend to Render
2. Get the backend URL (e.g., `https://agri-api.onrender.com`)
3. Update `VITE_API_BASE_URL` in Render environment variables
4. Ensure backend CORS settings allow requests from frontend URL

## Environment-Specific Notes

| Environment | API Base URL |
|---|---|
| Development | `http://localhost:8000/api/v1/` |
| Production (Render) | `https://your-backend-url.onrender.com/api/v1/` |

---

**Need Help?**
- Check Render logs: Dashboard → Your Service → Logs
- View build logs: Dashboard → Your Service → Deployments
- Backend issues? Check backend deployment guide
