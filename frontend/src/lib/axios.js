import axios from "axios";

import { store } from "../app/store";

import { logout } from "../features/auth/authSlice";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});


// Request Interceptor
api.interceptors.request.use(
  (config) => {

    const token = store.getState().auth.token;

    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// Response Interceptor
api.interceptors.response.use(
  (response) => response,

  (error) => {

    if (error.response?.status === 401) {

      store.dispatch(logout());

      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;