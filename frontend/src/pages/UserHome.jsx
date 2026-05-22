import { useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";

import { logout } from "../features/auth/authSlice";

function UserHome() {

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const user = useSelector(
    (state) => state.auth.user
  );

  const handleLogout = () => {

    // Clear redux auth state
    dispatch(logout());

    // Redirect login
    navigate("/");
  };

  return (
    <div style={{ padding: "40px" }}>

      <h1>User Home</h1>

      <p>Welcome {user?.name}</p>

      <button
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          marginTop: "20px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>

    </div>
  );
}

export default UserHome;