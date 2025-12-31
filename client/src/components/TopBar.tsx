import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // remove auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user"); // if stored

    // redirect to login
    navigate("/");
  };

  return (
    <div className="flex items-center justify-end h-16 px-6 bg-white border-b shadow-sm">
      <button
        onClick={handleLogout}
        className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded hover:bg-red-600 transition"
      >
        Logout
      </button>
    </div>
  );
}
