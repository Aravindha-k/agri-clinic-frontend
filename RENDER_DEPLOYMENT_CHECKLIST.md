# Render Deployment Checklist

Complete this checklist before and after deployment to ensure everything works correctly.

## Pre-Deployment Checklist

- [ ] All code committed to `main` branch
- [ ] `npm install` runs without errors
- [ ] `npm run build` completes successfully
- [ ] `npm run preview` loads the site without errors
- [ ] Backend API is deployed to Render and accessible
- [ ] Backend URL is known (e.g., `https://agri-api.onrender.com`)
- [ ] Backend has CORS enabled for frontend domain

## Render Configuration Checklist

- [ ] GitHub repository connected: `agri-clinic-frontend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Publish Directory: `dist`
- [ ] Environment variable set: `VITE_API_BASE_URL=https://your-backend-url.onrender.com/api/v1/`
- [ ] Branch set to: `main`
- [ ] Service plan selected (Free or Paid)

## Post-Deployment Checklist

### Basic Functionality

- [ ] Site loads and displays (not blank page)
- [ ] No 404 errors in browser
- [ ] All pages route correctly (no white screen on navigation)
- [ ] CSS/styling loads correctly (not unstyled)
- [ ] Images and icons display

### API Integration

- [ ] Open browser DevTools (F12)
- [ ] Check Console tab for JavaScript errors
- [ ] Check Network tab → make first API call
- [ ] Verify API requests go to backend URL (not localhost)
- [ ] API responses are successful (status 200, not 404/500)
- [ ] Data displays correctly in the UI

### Authentication

- [ ] Login page loads
- [ ] Can log in with valid credentials
- [ ] Session persists across page refreshes
- [ ] Unauthorized users redirected to login
- [ ] Logout works correctly

### Common Pages

Test these key pages:
- [ ] Dashboard loads with data
- [ ] Farmers list displays
- [ ] Farms/crops page works
- [ ] Employee list shows
- [ ] Reports generate and download

### Performance

- [ ] Initial page load completes in <3 seconds
- [ ] Navigation between pages is smooth
- [ ] No excessive network requests

## Troubleshooting

If anything fails:

1. **Check Render Logs**
   - Dashboard → Your Service → Logs
   - Look for build errors or runtime issues

2. **Check Browser Console**
   - F12 → Console tab
   - Look for JavaScript errors

3. **Check Network Tab**
   - F12 → Network tab
   - Make an API call and check request/response
   - Verify URL matches backend URL

4. **Verify Environment Variables**
   - Render Dashboard → Environment
   - Confirm `VITE_API_BASE_URL` is set
   - Try redeploying after adding/changing

5. **Check _redirects File**
   - Verify `public/_redirects` exists
   - Contains: `/* /index.html 200`

6. **Test API Directly**
   - Open browser and visit: `https://your-backend-url.onrender.com/api/v1/health`
   - Should return something (not 404)

## After Deployment

- [ ] Share frontend URL with team
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Monitor performance for first week
- [ ] Set up error tracking (optional: Sentry, LogRocket)

## Rollback Steps

If deployment fails:

1. Go to Render Dashboard
2. Click your service
3. Go to Deployments tab
4. Find the previous successful deployment
5. Click deploy to restore it

## Notes

- Deployments typically complete in 2-5 minutes
- Free tier may have cold starts (first request takes longer)
- Every push to `main` triggers automatic redeploy
- Check build logs during deploy for issues
