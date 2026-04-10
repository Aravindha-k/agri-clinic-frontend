import { useEffect, useState } from "react";

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWeather() {
            try {
                // Get current and next 24h hourly temperature
                const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=10.8505&longitude=78.7011&current_weather=true&hourly=temperature_2m");
                const data = await res.json();
                setWeather(data.current_weather);
                if (data.hourly && data.hourly.temperature_2m) {
                    // Show next hour prediction
                    setPrediction(data.hourly.temperature_2m[1]);
                }
            } catch {
                setWeather({ temperature: 32, weathercode: "Sunny" });
                setPrediction(33);
            }
            setLoading(false);
        }
        fetchWeather();
    }, []);

    return (
        <div className="bg-slate-800/80 text-accent px-4 py-2 rounded-xl shadow-lg mb-4 flex items-center gap-4">
            <span className="text-2xl">🌡️</span>
            <div>
                <div className="font-bold text-lg">Today's Temperature</div>
                {loading ? (
                    <div className="text-sm text-slate-400">Loading...</div>
                ) : (
                    <>
                        <div className="text-xl font-semibold">{weather.temperature}°C <span className="text-sm">({weather.weathercode})</span></div>
                        <div className="text-xs text-slate-400 mt-1">Next hour prediction: <span className="font-bold text-accent">{prediction}°C</span></div>
                    </>
                )}
            </div>
        </div>
    );
}