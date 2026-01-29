import React from "react";
import { NavLink } from "react-router-dom"; // ✅ REQUIRED IMPORT
import "./adminSidebar.css";

export default function AdminSidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                🌱 <span>Kavya Agri Clinic</span>
            </div>

            <nav className="sidebar-menu">
                <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) =>
                        isActive ? "menu-item active" : "menu-item"
                    }
                >
                    📊 Dashboard
                </NavLink>

                <NavLink
                    to="/admin/employees"
                    className={({ isActive }) =>
                        isActive ? "menu-item active" : "menu-item"
                    }
                >
                    👥 Employees
                </NavLink>

                <NavLink
                    to="/admin/visits"
                    className={({ isActive }) =>
                        isActive ? "menu-item active" : "menu-item"
                    }
                >
                    📍 Visits
                </NavLink>

                <NavLink
                    to="/admin/tracking"
                    className={({ isActive }) =>
                        isActive ? "menu-item active" : "menu-item"
                    }
                >
                    🛰️ Tracking
                </NavLink>
            </nav>
        </aside>
    );
}
