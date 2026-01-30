// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../api/axios";
// import "./AdminDashboard.css";

// /* ✅ Icons */
// import { Users, MapPin, CheckCircle2, Hourglass } from "lucide-react";

// /* ✅ Modern Area Chart */
// import {
//   AreaChart,
//   Area,
//   CartesianGrid,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";

// /* ✅ Count Animation */
// function CountUp({ value }) {
//   const [count, setCount] = useState(0);

//   useEffect(() => {
//     let start = 0;
//     const end = value || 0;

//     if (end === 0) return;

//     const duration = 700;
//     const stepTime = Math.max(Math.floor(duration / end), 30);

//     const timer = setInterval(() => {
//       start += 1;
//       setCount(start);

//       if (start >= end) clearInterval(timer);
//     }, stepTime);

//     return () => clearInterval(timer);
//   }, [value]);

//   return <span>{count}</span>;
// }

// export default function AdminDashboard() {
//   const navigate = useNavigate();

//   const [employees, setEmployees] = useState([]);
//   const [visits, setVisits] = useState([]);

//   /* ✅ Fetch Live Data */
//   useEffect(() => {
//     api.get("/accounts/employees/")
//       .then((res) => setEmployees(res.data))
//       .catch((err) => console.log(err));

//     api.get("/visits/list/")
//       .then((res) => setVisits(res.data))
//       .catch((err) => console.log(err));
//   }, []);

//   /* ✅ Farmers Visited (Unique Farmers Count) */
//   const farmersVisited = new Set(visits.map((v) => v.farmer_name)).size;

//   /* ✅ Chart Data */
//   const chartData = [
//     { name: "Employees", count: employees.length },
//     { name: "Visits", count: visits.length },
//   ];

//   return (
//     <div className="dashboard">
//       {/* ✅ Title */}
//       <div className="page-title">
//         <h1>Dashboard</h1>
//         <p>Agri Clinic Live Summary</p>
//       </div>

//       {/* ✅ Stat Cards */}
//       <div className="cards-grid">
//         {/* Employees */}
//         <div className="card highlight-green">
//           <div className="card-top">
//             <div className="icon-box">
//               <Users size={20} />
//             </div>
//             <h4>Employees</h4>
//           </div>
//           <p className="value">
//             <CountUp value={employees.length} />
//           </p>
//         </div>

//         {/* Total Visits */}
//         <div className="card highlight-leaf">
//           <div className="card-top">
//             <div className="icon-box">
//               <MapPin size={20} />
//             </div>
//             <h4>Total Visits</h4>
//           </div>
//           <p className="value">
//             <CountUp value={visits.length} />
//           </p>
//         </div>

//         {/* Active Staff */}
//         <div className="card highlight-olive">
//           <div className="card-top">
//             <div className="icon-box">
//               <CheckCircle2 size={20} />
//             </div>
//             <h4>Active Staff</h4>
//           </div>
//           <p className="value">
//             <CountUp value={employees.length} />
//           </p>
//         </div>

//         {/* Farmers Visited
//         <div className="card highlight-harvest">
//           <div className="card-top">
//             <div className="icon-box">
//               <Hourglass size={20} />
//             </div>
//             <h4>Visited</h4>
//           </div>
//           <p className="value">
//             <CountUp value={farmersVisited} />
//           </p>
//         </div> */}
//       </div>

//       {/* ✅ Analytics + Recent Visits */}
//       <div className="dashboard-row">
//         {/* ✅ Modern Analytics Chart */}
//         <div className="box">
//           <h3>📊 Activity Analytics</h3>

//           <div className="chart-area">
//             <ResponsiveContainer width="100%" height={260}>
//               <AreaChart data={chartData}>
//                 {/* ✅ Gradient Fill */}
//                 <defs>
//                   <linearGradient id="agriFill" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="0%" stopColor="#16a34a" stopOpacity={0.6} />
//                     <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
//                   </linearGradient>
//                 </defs>

//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="name" />
//                 <YAxis />
//                 <Tooltip />

//                 <Area
//                   type="monotone"
//                   dataKey="count"
//                   stroke="#14532d"
//                   strokeWidth={3}
//                   fill="url(#agriFill)"
//                 />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         {/* ✅ Recent Visits */}
//         <div className="box">
//           <div className="box-header">
//             <h3>🕒 Recent Visits</h3>

//             <button
//               className="link-btn"
//               onClick={() => navigate("/admin/visits")}
//             >
//               View All →
//             </button>
//           </div>

//           {visits.slice(0, 4).map((v) => {
//             const visitDate = new Date(v.visit_time).toLocaleDateString(
//               "en-IN",
//               {
//                 day: "numeric",
//                 month: "short",
//                 year: "numeric",
//               }
//             );

//             return (
//               <div key={v.visit_id} className="visit-item">
//                 <p className="farmer">{v.farmer_name}</p>
//                 <span className="visit-date">{visitDate}</span>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* ✅ New Employees */}
//       <div className="box">
//         <div className="box-header">
//           <h3>🆕 New Employees</h3>

//           <button
//             className="link-btn"
//             onClick={() => navigate("/admin/employees")}
//           >
//             View All →
//           </button>
//         </div>

//         <div className="employee-grid">
//           {employees.slice(0, 6).map((emp) => (
//             <div key={emp.id} className="emp-card">
//               👤 {emp.username}
//               <p>{emp.phone || "No Phone"}</p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./AdminDashboard.css";

/* ✅ Icons */
import { Users, MapPin, CheckCircle2, Hourglass } from "lucide-react";

/* ✅ Modern Area Chart */
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ✅ Count Animation */
function CountUp({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value || 0;

    if (end === 0) {
      setCount(0);
      return;
    }

    const duration = 700;
    const stepTime = Math.max(Math.floor(duration / end), 30);

    const timer = setInterval(() => {
      start += 1;
      setCount(start);

      if (start >= end) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [visits, setVisits] = useState([]);

  /* ✅ Fetch Live Data */
  useEffect(() => {
    api.get("/accounts/employees/")
      .then((res) => setEmployees(res.data))
      .catch((err) => console.log("Employee API Error:", err));

    api.get("/visits/list/")
      .then((res) => setVisits(res.data))
      .catch((err) => console.log("Visits API Error:", err));
  }, []);

  /* ✅ Total Employees */
  const totalEmployees = employees.length;

  /* ✅ Active Employees Count */
  const activeEmployees = employees.filter(
    (emp) => emp.is_active_employee === true
  ).length;

  /* ✅ Login Enabled Employees Count */
  const loginEnabledEmployees = employees.filter(
    (emp) => emp.can_login === true
  ).length;

  /* ✅ Total Visits */
  const totalVisits = visits.length;

  /* ✅ Farmers Visited Count */
  const farmersVisited = new Set(visits.map((v) => v.farmer_name)).size;

  /* ✅ Chart Data */
  const chartData = [
    { name: "Employees", count: totalEmployees },
    { name: "Visits", count: totalVisits },
  ];

  return (
    <div className="dashboard">
      {/* ✅ Page Title */}
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Agri Clinic Live Summary</p>
      </div>

      {/* ✅ KPI Cards */}
      <div className="cards-grid">
        {/* ✅ Total Employees */}
        <div className="card highlight-green">
          <div className="card-top">
            <div className="icon-box">
              <Users size={20} />
            </div>
            <h4>Total Employees</h4>
          </div>
          <p className="value">
            <CountUp value={totalEmployees} />
          </p>
        </div>

        {/* ✅ Total Visits */}
        <div className="card highlight-leaf">
          <div className="card-top">
            <div className="icon-box">
              <MapPin size={20} />
            </div>
            <h4>Total Visits</h4>
          </div>
          <p className="value">
            <CountUp value={totalVisits} />
          </p>
        </div>

        {/* ✅ Active Staff */}
        <div className="card highlight-olive">
          <div className="card-top">
            <div className="icon-box">
              <CheckCircle2 size={20} />
            </div>
            <h4>Active Staff</h4>
          </div>
          <p className="value">
            <CountUp value={activeEmployees} />
          </p>
        </div>

        {/* ✅ Login Enabled */}
        <div className="card highlight-harvest">
          <div className="card-top">
            <div className="icon-box">
              <Hourglass size={20} />
            </div>
            <h4>Login Enabled</h4>
          </div>
          <p className="value">
            <CountUp value={loginEnabledEmployees} />
          </p>
        </div>
      </div>

      {/* ✅ Analytics + Recent Visits */}
      <div className="dashboard-row">
        {/* ✅ Analytics Chart */}
        <div className="box">
          <h3>📊 Activity Analytics</h3>

          <div className="chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                {/* ✅ Gradient Fill */}
                <defs>
                  <linearGradient id="agriFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.6} />
                    <stop
                      offset="100%"
                      stopColor="#16a34a"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#14532d"
                  strokeWidth={3}
                  fill="url(#agriFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ✅ Recent Visits */}
        <div className="box">
          <div className="box-header">
            <h3>🕒 Recent Visits</h3>

            <button
              className="link-btn"
              onClick={() => navigate("/admin/visits")}
            >
              View All →
            </button>
          </div>

          {visits.slice(0, 4).map((v) => {
            const visitDate = new Date(v.visit_time).toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              }
            );

            return (
              <div key={v.visit_id} className="visit-item">
                <p className="farmer">{v.farmer_name}</p>
                <span className="visit-date">{visitDate}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ New Employees */}
      <div className="box">
        <div className="box-header">
          <h3>🆕 New Employees</h3>

          <button
            className="link-btn"
            onClick={() => navigate("/admin/employees")}
          >
            View All →
          </button>
        </div>

        <div className="employee-grid">
          {employees.slice(0, 6).map((emp) => (
            <div key={emp.id} className="emp-card">
              👤 {emp.username}
              <p>{emp.phone || "No Phone"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
