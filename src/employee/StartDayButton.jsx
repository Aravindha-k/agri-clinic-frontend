import api from "../api/axios";
import { startHeartbeat } from "./EmployeeHeartbeat";

export default function StartDayButton() {
    const handleStart = async () => {
        await api.post("/tracking/start-day/");
        startHeartbeat(); // 🔥 VERY IMPORTANT
    };

    return <button onClick={handleStart}>Start Day</button>;
}
