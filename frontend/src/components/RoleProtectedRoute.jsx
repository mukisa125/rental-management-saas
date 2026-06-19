import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleProtectedRoute = ({ children, allowedRoles, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Guard against undefined roles. Support `requiredRole` (string)
  // and `allowedRoles` (array or string).
  const role = user?.role;

  if (requiredRole) {
    if (!role || role !== requiredRole) {
      return <Navigate to="/" replace />;
    }
  } else if (allowedRoles) {
    if (Array.isArray(allowedRoles)) {
      if (!role || !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
      }
    } else if (typeof allowedRoles === 'string') {
      if (!role || allowedRoles !== role) {
        return <Navigate to="/" replace />;
      }
    }
  }

  return children;
};

export default RoleProtectedRoute;
