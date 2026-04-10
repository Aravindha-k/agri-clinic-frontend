import { useEffect, useState } from "react";

export default function CropPriceTicker() {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPrices() {
            try {
                // Example: Replace with real API endpoint or use sample data
                // const res = await fetch("https://api.example.com/crop-prices");
                // const data = await res.json();
                // setPrices(data.prices || []);
                setPrices([
                    { crop: "Rice", price: "₹1800/qtl" },
                    { crop: "Wheat", price: "₹2100/qtl" },
                    { crop: "Maize", price: "₹1600/qtl" },
                    { crop: "Cotton", price: "₹5200/qtl" },
                    { crop: "Sugarcane", price: "₹340/qtl" }
                ]);
            } catch {
                setPrices([
                    { crop: "Rice", price: "₹1800/qtl" },
                    { crop: "Wheat", price: "₹2100/qtl" },
                    { crop: "Maize", price: "₹1600/qtl" },
                    { crop: "Cotton", price: "₹5200/qtl" },
                    { crop: "Sugarcane", price: "₹340/qtl" }
                ]);
            }
            setLoading(false);
        }
        fetchPrices();
    }, []);

    return (
        <div className="bg-green-900/80 text-green-300 py-2 px-4 rounded-xl shadow-lg mb-4 overflow-hidden">
            <div className="flex items-center gap-2">
                <span className="font-bold text-lg">💹 Crop Prices:</span>
                <div className="marquee whitespace-nowrap overflow-hidden">
                    <div className="inline-block animate-marquee">
                        {loading ? "Loading..." : prices.map((p, i) => (
                            <span key={i} className="mx-4 text-sm font-medium">{p.crop}: {p.price}</span>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`
        .animate-marquee {
          animation: marquee 18s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-60%); }
        }
      `}</style>
        </div>
    );
}