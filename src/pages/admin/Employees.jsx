import { useEffect, useState } from "react";
import api from "../../api/axios";

import CreateEmployeeModal from "./CreateEmployeeModal";
import EditEmployeeModal from "./EditEmployeeModal";
import ResetPasswordModal from "./ResetPasswordModal";

import { Pencil, Trash2, KeyRound } from "lucide-react";

import "./employees.css";

export default function Employees() {
    const [employees, setEmployees] = useState([]);

    const [showCreate, setShowCreate] = useState(false);
    const [editEmp, setEditEmp] = useState(null);
    const [resetEmp, setResetEmp] = useState(null);

    const [search, setSearch] = useState("");

    /* ✅ Fetch Employees */
    const fetchEmployees = async () => {
        try {
            const res = await api.get("/accounts/employees/");
            setEmployees(res.data);
        } catch (err) {
            console.error("Employee fetch error:", err);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    /* ✅ Toggle Active/Inactive */
    const handleToggle = async (emp) => {
        try {
            await api.post(`/accounts/employees/${emp.employee_id}/toggle/`);
            fetchEmployees(); // refresh table instantly
        } catch (err) {
            console.error("Toggle failed:", err);
        }
    };

    /* ✅ Delete Employee */
    const handleDelete = async (emp) => {
        if (!window.confirm(`Delete employee ${emp.username}?`)) return;

        try {
            await api.delete(`/accounts/employees/${emp.id}/`);
            fetchEmployees();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    /* ✅ Search Filter */
    const filtered = employees.filter((emp) => {
        const q = search.toLowerCase();
        return (
            emp.username.toLowerCase().includes(q) ||
            emp.employee_id.toLowerCase().includes(q) ||
            emp.phone.includes(q)
        );
    });

    return (
        <div className="employees-page">
            {/* ✅ HEADER TOOLBAR */}
            <div className="employees-toolbar">
                <div>
                    <h1>Employees</h1>
                    <p>Manage employee accounts and tracking access</p>
                </div>

                <div className="toolbar-actions">
                    <input
                        className="search-box"
                        placeholder="Search ID / Name / Phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button
                        className="add-employee-btn"
                        onClick={() => setShowCreate(true)}
                    >
                        + Add Employee
                    </button>
                </div>
            </div>

            {/* ✅ EMPLOYEE TABLE */}
            <div className="employees-card">
                <table className="employees-table">
                    <thead>
                        <tr>
                            <th>Employee ID</th>
                            <th>Username</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: "center" }}>
                                    No employees found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((emp) => (
                                <tr key={emp.id}>
                                    <td>{emp.employee_id}</td>
                                    <td>{emp.username}</td>
                                    <td>{emp.phone}</td>

                                    {/* ✅ Status Badge */}
                                    <td>
                                        <span
                                            className={`status-badge ${emp.is_active_employee ? "active" : "inactive"
                                                }`}
                                        >
                                            {emp.is_active_employee ? "ACTIVE" : "INACTIVE"}
                                        </span>
                                    </td>

                                    {/* ✅ Toggle Switch */}
                                    <td>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={emp.is_active_employee}
                                                onChange={() => handleToggle(emp)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </td>

                                    {/* ✅ Action Icons */}
                                    <td className="action-icons">
                                        <button
                                            className="icon-btn"
                                            onClick={() => setEditEmp(emp)}
                                            title="Edit Employee"
                                        >
                                            <Pencil size={18} />
                                        </button>

                                        <button
                                            className="icon-btn reset"
                                            onClick={() => setResetEmp(emp)}
                                            title="Reset Password"
                                        >
                                            <KeyRound size={18} />
                                        </button>

                                        <button
                                            className="icon-btn delete"
                                            onClick={() => handleDelete(emp)}
                                            title="Delete Employee"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ✅ CREATE MODAL */}
            {showCreate && (
                <CreateEmployeeModal
                    onClose={() => setShowCreate(false)}
                    onCreated={fetchEmployees}
                />
            )}

            {/* ✅ EDIT MODAL */}
            {editEmp && (
                <EditEmployeeModal
                    employee={editEmp}
                    onClose={() => setEditEmp(null)}
                    onUpdated={fetchEmployees}
                />
            )}

            {/* ✅ RESET PASSWORD MODAL */}
            {resetEmp && (
                <ResetPasswordModal
                    employee={resetEmp}
                    onClose={() => setResetEmp(null)}
                />
            )}
        </div>
    );
}
