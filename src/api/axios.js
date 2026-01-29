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

import axios from "axios";

let loaderHandler = null;
let loaderStartTime = null;

export const setGlobalLoader = (handler) => {
  loaderHandler = handler;
};

const MIN_LOADER_TIME = 500;

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

// ✅ REQUEST
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    loaderStartTime = Date.now();
    loaderHandler?.(true);

    return config;
  },
  (error) => {
    loaderHandler?.(false);
    return Promise.reject(error);
  }
);

// ✅ RESPONSE
api.interceptors.response.use(
  (response) => {
    const elapsed = Date.now() - loaderStartTime;
    const remaining = Math.max(MIN_LOADER_TIME - elapsed, 0);

    setTimeout(() => loaderHandler?.(false), remaining);
    return response;
  },
  (error) => {
    const elapsed = Date.now() - loaderStartTime;
    const remaining = Math.max(MIN_LOADER_TIME - elapsed, 0);

    setTimeout(() => loaderHandler?.(false), remaining);
    return Promise.reject(error);
  }
);

export default api;
