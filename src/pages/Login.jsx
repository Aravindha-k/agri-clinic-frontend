import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

/* ── Icon: Eye show/hide ─────────────────────────────── */
const IconEye = ({ open }) => open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

/* ── Feature pill component ──────────────────────────── */
const FeaturePill = ({ icon, label }) => (
    <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 100,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
    }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>{label}</span>
    </div>
);

/* ═══════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════ */
const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(username, password);
            navigate("/dashboard");
        } catch (err) {
            setError(err?.message || "Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", minHeight: "100vh", display: "flex", flexDirection: "row" }}>

            {/* =====================================================
                LEFT PANEL — Brand / Hero  (hidden on small screens)
            ===================================================== */}
            <aside style={{
                flex: "0 0 52%",
                maxWidth: 620,
                minWidth: 420,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(160deg, #042014 0%, #0a1f12 22%, #0d2a18 50%, #135e32 82%, #16a34a 100%)",
            }} className="login-aside">

                {/* Dot grid */}
                <div style={{
                    position: "absolute", inset: 0, opacity: 0.045,
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.75) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }} />

                {/* Glow blobs */}
                <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(22,163,74,0.30) 0%, transparent 65%)", filter: "blur(70px)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: "-8%", left: "-5%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.20) 0%, transparent 65%)", filter: "blur(60px)", pointerEvents: "none" }} />

                {/* Subtle vignette edges */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.15) 100%)", pointerEvents: "none" }} />

                {/* Content */}
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "48px 52px" }}>

                    {/* Top: logo + wordmark */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                            background: "linear-gradient(145deg, #ffffff 0%, #f1fdf5 100%)",
                            padding: 6,
                            boxShadow: "0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <img src={logo} alt="" style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: 7 }} />
                        </div>
                        <div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Kavya Agri Clinic</p>
                            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>Agricultural Management</p>
                        </div>
                    </div>

                    {/* Middle: headline + description */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: "6%" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 20 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px rgba(74,222,128,0.75)", flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.13em", color: "rgba(74,222,128,0.90)", textTransform: "uppercase" }}>Enterprise Admin Portal</span>
                        </div>

                        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.06, color: "#ffffff", margin: 0 }}>
                            Smarter<br />
                            <span style={{ color: "#4ade80" }}>Agriculture</span><br />
                            Management
                        </h1>

                        <div style={{ marginTop: 18, display: "flex", gap: 6 }}>
                            <div style={{ width: 28, height: 3, borderRadius: 100, background: "#4ade80" }} />
                            <div style={{ width: 8, height: 3, borderRadius: 100, background: "rgba(74,222,128,0.35)" }} />
                        </div>

                        <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.52)", maxWidth: 380 }}>
                            Enterprise-grade platform for crop diagnostics, field operations
                            tracking, and data-driven agricultural decision-making.
                        </p>

                        {/* Feature pills */}
                        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 10 }}>
                            <FeaturePill icon="🌱" label="Crop Diagnostics" />
                            <FeaturePill icon="📍" label="Field Tracking" />
                            <FeaturePill icon="📊" label="Yield Analytics" />
                            <FeaturePill icon="🛰️" label="GPS Monitoring" />
                        </div>
                    </div>

                    {/* Bottom: copyright */}
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: "auto" }}>
                        &copy; 2023-2026 Kavya Agri Clinic. All rights reserved.
                    </p>
                </div>
            </aside>

            {/* =====================================================
                RIGHT PANEL — Sign-in form
            ===================================================== */}
            <main style={{
                flex: 1,
                minHeight: "100vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                background: "#f8fafc",
                position: "relative",
            }}>
                {/* Subtle top-right green glow */}
                <div style={{ position: "absolute", top: 0, right: 0, width: 500, height: 400, background: "radial-gradient(ellipse at top right, rgba(22,163,74,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />

                {/* Mobile-only top bar (shown when aside is hidden) */}
                <header className="login-mobile-header" style={{
                    display: "none",
                    alignItems: "center", gap: 12,
                    padding: "20px 24px 4px",
                    borderBottom: "1px solid #e9eef3",
                }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                        <img src={logo} alt="" style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: 6 }} />
                    </div>
                    <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>Kavya Agri Clinic</p>
                        <p style={{ fontSize: 11, color: "#94a3b8" }}>Agricultural Management System</p>
                    </div>
                </header>

                {/* Centered form area */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", position: "relative" }}>
                    <div style={{ width: "100%", maxWidth: 440 }}>

                        {/* Section header */}
                        <div style={{ marginBottom: 36 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                                    background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: "0 4px 12px rgba(21,128,61,0.35)",
                                }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                                        <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3.1 5.3-5 6.5" />
                                        <path d="M5 21c.5-4.5 2.5-8 7-10" />
                                    </svg>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d", letterSpacing: "0.02em" }}>Secure Admin Access</span>
                            </div>

                            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.1, color: "#0f172a", margin: 0 }}>
                                Welcome back
                            </h2>
                            <p style={{ marginTop: 10, fontSize: 14.5, color: "#64748b", lineHeight: 1.65 }}>
                                Sign in to access your agricultural management dashboard.
                            </p>
                        </div>

                        {/* Error alert */}
                        {error && (
                            <div style={{
                                marginBottom: 22, padding: "13px 16px", borderRadius: 12,
                                background: "#fef2f2", border: "1px solid #fecaca",
                                display: "flex", alignItems: "flex-start", gap: 10,
                            }}>
                                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, flexShrink: 0, color: "#ef4444", marginTop: 1 }}>
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span style={{ fontSize: 13, color: "#b91c1c", fontWeight: 500 }}>{error}</span>
                            </div>
                        )}

                        {/* ── Form ── */}
                        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                            {/* Username field */}
                            <div>
                                <label htmlFor="login-user" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: "0.04em", marginBottom: 7, textTransform: "uppercase" }}>
                                    Username
                                </label>
                                <div style={{ position: "relative" }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 17, height: 17, color: "#94a3b8", pointerEvents: "none" }}>
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <input
                                        id="login-user"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={loading}
                                        required
                                        autoFocus
                                        style={{
                                            width: "100%", height: 50, paddingLeft: 42, paddingRight: 16,
                                            fontSize: 14.5, color: "#0f172a",
                                            background: "#ffffff",
                                            border: "1.5px solid #e2e8f0",
                                            borderRadius: 12, outline: "none",
                                            transition: "border-color 0.18s, box-shadow 0.18s",
                                            boxSizing: "border-box",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = "#15803d"; e.target.style.boxShadow = "0 0 0 3px rgba(21,128,61,0.10), 0 1px 3px rgba(0,0,0,0.04)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                                    />
                                </div>
                            </div>

                            {/* Password field */}
                            <div>
                                <label htmlFor="login-pass" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: "0.04em", marginBottom: 7, textTransform: "uppercase" }}>
                                    Password
                                </label>
                                <div style={{ position: "relative" }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 17, height: 17, color: "#94a3b8", pointerEvents: "none" }}>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="login-pass"
                                        type={showPass ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                        style={{
                                            width: "100%", height: 50, paddingLeft: 42, paddingRight: 48,
                                            fontSize: 14.5, color: "#0f172a",
                                            background: "#ffffff",
                                            border: "1.5px solid #e2e8f0",
                                            borderRadius: 12, outline: "none",
                                            transition: "border-color 0.18s, box-shadow 0.18s",
                                            boxSizing: "border-box",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = "#15803d"; e.target.style.boxShadow = "0 0 0 3px rgba(21,128,61,0.10), 0 1px 3px rgba(0,0,0,0.04)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex", alignItems: "center", borderRadius: 6 }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = "#475569"}
                                        onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}>
                                        <IconEye open={showPass} />
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: 4,
                                    width: "100%", height: 52,
                                    borderRadius: 12, border: "none",
                                    fontSize: 15, fontWeight: 600, letterSpacing: "0.01em",
                                    color: "#ffffff", cursor: loading ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                    transition: "transform 0.15s, box-shadow 0.18s, background 0.18s",
                                    background: loading ? "#9ca3af" : "linear-gradient(135deg, #15803d 0%, #16a34a 60%, #22c55e 100%)",
                                    boxShadow: loading ? "none" : "0 2px 4px rgba(0,0,0,0.07), 0 8px 24px rgba(21,128,61,0.32), inset 0 1px 0 rgba(255,255,255,0.16)",
                                }}
                                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.10), 0 16px 36px rgba(21,128,61,0.42), inset 0 1px 0 rgba(255,255,255,0.18)"; } }}
                                onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.07), 0 8px 24px rgba(21,128,61,0.32), inset 0 1px 0 rgba(255,255,255,0.16)"; } }}
                                onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = "scale(0.987)"; }}
                                onMouseUp={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                            >
                                {loading ? (
                                    <>
                                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                                        <span>Signing in…</span>
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                            <polyline points="10 17 15 12 10 7" />
                                            <line x1="15" y1="12" x2="3" y2="12" />
                                        </svg>
                                        <span>Sign in to Dashboard</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div style={{ margin: "30px 0 22px", display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ flex: 1, height: 1, background: "#e9eef3" }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#c4cfda", letterSpacing: "0.06em", textTransform: "uppercase" }}>secured</span>
                            <div style={{ flex: 1, height: 1, background: "#e9eef3" }} />
                        </div>

                        {/* Trust row */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
                            {[["🔒", "SSL Encrypted"], ["🛡️", "Enterprise Grade"], ["🌿", "Agri Certified"]].map(([icon, label]) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 13 }}>{icon}</span>
                                    <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <p style={{ textAlign: "center", fontSize: 11.5, color: "#b0bec9", marginTop: 32 }}>
                            &copy; 2023-2026 Kavya Agri Clinic &middot; All rights reserved.
                        </p>
                    </div>
                </div>
            </main>

            {/* ── Global styles for responsive + animations ── */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Responsive: stack vertically on small screens */
                @media (max-width: 768px) {
                    .login-aside { display: none !important; }
                    .login-mobile-header { display: flex !important; }
                }

                /* Clamp aside width on mid-size screens */
                @media (max-width: 1100px) and (min-width: 769px) {
                    .login-aside { flex: 0 0 44% !important; min-width: 320px !important; }
                }

                #login-user::placeholder,
                #login-pass::placeholder { color: #c4cfda; }

                input:-webkit-autofill,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 40px #fff inset !important;
                    -webkit-text-fill-color: #0f172a !important;
                }
            `}</style>
        </div>
    );
};

export default Login;
