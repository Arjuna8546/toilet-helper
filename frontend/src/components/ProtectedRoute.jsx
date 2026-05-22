import { Navigate } from "react-router-dom";

import { useSelector } from "react-redux";

function ProtectedRoute({ children, adminOnly = false }) {

  const { token, user } = useSelector(
    (state) => state.auth
  );

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;