import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../features/auth/authSlice";
import api from "../lib/axios";

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        alert("Google credential not received");
        return;
      }

      const res = await api.post("/auth/google/", {
        token: credentialResponse.credential,
      });

      dispatch(
        loginSuccess({
          token: res.data.token,
          user: res.data.user,
        })
      );

      // store token locally
      localStorage.setItem("token", res.data.token);

      if (res.data.user.is_admin) {
        navigate("/admin-dashboard");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.error("Google Login Error:", error);

      alert(
        error?.response?.data?.detail || "Google Login Failed"
      );
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <h1>Toilet Trail</h1>

      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          console.log("Google Login Failed");
          alert("Google Login Failed");
        }}
        useOneTap
        auto_select={false}
      />
    </div>
  );
}

export default Login;