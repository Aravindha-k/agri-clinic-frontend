import api from "./axios";

export const loginUser = (data) =>
    api.post("auth/login/", data, { skipAuthRefresh: true });

export const refreshToken = (refreshTokenValue) =>
    api.post("auth/refresh/", { refresh: refreshTokenValue }, { skipAuthRefresh: true });

export const getCurrentUser = () =>
    api.get("employees/me/");

export const logout = (refreshTokenValue) =>
    api.post("auth/logout/", { refresh: refreshTokenValue }, { skipAuthRefresh: true });