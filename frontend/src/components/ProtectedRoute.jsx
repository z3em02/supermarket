import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ADMIN_BASE } from '../config/adminPath';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`${ADMIN_BASE}/login`} replace />;
  }

  return children;
};