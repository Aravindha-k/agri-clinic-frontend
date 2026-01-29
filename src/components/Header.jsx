import "./Header.css";

export default function Header({ onLogout }) {
    return (
        <div className="app-header">
            <div>
                <h2>🌱 Kavya Agri Clinic</h2>
                <span className="tagline">
                    Empowering Farmers with Smart Agriculture
                </span>
            </div>

            <button className="logout-btn" onClick={onLogout}>
                Logout
            </button>
        </div>
    );
}
