# Agri Admin Enterprise - Setup & Run Guide

## ✨ Recent Improvements

### 🎨 Modern UI Design
- **Gradient Backgrounds**: Beautiful gradient pages with `from-slate-50 to-slate-100`
- **Enhanced Cards**: Modern card designs with shadows, hover effects, and colored left borders
- **Professional Tables**: Color-coded header gradients for each module (Blue=Employees, Green=Visits, Purple=Districts)
- **Icons**: Added SVG icons to dashboard stat cards for better visual appeal
- **Spacing & Typography**: Improved padding, margins, and font hierarchy throughout
- **Responsive Design**: Mobile-first grid layouts that adapt to screen sizes

### 🔧 API Integration & Error Handling
- **Console Logging**: Each page logs API responses for debugging (check browser DevTools)
- **User-Friendly Errors**: Clear error messages with retry buttons instead of silent failures
- **Loading States**: Animated spinners and loading text for better UX
- **Data Validation**: Safe data guards to prevent crashes from unexpected API responses

### 🛡️ Backend Configuration
- Environment variables via `.env` file
- Configurable API base URL (`VITE_API_BASE`)
- Interceptors for authentication (Bearer token from localStorage)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Backend URL (if needed)
Edit `.env`:
```
VITE_API_BASE=http://localhost:8000
```

### 3. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is busy).

---

## 🔍 Testing API Integration

1. **Open Browser DevTools** (F12)
2. **Go to Console Tab** to see API requests and responses
3. **Visit each page**:
   - **Dashboard**: Shows stats cards (Total Visits, Employees, Farmers)
   - **Employees**: Table view of all staff
   - **Visits**: Table view of farmer visits
   - **Districts**: Master data for districts
   - **Reports**: Raw JSON view of report data
   - **Audit Logs**: System audit trail

### Debugging API Issues
If you see errors in the console:
- Check if backend is running on `http://localhost:8000`
- Verify API endpoints are correct in `src/api/*.js` files
- Look for CORS errors and configure backend accordingly
- Check browser Network tab for failed requests

---

## 🔗 API Endpoints Used

- `GET /api/reports/employee-visits/` → Dashboard stats
- `GET /api/employees/` → Employee list
- `GET /api/visits/` → Visits list
- `GET /api/masters/districts/` → Districts list
- `GET /api/reports/` → Reports data
- `GET /api/audit/` → Audit logs

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── Dashboard.jsx    ← Stats overview (enhanced UI)
│   ├── Employees.jsx    ← Staff table (enhanced UI)
│   ├── Visits.jsx       ← Visits table (enhanced UI)
│   ├── Masters.jsx      ← Districts table (enhanced UI)
│   ├── Reports.jsx      ← JSON data view (enhanced UI)
│   └── Audit.jsx        ← Audit logs (enhanced UI)
├── components/
│   ├── ui/Status.jsx    ← Loading/Error components
│   └── layout/
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       └── Layout.jsx
└── api/
    └── axios.js         ← Configured API client with interceptors
```

---

## 🎯 Next Steps

1. **Verify Backend is Running**: Make sure Django/backend is running on `http://localhost:8000`
2. **Check API Endpoints**: Confirm all endpoints return data in expected format
3. **Test Each Page**: Navigate through all pages to verify data loads correctly 
4. **Check Console**: Watch browser console for logged API responses
5. **Deploy**: Once verified, build with `npm run build`

---

## 💡 Key Features

✅ Modern, professional UI with gradients and shadows  
✅ Error messages with retry functionality  
✅ Loading spinners during data fetch  
✅ Responsive design (mobile-friendly)  
✅ API response logging for debugging  
✅ Environment-based configuration  
✅ Authentication token management  
✅ Accessible UI (ARIA labels, semantic HTML)  

---

## 📞 Support

If API data isn't loading:
1. Check backend server is running
2. Verify API endpoints in `src/api/` files
3. Check `.env` file for correct `VITE_API_BASE`
4. Open Browser DevTools → Console to see errors
5. Check Network tab for failed requests
