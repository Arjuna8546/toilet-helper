import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Check, ShieldCheck } from "lucide-react";

import logo from "../assets/logo.png";
import { loginSuccess } from "../features/auth/authSlice";
import api from "../lib/axios";

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Google did not return a sign-in credential. Please try again.");
      return;
    }

    setError("");
    setIsSigningIn(true);
    try {
      const res = await api.post("/auth/google/", { token: credentialResponse.credential });
      dispatch(loginSuccess({ token: res.data.token, user: res.data.user }));
      navigate(res.data.user.is_admin ? "/admin-dashboard" : "/home");
    } catch (requestError) {
      console.error("Google Login Error:", requestError);
      setError(requestError?.response?.data?.detail || "We could not sign you in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="pee-login-page">
      <style>{`
        .pee-login-page {
          min-height: 100dvh; display: grid; place-items: center; padding: 20px;
          background: #E8E8E8; color: #111827; font-family: "DM Sans", sans-serif;
        }
        .pee-login-shell {
          width: min(100%, 950px); min-height: 560px; display: grid; grid-template-columns: 1.08fr .92fr;
          overflow: hidden; background: #fff; border: 1px solid #dedede; border-radius: 22px;
          box-shadow: 0 14px 44px rgba(17,24,39,.10);
        }
        .pee-login-intro {
          position: relative; overflow: hidden; padding: clamp(34px, 5vw, 60px);
          display: flex; flex-direction: column; justify-content: space-between;
          background: linear-gradient(145deg, #0d9468, #08765a); color: #fff;
        }
        .pee-login-intro::after {
          content: ""; position: absolute; right: -120px; bottom: -130px; width: 390px; height: 390px;
          border: 48px solid rgba(255,255,255,.08); border-radius: 50%;
        }
        .pee-brand { display: flex; align-items: center; gap: 10px; position: relative; z-index: 1; }
        .pee-brand-logo {
          width: 45px; height: 45px; padding: 5px; border-radius: 50%; background: #fff;
          display: grid; place-items: center; box-shadow: 0 5px 16px rgba(0,0,0,.16);
        }
        .pee-brand-logo img { width: 100%; height: 100%; object-fit: contain; }
        .pee-brand-name { font-family: "Baloo Chettan 2", "DM Sans", sans-serif; font-size: 27px; font-weight: 800; line-height: 1; }
        .pee-login-copy { position: relative; z-index: 1; margin: 55px 0; }
        .pee-login-copy p { margin: 0 0 12px; color: #baf3df; font-size: 12px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
        .pee-login-copy h1 { max-width: 430px; margin: 0; font-size: clamp(36px, 4.5vw, 53px); line-height: 1.04; letter-spacing: -2px; }
        .pee-login-copy h1 span { color: #d7ff73; }
        .pee-login-copy div { max-width: 380px; margin-top: 17px; color: #e1fff5; line-height: 1.65; font-size: 14px; }
        .pee-login-points { position: relative; z-index: 1; display: grid; gap: 11px; }
        .pee-login-point { display: flex; align-items: center; gap: 9px; color: #effff9; font-size: 13px; font-weight: 600; }
        .pee-login-point span { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.16); }
        .pee-login-card { display: flex; flex-direction: column; justify-content: center; padding: clamp(32px, 5vw, 58px); }
        .pee-login-card h2 { margin: 0; color: #111827; font-size: 30px; letter-spacing: -1.1px; }
        .pee-login-card > p { margin: 10px 0 29px; color: #6b7280; font-size: 14px; line-height: 1.6; }
        .pee-login-google {
          display: flex; justify-content: center; align-items: center; min-height: 48px; padding: 4px;
          border: 1.5px solid #dde5e2; border-radius: 10px; background: #fff; transition: .16s ease;
        }
        .pee-login-google:hover { border-color: #10B57E; box-shadow: 0 5px 16px rgba(16,181,126,.13); }
        .pee-login-google > div { width: 100% !important; display: flex; justify-content: center; }
        .pee-login-status { margin: 13px 0 0; text-align: center; color: #0d9468; font-size: 12px; font-weight: 700; }
        .pee-login-error { margin: 14px 0 0; padding: 10px 12px; border-radius: 9px; background: #fef2f2; color: #b91c1c; font-size: 13px; line-height: 1.45; }
        .pee-login-security { display: flex; gap: 8px; align-items: flex-start; margin-top: 28px; padding-top: 20px; border-top: 1px solid #E8E8E8; color: #6b7280; font-size: 12px; line-height: 1.55; }
        .pee-login-security svg { flex: 0 0 auto; color: #0d9468; margin-top: 1px; }
        @media (max-width: 720px) {
          .pee-login-page { padding: 14px; }
          .pee-login-shell { min-height: 0; grid-template-columns: 1fr; }
          .pee-login-intro { min-height: 360px; padding: 31px; }
          .pee-login-copy { margin: 38px 0 25px; }
          .pee-login-copy h1 { font-size: 40px; }
          .pee-login-card { padding: 35px 27px 40px; }
        }
      `}</style>

      <section className="pee-login-shell">
        <aside className="pee-login-intro">
          <div className="pee-brand">
            <span className="pee-brand-logo"><img src={logo} alt="peeസ് logo" /></span>
            <span className="pee-brand-name">peeസ്</span>
          </div>

          <div className="pee-login-copy">
            <h1>Good stops make every <span>journey</span> better.</h1>
            <div>Discover verified toilets nearby, read honest reviews, and share what you find.</div>
          </div>

          <div className="pee-login-points">
            {["Find trusted facilities nearby", "See real community ratings", "Help improve public spaces"].map((point) => (
              <div className="pee-login-point" key={point}><span><Check size={14} strokeWidth={3} /></span>{point}</div>
            ))}
          </div>
        </aside>

        <section className="pee-login-card">
          <h2>Welcome to peeസ്</h2>
          <p>Continue with Google to discover and review public toilets in your area.</p>

          <div className="pee-login-google">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError("Google sign-in was cancelled or could not be completed.")}
              useOneTap
              auto_select={false}
              theme="outline"
              shape="rectangular"
              size="large"
              text="continue_with"
              width="320"
            />
          </div>

          {isSigningIn && <div className="pee-login-status">Signing you in securely…</div>}
          {error && <p className="pee-login-error" role="alert">{error}</p>}

          <div className="pee-login-security">
            <ShieldCheck size={17} />
            <span>Secure Google sign-in. We never see or store your Google password.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Login;
