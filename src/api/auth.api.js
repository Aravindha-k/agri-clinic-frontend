import api from "./axios";

export const loginUser = (data) =>
    api.post("auth/login/", data);

export const refreshToken = (refreshTokenValue) =>
    api.post("auth/refresh/", { refresh: refreshTokenValue });

export const getCurrentUser = () =>
    api.get("employees/me/");

export const logout = (refreshTokenValue) =>
    api.post("auth/logout/", { refresh: refreshTokenValue });