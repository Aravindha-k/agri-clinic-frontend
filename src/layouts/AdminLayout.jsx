// import { Outlet, useNavigate } from "react-router-dom";
// import AdminSidebar from "../components/AdminSidebar";
// import AgriTicker from "../components/AgriTicker";
// import "./adminLayout.css";

// export default function AdminLayout() {
//     const navigate = useNavigate();

//     const handleLogout = () => {
//         localStorage.clear();
//         navigate("/login", { replace: true });
//     };

//     return (
//         <div className="admin-layout">
//             {/* ✅ Sidebar */}
//             <AdminSidebar />

//             {/* ✅ Main Area */}
//             <div className="main-area">
//                 {/* ✅ Fixed Header */}
//                 <header className="admin-header">
//                     {/* ✅ Only Weather Scroll Strip */}
//                     <AgriTicker />

//                     {/* ✅ Logout Right */}
//                     <div className="header-right">
//                         <button className="logout-btn" onClick={handleLogout}>
//                             Logout
//                         </button>
//                     </div>
//                 </header>

//                 {/* ✅ Page Content */}
//                 <main className="page-content">
//                     <Outlet />
//                 </main>
//             </div>
//         </div>
//     );
// }
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AgriTicker from "../components/AgriTicker";
import "./adminLayout.css";

export default function AdminLayout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login", { replace: true });
    };

    return (
        <div className="admin-layout">
            {/* ✅ Sidebar */}
            <AdminSidebar />

            {/* ✅ Main Area */}
            <div className="main-area">
                {/* ✅ Fixed Header */}
                <header className="admin-header">
                    {/* ✅ Weather Scroll Strip */}
                    <AgriTicker />

                    {/* ✅ Logout Right */}
                    <div className="header-right">
                        <button className="logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </header>

                {/* ✅ Page Content Wrapper (ONLY NEW PART) */}
                <div className="page-wrapper">
                    <main className="page-content">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
