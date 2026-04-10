import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFarmers } from "../api/farmer.api";
import { unwrapResponse } from "../api/axios";
import Visits from "./Visits";

const FarmerDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [farmer, setFarmer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await getFarmers();
                const data = unwrapResponse(res);
                const list = data?.results || data || [];
                const found = list.find(f => String(f.farmer_phone || f.phone || f.id) === String(id));
                setFarmer(found || null);
            } catch (err) {
                setError("Failed to load farmer");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate("/farmers");
        }
    };

    return (
        <div>
            <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
                <button
                    onClick={handleBack}
                    style={{ marginBottom: 24, background: "#f1f5f9", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}
                >
                    ← Back
                </button>
                {error && <div style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</div>}
                {loading ? (
                    <div>Loading...</div>
                ) : !farmer ? (
                    <div style={{ color: "#64748b", textAlign: "center", marginTop: 40 }}>Farmer not found</div>
                ) : (
                    <div style={{ marginBottom: 32 }}>
                        <div style={{ marginBottom: 12 }}><strong>Name:</strong> {farmer.farmer_name || farmer.name || "—"}</div>
                        <div style={{ marginBottom: 12 }}><strong>Phone:</strong> {farmer.farmer_phone || farmer.phone || "—"}</div>
                        <div style={{ marginBottom: 12 }}><strong>Village:</strong> {farmer.village_name || farmer.village || "—"}</div>
                    </div>
                )}
            </div>
            {/* Full Visits UI for this farmer */}
            <Visits farmerId={id} />
        </div>
    );
};

export default FarmerDetails;
