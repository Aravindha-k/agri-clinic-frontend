import { useEffect, useState } from "react";

export default function AgriNewsTicker() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchNews() {
            try {
                // Example: Replace with real API endpoint for Tamil Nadu agri news
                // const res = await fetch("https://gnews.io/api/v4/search?q=agriculture%20Tamil%20Nadu&lang=en&country=in&max=5&apikey=demo");
                // const data = await res.json();
                // if (Array.isArray(data.articles)) {
                //   setNews(data.articles.map(a => ({ title: a.title })));
                // } else {
                //   setNews([...]);
                // }
                // For demo, use curated Tamil Nadu headlines
                setNews([
                    { title: "Heavy rainfall predicted in southern Tamil Nadu districts." },
                    { title: "Tamil Nadu government launches new agri subsidy scheme." },
                    { title: "Farmers in Thanjavur adopt organic methods." },
                    { title: "Cotton prices surge in Madurai market." },
                    { title: "Agri experts advise pest control for rice crops in Delta region." }
                ]);
            } catch {
                setNews([
                    { title: "Heavy rainfall predicted in southern Tamil Nadu districts." },
                    { title: "Tamil Nadu government launches new agri subsidy scheme." },
                    { title: "Farmers in Thanjavur adopt organic methods." },
                    { title: "Cotton prices surge in Madurai market." },
                    { title: "Agri experts advise pest control for rice crops in Delta region." }
                ]);
            }
            setLoading(false);
        }
        fetchNews();
    }, []);

    return (
        <div className="bg-gradient-to-r from-accent to-accent/80 text-white py-4 px-8 rounded-2xl shadow-xl mb-6 border border-accent/30">
            <div className="flex items-center gap-4 mb-2">
                <span className="text-3xl">📰</span>
                <span className="font-bold text-xl tracking-wide drop-shadow">Tamil Nadu Agri News</span>
            </div>
            <div className="relative h-9 overflow-hidden rounded-lg bg-slate-900/30 border border-white/10">
                <div className="absolute left-0 top-0 w-full h-full flex items-center animate-marquee">
                    {loading ? (
                        <span className="mx-6 text-base font-medium">Loading...</span>
                    ) : Array.isArray(news) ? news.map((n, i) => (
                        <span key={i} className="mx-8 text-base font-semibold whitespace-nowrap border-r border-white/10 pr-8 last:border-none">{n.title}</span>
                    )) : <span className="mx-4 text-base font-medium">No news available</span>}
                </div>
            </div>
            <style>{`
                .animate-marquee {
                    animation: marquee-tamil 28s linear infinite;
                }
                @keyframes marquee-tamil {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}