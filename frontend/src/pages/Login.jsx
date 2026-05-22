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

      const res = await api.post(
        "/auth/google/",
        {
          token: credentialResponse.credential,
        }
      );

      dispatch(
        loginSuccess({
          token: res.data.token,
          user: res.data.user,
        })
      );

      if (res.data.user.is_admin) {
        navigate("/admin-dashboard");
      } else {
        navigate("/home");
      }

    } catch (error) {

      console.error(error);

      alert("Login Failed");
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
          alert("Google Login Failed");
        }}
      />

    </div>
  );
}

export default Login;