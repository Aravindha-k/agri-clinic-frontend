import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./dashboard.css";

/* ✅ Recharts Import */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    api.get("/accounts/employees/").then((res) => setEmployees(res.data));
    api.get("/visits/list/").then((res) => setVisits(res.data));
  }, []);

  // ✅ Chart Data
  const chartData = [
    { name: "Employees", count: employees.length },
    { name: "Visits", count: visits.length },
  ];

  return (
    <div>
      <h1 className="dashboard-title">Dashboard Overview</h1>

      {/* ✅ Small Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Employees</h3>
          <p>{employees.length}</p>
        </div>

        <div className="stat-card">
          <h3>Total Visits</h3>
          <p>{visits.length}</p>
        </div>

        <div className="stat-card">
          <h3>Active Staff</h3>
          <p>{employees.length}</p>
        </div>

        <div className="stat-card">
          <h3>Pending Visits</h3>
          <p>{visits.length}</p>
        </div>
      </div>

      {/* ✅ Analytics Chart Section */}
      <div className="dashboard-section">
        <h2>Activity Analytics</h2>

        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#14532d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ✅ Recent Visits */}
      <div className="dashboard-section">
        <h2>Recent Visits</h2>

        <table width="100%">
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {visits.slice(0, 5).map((v) => (
              <tr key={v.id}>
                <td>{v.farmer_name}</td>
                <td>{v.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ New Employees */}
      <div className="dashboard-section">
        <h2>New Employees</h2>

        <ul>
          {employees.slice(0, 5).map((emp) => (
            <li key={emp.id}>
              👤 {emp.username} ({emp.phone || "No Phone"})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
