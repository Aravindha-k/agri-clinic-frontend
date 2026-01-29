import "./agriActionLoader.css";

export default function AgriActionLoader() {
    return (
        <div className="agri-action-overlay">
            <div className="agri-action">

                {/* Plant */}
                <svg className="plant" viewBox="0 0 64 64">
                    <path
                        d="M32 58V30"
                        stroke="#2e7d32"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d="M32 30C24 24 18 22 14 22c2 10 8 14 18 14"
                        fill="#66bb6a"
                    />
                    <path
                        d="M32 30c8-6 14-8 18-8-2 10-8 14-18 14"
                        fill="#4caf50"
                    />
                </svg>

                {/* Spray / Powder */}
                <div className="spray-line" />
                <div className="spray-particles" />

                {/* Brand */}
                <div className="brand-text">Kavya Agri Clinic</div>
            </div>
        </div>
    );
}
