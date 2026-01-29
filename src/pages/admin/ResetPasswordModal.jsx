import { useState } from "react";
import api from "../../api/axios";
import "./employees.css";

export default function ResetPasswordModal({ employee, onClose }) {
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");

    const handleReset = async () => {
        if (password.length < 6) {
            setMsg("❌ Password must be at least 6 characters");
            return;
        }

        try {
            await api.post("/accounts/reset-password/", {
                user_id: employee.user_id,
                new_password: password,
            });

            setMsg("✅ Password reset successfully!");
            setTimeout(onClose, 1200);
        } catch (err) {
            setMsg("❌ Reset failed");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <h2>🔑 Reset Password</h2>

                <p>
                    Employee: <b>{employee.username}</b> ({employee.employee_id})
                </p>

                <div className="modal-input">
                    <label>New Password</label>
                    <input
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {msg && <p className="form-msg">{msg}</p>}

                <div className="modal-actions">
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>

                    <button className="save-btn" onClick={handleReset}>
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
