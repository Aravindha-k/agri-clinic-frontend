import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./TrackingMap.css";

/* ✅ Fix Leaflet Marker Icon Issue */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

/* ✅ Marker Icons */
const startIcon = new L.Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    iconSize: [36, 36],
});

const liveIcon = new L.Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    iconSize: [42, 42],
});

/* ✅ Auto Fit Route */
function FitBounds({ path }) {
    const map = useMap();

    useEffect(() => {
        if (path.length > 1) {
            map.fitBounds(path, { padding: [80, 80] });
        }
    }, [path, map]);

    return null;
}

export default function TrackingMap() {
    const { userId } = useParams();

    const [points, setPoints] = useState([]);
    const [employee, setEmployee] = useState(null);

    /* ✅ Modern Calendar Date */
    const [selectedDate, setSelectedDate] = useState(new Date());

    /* ✅ Load Employee Info */
    useEffect(() => {
        api.get("/tracking/admin-status/").then((res) => {
            const emp = res.data.find((e) => e.user_id == userId);
            setEmployee(emp);
        });
    }, [userId]);

    /* ✅ Load Route Points */
    const loadRoute = () => {
        const formattedDate = selectedDate.toISOString().split("T")[0];

        api
            .get(`/tracking/admin/locations/${userId}/`, {
                params: { date: formattedDate },
            })
            .then((res) => setPoints(res.data))
            .catch((err) => console.error("Route Error:", err));
    };

    /* ✅ Reload Route when Date Changes */
    useEffect(() => {
        loadRoute();
    }, [selectedDate]);

    return (
        <div className="modern-map-page">
            {/* ✅ Modern Header + Calendar */}
            <div className="tracking-toolbar">
                <div>
                    <h2>🌿 Employee Route History</h2>
                    <p>
                        Employee: <b>{employee?.username}</b> ({employee?.employee_id})
                    </p>
                </div>

                <div className="date-filter">
                    <span>Select Date</span>

                    <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        dateFormat="dd MMM yyyy"
                        className="modern-datepicker"
                        popperPlacement="bottom-end"
                        popperClassName="datepicker-popper"
                    />
                </div>
            </div>

            {/* ✅ No Data */}
            {points.length === 0 ? (
                <p style={{ padding: 20 }}>
                    ❌ No GPS Data Available for this date
                </p>
            ) : (
                <div className="map-card">
                    <MapContainer center={[points[0].latitude, points[0].longitude]} zoom={13} className="modern-map">
                        <FitBounds
                            path={points.map((p) => [p.latitude, p.longitude])}
                        />

                        {/* ✅ Satellite Map */}
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles © Esri"
                        />

                        {/* ✅ Dotted Route Line */}
                        {points.length > 2 && (
                            <Polyline
                                positions={points.map((p) => [p.latitude, p.longitude])}
                                pathOptions={{
                                    color: "#00ff00",
                                    weight: 4,
                                    dashArray: "8 12",
                                    opacity: 0.9,
                                }}
                            />
                        )}

                        {/* ✅ Start Marker */}
                        <Marker
                            position={[points[0].latitude, points[0].longitude]}
                            icon={startIcon}
                        >
                            <Popup>
                                ✅ <b>Start Point</b> <br />
                                {new Date(points[0].recorded_at).toLocaleTimeString()}
                            </Popup>
                        </Marker>

                        {/* ✅ Last Marker */}
                        <Marker
                            position={[
                                points[points.length - 1].latitude,
                                points[points.length - 1].longitude,
                            ]}
                            icon={liveIcon}
                        >
                            <Popup>
                                🔵 <b>Last Location</b> <br />
                                {new Date(
                                    points[points.length - 1].recorded_at
                                ).toLocaleTimeString()}
                            </Popup>
                        </Marker>
                    </MapContainer>
                </div>
            )}
        </div>
    );
}
