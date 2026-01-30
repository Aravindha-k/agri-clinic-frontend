import { useEffect, useState } from "react";
import axios from "axios";
import "./agriTicker.css";

export default function AgriTicker() {
    const [weather, setWeather] = useState(null);

    useEffect(() => {
        async function fetchWeather() {
            try {
                // ✅ Villupuram Coordinates
                const res = await axios.get(
                    "https://api.open-meteo.com/v1/forecast?latitude=11.94&longitude=79.49&current_weather=true"
                );

                setWeather(res.data.current_weather);
            } catch (err) {
                console.log("Villupuram Weather Error:", err);
            }
        }

        fetchWeather();

        // ✅ Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 1800000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="agri-ticker">
            <div className="ticker-text">
                🌾 Villupuram Weather Update |

                {weather ? (
                    <>
                        ☀️ Temp: {weather.temperature}°C |
                        💨 Wind: {weather.windspeed} km/h |
                    </>
                ) : (
                    " Loading Live Weather... |"
                )}

                🌱 Tip: Irrigate crops early morning for best yield |
                🌧️ Monsoon Watch: Check rainfall alerts weekly |
            </div>
        </div>
    );
}
