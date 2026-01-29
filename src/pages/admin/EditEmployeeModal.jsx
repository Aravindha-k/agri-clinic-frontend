import { useState } from "react";
import api from "../../api/axios";
import "./employees.css";

export default function EditEmployeeModal({ employee, onClose, onUpdated }) {
    const [username, setUsername] = useState(employee.username);
    const [phone, setPhone] = useState(employee.phone);

    const handleUpdate = async () => {
        await api.patch(`/accounts/employees/${employee.id}/`, {
            username,
            phone,
        });

        onUpdated();
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <h2>Edit Employee</h2>

                <div className="modal-input">
                    <label>Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>

                <div className="modal-input">
                    <label>Phone</label>
                    <input
                        value={phone}
                        maxLength="10"
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                <div className="modal-actions">
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>

                    <button className="save-btn" onClick={handleUpdate}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
