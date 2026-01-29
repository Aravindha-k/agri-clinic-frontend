import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";

import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    Popup,
} from "react-leaflet";
import L from "leaflet";

const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export default function EmployeeMap() {
    const { userId } = useParams();
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);

    const today = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        api
            .get(`/tracking/admin/locations/${userId}/?date=${today}`)
            .then((res) => {
                setPoints(res.data);
            })
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return <p>Loading map...</p>;
    if (points.length === 0) return <p>No GPS data for today</p>;

    const path = points.map((p) => [
        parseFloat(p.latitude),
        parseFloat(p.longitude),
    ]);

    return (
        <div style={{ height: "600px", width: "100%" }}>
            <MapContainer
                center={path[0]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap"
                />

                {/* PATH */}
                <Polyline positions={path} color="green" />

                {/* MARKERS */}
                {path.map((pos, idx) => (
                    <Marker key={idx} position={pos} icon={markerIcon}>
                        <Popup>
                            Point {idx + 1}
                            <br />
                            {points[idx].recorded_at}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
