import { useEffect, useState } from "react";
import { getMe } from "../../api/auth";

export default function AdminProfile() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        getMe()
            .then((res) => setUser(res.data))
            .catch(() => {
                // Only logout if token REALLY invalid
                localStorage.clear();
                window.location.href = "/login";
            });
    }, []);

    if (!user) return <p>Loading...</p>;

    return (
        <div>
            <h2>My Profile</h2>
            <p><b>Username:</b> {user.username}</p>
            <p><b>Role:</b> {user.role}</p>
        </div>
    );
}
