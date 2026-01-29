import api from "../api/axios";

let heartbeatTimer = null;

/**
 * Start sending heartbeat every 30 seconds
 * Call this AFTER start-day API success
 */
export function startHeartbeat() {
    stopHeartbeat(); // safety

    heartbeatTimer = setInterval(async () => {
        try {
            const gpsEnabled = !!navigator.geolocation;

            await api.post("/tracking/heartbeat/", {
                gps_enabled: gpsEnabled,
            });

            console.log("✅ Heartbeat sent");
        } catch (err) {
            console.error("❌ Heartbeat failed", err);
        }
    }, 30000); // ⏱ 30 seconds
}

/**
 * Stop heartbeat (call on logout / end day)
 */
export function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}
