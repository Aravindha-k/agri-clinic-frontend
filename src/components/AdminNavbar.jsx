export default function AdminNavbar() {
    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh");

        window.location.href = "/login";
    }

    return (
        <div className="topbar">
            <button onClick={logout}>Logout</button>
        </div>
    );
}
