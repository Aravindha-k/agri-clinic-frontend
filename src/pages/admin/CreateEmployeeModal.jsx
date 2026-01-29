import { useEffect, useState } from "react";
import api from "../../api/axios";
import ReactDOM from "react-dom";
import "./employees.css";

export default function CreateEmployeeModal({ onClose, onCreated }) {
    const [form, setForm] = useState({
        username: "",
        password: "",
        phone: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /* ✅ ESC close */
    useEffect(() => {
        const esc = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", esc);
        return () => window.removeEventListener("keydown", esc);
    }, [onClose]);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.post("/accounts/create-employee/", form);
            onCreated();
            onClose();
        } catch {
            setError("❌ Failed to create employee");
        }

        setLoading(false);
    };

    return ReactDOM.createPortal(
        <div className="modal-overlay">
            <div className="modal-box">
                <h2>➕ Add Employee</h2>

                <form onSubmit={handleSubmit}>
                    <div className="modal-input">
                        <label>Username</label>
                        <input
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="modal-input">
                        <label>Password</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="modal-input">
                        <label>Phone (10 digits)</label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            maxLength="10"
                            required
                        />
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>

                        <button className="save-btn" disabled={loading}>
                            {loading ? "Creating..." : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
