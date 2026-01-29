import { Outlet, useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="app-layout">
            <Header onLogout={handleLogout} />

            <main style={{ padding: "20px", minHeight: "80vh" }}>
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}
