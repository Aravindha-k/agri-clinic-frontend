import api from "./axios";

export const getEmployees = () =>
    api.get("/accounts/employees/");

export const createEmployee = (data) =>
    api.post("/accounts/employees/", data);
