import { useEffect, useState } from "react";

export default function RainfallWidget() {
    const [rainfall, setRainfall] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRainfall() {
            try {
                const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=10.8505&longitude=78.7011&hourly=precipitation");
                const data = await res.json();
                if (data.hourly && data.hourly.precipitation) {
                    setRainfall(data.hourly.precipitation[0]);
                    setPrediction(data.hourly.precipitation[1]);
                } else {
                    setRainfall(0);
                    setPrediction(0);
                }
            } catch {
                setRainfall(0);
                setPrediction(0);
            }
            setLoading(false);
        }
        fetchRainfall();
    }, []);

    return (
        <div className="bg-blue-900/80 text-blue-300 px-4 py-2 rounded-xl shadow-lg mb-4 flex items-center gap-4">
            <span className="text-2xl">🌧️</span>
            <div>
                <div className="font-bold text-lg">Rainfall Prediction</div>
                {loading ? (
                    <div className="text-sm text-blue-200">Loading...</div>
                ) : (
                    <>
                        <div className="text-xl font-semibold">{rainfall} mm <span className="text-sm">(current)</span></div>
                        <div className="text-xs text-blue-200 mt-1">Next hour: <span className="font-bold text-blue-300">{prediction} mm</span></div>
                    </>
                )}
            </div>
        </div>
    );
}