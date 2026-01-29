import api from "../api/axios";
import { stopHeartbeat } from "./EmployeeHeartbeat";

export default function EndDayButton() {
    const handleEnd = async () => {
        await api.post("/tracking/end-day/");
        stopHeartbeat();
    };

    return <button onClick={handleEnd}>End Day</button>;
}
