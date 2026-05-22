import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { Provider } from "react-redux";
import './index.css';
import { store } from "./app/store";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>

    <Provider store={store}>

      <GoogleOAuthProvider
        clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      >
        <App />
      </GoogleOAuthProvider>

    </Provider>

  </React.StrictMode>
);