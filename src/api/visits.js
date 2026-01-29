import api from "./axios";

export const getVisits = () => api.get("/visits/list/");
