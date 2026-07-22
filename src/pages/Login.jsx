import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginAuthErrorMessage, ADMIN_SESSION_EXPIRED_MESSAGE } from "../utils/authErrors";
import Logo from "../components/Logo";
import logoSeal from "../assets/kavya-agri-clinic-logo-premium.png";
import {
  ArrowRight,
  BarChart3,
  Leaf,
  LockKeyhole,
  MapPin,
  Navigation,
  ShieldCheck,
  Sprout,
  User,
} from "lucide-react";

/* ── Icon: Eye show/hide ─────────────────────────────── */
const IconEye = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const FEATURE_CHIPS = [
  { icon: Sprout, label: "Crop Diagnostics" },
  { icon: MapPin, label: "Field Tracking" },
  { icon: BarChart3, label: "Yield Analytics" },
  { icon: Navigation, label: "GPS Monitoring" },
];

const TrustItem = ({ icon: Icon, label }) => (
  <div className="login-trust-item">
    <Icon className="login-trust-item__icon" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

/** Full-screen premium auth overlay — visual only */
function AuthOverlay({ progress }) {
  return (
    <div className="login-auth-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="login-auth-overlay__mesh" aria-hidden="true" />
      <div className="login-auth-overlay__particles" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={`login-auth-particle login-auth-particle--${i + 1}`} />
        ))}
      </div>

      <div className="login-auth-overlay__content">
        <div className="login-auth-stage" aria-hidden="true">
          <span className="login-auth-ring" />
          <span className="login-auth-glow" />
          <div className="login-auth-logo">
            <Logo size="xl" variant="login" showShadow={false} />
          </div>
        </div>

        <p className="login-auth-title">Authenticating Secure Session…</p>
        <p className="login-auth-subtitle">Please wait while we prepare your dashboard.</p>

        <div className="login-auth-progress" aria-hidden="true">
          <div className="login-auth-progress__track">
            <div className="login-auth-progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="login-auth-progress__pct">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOGIN PAGE — Premium Enterprise UI (auth logic unchanged)
═══════════════════════════════════════════════════════ */
const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [authProgress, setAuthProgress] = useState(0);
  const [ripple, setRipple] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const progressRaf = useRef(null);
  const progressValue = useRef(0);
  const submitBtnRef = useRef(null);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "admin_session_expired") {
      const stored =
        sessionStorage.getItem("auth_redirect_message") || ADMIN_SESSION_EXPIRED_MESSAGE;
      setSessionNotice(stored);
      sessionStorage.removeItem("auth_redirect_message");
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
    };
  }, []);

  const stopProgress = () => {
    if (progressRaf.current) {
      cancelAnimationFrame(progressRaf.current);
      progressRaf.current = null;
    }
  };

  const runProgress = (to, durationMs) =>
    new Promise((resolve) => {
      stopProgress();
      const from = progressValue.current;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = from + (to - from) * eased;
        progressValue.current = next;
        setAuthProgress(next);
        if (t < 1) {
          progressRaf.current = requestAnimationFrame(tick);
        } else {
          progressRaf.current = null;
          resolve();
        }
      };
      progressRaf.current = requestAnimationFrame(tick);
    });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    progressValue.current = 6;
    setAuthProgress(6);
    runProgress(58, 1100);

    try {
      await login(username, password);
      await runProgress(100, 650);
      navigate("/dashboard");
    } catch (err) {
      stopProgress();
      progressValue.current = 0;
      setAuthProgress(0);
      setError(
        loginAuthErrorMessage(err, "Invalid username or password. Please check and try again.")
      );
      setLoading(false);
    }
  };

  const handleSubmitClick = (e) => {
    const btn = submitBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      key: Date.now(),
    });
  };

  return (
    <div className="login-page login-page--premium">
      {loading && <AuthOverlay progress={authProgress} />}

      {/* LEFT PANEL — Match reference exactly */}
      <aside className="login-aside" aria-label="Kavya Agri Clinic branding">
        <div className="login-aside__mesh" aria-hidden="true" />
        <div className="login-aside__particles" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={`login-particle login-particle--${i + 1}`} />
          ))}
        </div>
        <svg className="login-aside__lines" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path className="login-line login-line--1" d="M-40 160 C140 100, 260 240, 420 180 S580 120, 720 200" fill="none" />
          <path className="login-line login-line--2" d="M-30 380 C160 320, 280 460, 440 400 S600 340, 740 420" fill="none" />
          <path className="login-line login-line--3" d="M-50 640 C120 580, 260 720, 420 660 S580 600, 740 680" fill="none" />
        </svg>
        <div className="login-aside__waves" aria-hidden="true">
          <span className="login-aside__wave login-aside__wave--1" />
          <span className="login-aside__wave login-aside__wave--2" />
          <span className="login-aside__wave login-aside__wave--3" />
        </div>
        <div className="login-aside__vignette" aria-hidden="true" />

        <div className="login-aside__content">
          <div className="login-aside__stack">
            <div className="login-aside__brand">
              {/* Wrapper stacks: halo → particles → floating logo */}
              <div className="login-aside__seal-wrapper">
                {/* Ambient halo behind logo */}
                <div className="login-seal-halo" aria-hidden="true" />
                {/* Subtle halo lift synced to glass reflection — does not alter base halo */}
                <div className="login-seal-halo-lift" aria-hidden="true" />
                {/* Ambient pollen / light motes — outside logo artwork */}
                <span className="login-seal-particle login-seal-particle--1" aria-hidden="true" />
                <span className="login-seal-particle login-seal-particle--2" aria-hidden="true" />
                <span className="login-seal-particle login-seal-particle--3" aria-hidden="true" />
                <span className="login-seal-particle login-seal-particle--4" aria-hidden="true" />
                <span className="login-seal-particle login-seal-particle--5" aria-hidden="true" />
                <span className="login-seal-particle login-seal-particle--6" aria-hidden="true" />
                <span className="login-seal-particle login-seal-particle--7" aria-hidden="true" />
                <span className="login-seal-particle login-seal-particle--8" aria-hidden="true" />
                {/* Logo — floats and has a light-sweep ::after */}
                <div className="login-aside__seal">
                  <img
                    src={logoSeal}
                    alt="Kavya Agri Clinic"
                    className="login-aside__seal-img"
                    width={4096}
                    height={4096}
                    decoding="async"
                    draggable={false}
                  />
                </div>
              </div>
              <p className="login-aside__brand-name">KAVYA AGRI CLINIC</p>
              <p className="login-aside__brand-tag">Agricultural Management Platform</p>
            </div>

            <div className="login-aside__rule" aria-hidden="true">
              <span />
              <span />
            </div>

            <h1 className="login-aside__headline">
              <span>ADMIN</span>
              <span className="login-aside__headline-accent">CONTROL</span>
              <span>CENTER</span>
            </h1>

            <p className="login-aside__lead">
              Premium operations hub for field visits,
              <br />
              farmer records, employee tracking,
              <br />
              and live GPS monitoring.
            </p>

            <div className="login-aside__chips">
              <div className="login-aside__chips-row">
                {FEATURE_CHIPS.slice(0, 3).map(({ icon: Icon, label }) => (
                  <div key={label} className="login-feature-pill">
                    <Icon className="login-feature-pill__icon" aria-hidden="true" />
                    <span className="login-feature-pill__label">{label}</span>
                  </div>
                ))}
              </div>
              <div className="login-aside__chips-row login-aside__chips-row--solo">
                {FEATURE_CHIPS.slice(3).map(({ icon: Icon, label }) => (
                  <div key={label} className="login-feature-pill">
                    <Icon className="login-feature-pill__icon" aria-hidden="true" />
                    <span className="login-feature-pill__label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="login-aside__copyright">
            &copy; 2023–2026 Kavya Agri Clinic. All rights reserved.
          </p>
        </div>
      </aside>

      {/* RIGHT PANEL — Floating login card */}
      <main className="login-main">
        <div className="login-main__bg" aria-hidden="true">
          <div className="login-main__curve login-main__curve--1" />
          <div className="login-main__curve login-main__curve--2" />
          <div className="login-main__mesh" />
        </div>

        <header className="login-mobile-header">
          <Logo size="sm" variant="login" />
          <div>
            <p className="login-mobile-header__name">Kavya Agri Clinic</p>
            <p className="login-mobile-header__tag">Agricultural Management System</p>
          </div>
        </header>

        <div className="login-form-area">
          <div className={`login-card ${loading ? "login-card--loading" : ""}`}>
            <div className="login-form-header">
              <div className="login-card__logo">
                <Logo size="md" variant="login" />
              </div>
              <div className="login-form-badge">
                <span className="login-form-badge__dot" aria-hidden="true" />
                <span className="login-form-badge__text">Secure Admin Access</span>
              </div>
              <h2 className="login-form-title">Admin Control Center</h2>
              <p className="login-form-subtitle">
                Sign in to manage visits, farmers, employees, and live field tracking.
              </p>
            </div>

            {sessionNotice && (
              <div className="login-alert login-alert--info" role="status">
                <ShieldCheck className="login-alert__icon login-alert__icon--info" aria-hidden="true" />
                <span>{sessionNotice}</span>
              </div>
            )}

            {error && (
              <div className={`login-alert login-alert--error ${error ? "login-alert--shake" : ""}`} role="alert">
                <LockKeyhole className="login-alert__icon login-alert__icon--error" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form" noValidate={false}>
              <div className="login-field">
                <label htmlFor="login-user" className="login-field-label">
                  Username
                </label>
                <div className={`login-input-wrap ${username ? "login-input-wrap--filled" : ""}`}>
                  <User className="login-input-icon" aria-hidden="true" />
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
                    className="login-input"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-pass" className="login-field-label">
                  Password
                </label>
                <div className={`login-input-wrap ${password ? "login-input-wrap--filled" : ""}`}>
                  <LockKeyhole className="login-input-icon" aria-hidden="true" />
                  <input
                    id="login-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="login-input login-input--password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="login-toggle-pass"
                    aria-label={showPass ? "Hide password" : "Show password"}
                    tabIndex={loading ? -1 : 0}
                  >
                    <IconEye open={showPass} />
                  </button>
                </div>
              </div>

              <button
                ref={submitBtnRef}
                type="submit"
                disabled={loading}
                className="login-submit"
                onClick={handleSubmitClick}
              >
                {ripple && (
                  <span
                    key={ripple.key}
                    className="login-submit__ripple"
                    style={{ left: ripple.x, top: ripple.y }}
                    onAnimationEnd={() => setRipple(null)}
                  />
                )}
                <span className="login-submit__label">Sign in to Dashboard</span>
                <ArrowRight className="login-submit__arrow" aria-hidden="true" />
              </button>
            </form>

            <div className="login-divider">
              <div className="login-divider__line" />
              <span className="login-divider__text">secured</span>
              <div className="login-divider__line" />
            </div>

            <div className="login-trust-row">
              <TrustItem icon={LockKeyhole} label="SSL Encrypted" />
              <TrustItem icon={ShieldCheck} label="Enterprise Grade" />
              <TrustItem icon={Leaf} label="Agri Certified" />
            </div>

            <p className="login-footer">&copy; 2023–2026 Kavya Agri Clinic · All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
