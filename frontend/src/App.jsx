// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AddToilet from "./pages/AddToilet";
import AllToilets from "./pages/AllToilets";
import UserHome from "./pages/UserHome";
import ProtectedRoute from "./components/ProtectedRoute";
import ToiletView from "./pages/Toiletview";

function App() {
  const { token, user } = useSelector((state) => state.auth);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              user?.is_admin ? (
                <Navigate to="/admin-dashboard" />
              ) : (
                <Navigate to="/home" />
              )
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard/add-toilet"
          element={
            <ProtectedRoute adminOnly={true}>
              <AddToilet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard/toilets"
          element={
            <ProtectedRoute adminOnly={true}>
              <AllToilets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <UserHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/toilet/:id"
          element={
            <ProtectedRoute>
              <ToiletView />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;