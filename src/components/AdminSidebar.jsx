import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    MapPin,
    Tractor,
} from "lucide-react";

import "./adminSidebar.css";

export default function AdminSidebar() {
    const menuItems = [
        {
            name: "Dashboard",
            path: "/admin/dashboard",
            icon: <LayoutDashboard size={18} />,
        },
        {
            name: "Employees",
            path: "/admin/employees",
            icon: <Users size={18} />,
        },
        {
            name: "Visits",
            path: "/admin/visits",
            icon: <MapPin size={18} />,
        },
        {
            name: "Tracking",
            path: "/admin/tracking",
            icon: <Tractor size={18} />,
        },
    ];

    return (
        <aside className="sidebar">
            {/* ✅ Logo */}
            <div className="sidebar-logo">
                <div className="logo-icon">🌱</div>
                <h2>Kavya Agri Clinic</h2>
            </div>

            {/* ✅ Menu */}
            <nav className="sidebar-menu">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className="sidebar-link"
                    >
                        <span className="icon">{item.icon}</span>
                        <span className="text">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* ✅ Footer */}
            <div className="sidebar-footer">
                <p>Admin Panel</p>
                <span>Version 1.0</span>
            </div>
        </aside>
    );
}
