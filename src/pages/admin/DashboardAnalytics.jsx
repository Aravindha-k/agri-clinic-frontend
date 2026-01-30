// import {
//     BarChart,
//     Bar,
//     XAxis,
//     YAxis,
//     Tooltip,
//     ResponsiveContainer,
// } from "recharts";

// export default function DashboardAnalytics({ employees, visits }) {
//     const data = [
//         { name: "Employees", value: employees },
//         { name: "Visits", value: visits },
//     ];

//     return (
//         <div className="card">
//             <h3>Activity Summary</h3>

//             <ResponsiveContainer width="100%" height={300}>
//                 <BarChart data={data}>
//                     <XAxis dataKey="name" />
//                     <YAxis allowDecimals={false} />
//                     <Tooltip />
//                     <Bar dataKey="value" fill="#2e7d32" radius={[8, 8, 0, 0]} />
//                 </BarChart>
//             </ResponsiveContainer>
//         </div>
//     );
// }

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function DashboardAnalytics({ employees, visits }) {
    const data = [
        { name: "Employees", value: employees },
        { name: "Visits", value: visits },
    ];

    return (
        <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#14532d" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
