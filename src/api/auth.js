import axios from "./axios";

export const login = (data) =>
    axios.post("/api/auth/login/", data);

export const getMe = () =>
    axios.get("/api/accounts/me/");
