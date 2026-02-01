// import axios from "axios";

// let loaderHandler = null;
// let loaderStartTime = null;

// export const setGlobalLoader = (handler) => {
//   loaderHandler = handler;
// };

// const MIN_LOADER_TIME = 1200;

// const api = axios.create({
//   baseURL: "http://127.0.0.1:8000/api",
// });

// // ✅ REQUEST INTERCEPTOR
// api.interceptors.request.use(
//   (config) => {
//     // 🔥 FIX: read correct token key
//     const token = localStorage.getItem("access");

//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     loaderStartTime = Date.now();
//     loaderHandler?.(true);

//     return config;
//   },
//   (error) => {
//     loaderHandler?.(false);
//     return Promise.reject(error);
//   }
// );

// // ✅ RESPONSE INTERCEPTOR
// api.interceptors.response.use(
//   (response) => {
//     const elapsed = Date.now() - loaderStartTime;
//     const remaining = Math.max(MIN_LOADER_TIME - elapsed, 0);

//     setTimeout(() => loaderHandler?.(false), remaining);
//     return response;
//   },
//   (error) => {
//     const elapsed = Date.now() - loaderStartTime;
//     const remaining = Math.max(MIN_LOADER_TIME - elapsed, 0);

//     setTimeout(() => loaderHandler?.(false), remaining);
//     return Promise.reject(error);
//   }
// );

// export default api;

// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://127.0.0.1:8000/api",
// });

// // 🔐 Attach token automatically
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("access");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// let setLoader = null;

// export const setGlobalLoader = (loaderFn) => {
//   setLoader = loaderFn;
// };

// api.interceptors.request.use((config) => {
//   setLoader && setLoader(true);
//   return config;
// });

// api.interceptors.response.use(
//   (response) => {
//     setLoader && setLoader(false);
//     return response;
//   },
//   (error) => {
//     setLoader && setLoader(false);
//     return Promise.reject(error);
//   }
// );

// export default api;

import axios from "axios";

/**
 * ✅ API Instance
 * Automatically switches based on environment:
 *
 * Local Dev  → .env.development → http://127.0.0.1:8000/api/
 * Production → .env.production  → https://agri-clinic-backend.onrender.com/api/
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

/**
 * ✅ Attach JWT Token Automatically
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ✅ Global Loader Handling
 */
let setLoader = null;

export const setGlobalLoader = (loaderFn) => {
  setLoader = loaderFn;
};

/**
 * ✅ Show Loader Before Request
 */
api.interceptors.request.use((config) => {
  if (setLoader) setLoader(true);
  return config;
});

/**
 * ✅ Hide Loader After Response
 */
api.interceptors.response.use(
  (response) => {
    if (setLoader) setLoader(false);
    return response;
  },
  (error) => {
    if (setLoader) setLoader(false);
    return Promise.reject(error);
  }
);

export default api;
