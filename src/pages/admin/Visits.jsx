import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Eye, Download } from "lucide-react";
import "./visits.css";

export default function Visits() {
    const [visits, setVisits] = useState([]);

    useEffect(() => {
        api.get("/visits/list/").then((res) => {
            setVisits(res.data);
        });
    }, []);

    return (
        <div className="visits-page">
            {/* ✅ Header */}
            <div className="visits-header">
                <h1>Visits</h1>
                <p>Farmer visit reports with uploaded files</p>
            </div>

            {/* ✅ Card */}
            <div className="visits-card">
                <table className="visits-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Farmer</th>
                            <th>Village</th>
                            <th>Employee</th>
                            <th>Time</th>
                            <th>Attachments</th>
                        </tr>
                    </thead>

                    <tbody>
                        {visits.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: "center" }}>
                                    No visits found
                                </td>
                            </tr>
                        ) : (
                            visits.map((v) => (
                                <tr key={v.visit_id}>
                                    <td>{v.visit_id}</td>
                                    <td>{v.farmer_name}</td>
                                    <td>{v.village}</td>
                                    <td>{v.employee_username}</td>

                                    <td>
                                        {new Date(v.visit_time).toLocaleString("en-IN")}
                                    </td>

                                    {/* ✅ Attachments */}
                                    <td>
                                        {v.attachments && v.attachments.length > 0 ? (
                                            <div className="file-actions">
                                                {v.attachments.map((file) => (
                                                    <div key={file.id} className="file-box">
                                                        <span className="file-type">
                                                            {file.file_type}
                                                        </span>

                                                        {/* ✅ View */}
                                                        <a
                                                            href={`http://127.0.0.1:8000${file.file}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="file-btn view"
                                                        >
                                                            <Eye size={16} />
                                                            View
                                                        </a>

                                                        {/* ✅ Download */}
                                                        <a
                                                            href={`http://127.0.0.1:8000/api/visits/files/${file.id}/download/`}
                                                            className="file-btn download"
                                                        >
                                                            Download
                                                        </a>

                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="no-file">No Files</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
