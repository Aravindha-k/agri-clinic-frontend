import api from "./axios";

/* Reports Page */
export const getReports = () => {
    return api.get("reports/employee-visits/");
};