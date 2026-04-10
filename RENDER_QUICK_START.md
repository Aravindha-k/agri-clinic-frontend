# Quick Start: Render Deployment

## What's Been Updated

Your React frontend is now ready for deployment to Render. Here's what was configured:

### 1. **API Configuration** (`src/api/axios.js`)
```javascript
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1/";
```

- Uses `VITE_API_BASE_URL` environment variable in production
- Falls back to localhost during development
- No hardcoded URLs

### 2. **Routing Fix** (`public/_redirects`)
```
/* /index.html 200
```

- Ensures React Router works correctly on Render
- All undefined routes redirect to your app

### 3. **Environment Template** (`.env.example`)
- `/api/v1/` added to the example for clarity

## Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Configure frontend for Render deployment"
git push origin main
```

### Step 2: Deploy on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Select **agri-clinic-frontend** repository
4. Fill in the form:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Add Environment Variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-url.onrender.com/api/v1/`
6. Click **Create Web Service**

That's it! Render will build and deploy automatically.

## Local Development

During development, the app uses `http://localhost:8000/api/v1/`:

```bash
# Start frontend dev server
npm run dev

# In another terminal, start your backend
python manage.py runserver
```

No `.env.local` file needed unless you want to override defaults.

## Production

In Render environment:
- `VITE_API_BASE_URL` is automatically injected
- Frontend connects to your backend URL
- All routing works via React Router

## Files Modified/Created

✅ `src/api/axios.js` - Updated to use env variable  
✅ `public/_redirects` - Created for routing  
✅ `.env.example` - Updated with proper variable name  
✅ `RENDER_DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide  
✅ `RENDER_DEPLOYMENT_CHECKLIST.md` - Post-deployment verification  

## Verify Your Setup

### Before Deploying:
```bash
npm install
npm run build
npm run preview
```

Open the preview URL and test the app.

### After Deploying:
- Check Render dashboard for deployment status
- Once live, visit your site URL
- Open DevTools (F12) → Network tab
- Trigger an API call
- Verify request goes to your backend (not localhost)

## Need Help?

Refer to these guides:
- **Full Setup**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
- **Verification**: [RENDER_DEPLOYMENT_CHECKLIST.md](./RENDER_DEPLOYMENT_CHECKLIST.md)
- **Troubleshooting**: See RENDER_DEPLOYMENT_GUIDE.md → Troubleshooting section

## Backend Setup

Don't forget to deploy your backend first:
- Backend must be live on Render
- Get the backend URL
- Use that URL in `VITE_API_BASE_URL`
- Ensure backend CORS allows your frontend domain

## Common Pitfalls ⚠️

1. **Forgot to include `/api/v1/` in URL** → API calls fail
2. **Backend not deployed yet** → Can't connect
3. **`_redirects` file missing** → React routing breaks
4. **CORS not enabled on backend** → Network errors
5. **Environment variable not set** → Uses localhost (works on dev, breaks on prod)

---

**Ready to deploy?** Start with Step 1 above! 🚀
