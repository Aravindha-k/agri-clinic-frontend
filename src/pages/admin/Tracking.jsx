import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "./Tracking.css";

export default function Tracking() {
    const [employees, setEmployees] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api
            .get("/tracking/admin-status/") // ✅ Correct Full URL
            .then((res) => {
                console.log("Employees:", res.data);
                setEmployees(res.data);
            })
            .catch((err) => console.error("Tracking Fetch Error:", err));
    }, []);

    return (
        <div className="tracking-page">
            <h2>Employee Tracking</h2>

            <table className="tracking-table">
                <thead>
                    <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Work</th>
                        <th>Connection</th>
                        <th>GPS</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {employees.map((emp) => (
                        <tr key={emp.user_id}>
                            <td>{emp.employee_id}</td>
                            <td>{emp.username}</td>

                            <td>
                                <span className={`badge ${emp.work_status.toLowerCase()}`}>
                                    {emp.work_status}
                                </span>
                            </td>

                            <td>
                                <span className={`badge ${emp.connection.toLowerCase()}`}>
                                    {emp.connection}
                                </span>
                            </td>

                            <td>
                                <span className={`badge ${emp.gps_status.toLowerCase()}`}>
                                    {emp.gps_status}
                                </span>
                            </td>

                            <td>
                                {emp.work_status === "WORKING" ? (
                                    <button
                                        className="map-btn"
                                        onClick={() =>
                                            navigate(`/admin/tracking/map/${emp.user_id}`)
                                        }
                                    >
                                        View Route
                                    </button>
                                ) : (
                                    <button disabled className="map-btn disabled">
                                        No Map
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
