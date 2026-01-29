import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AdminNavbar from "../components/AdminNavbar";

import "./adminLayout.css";

export default function AdminLayout() {
    return (
        <div className="admin-layout">
            <AdminSidebar />

            <div className="main-area">
                <AdminNavbar />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
