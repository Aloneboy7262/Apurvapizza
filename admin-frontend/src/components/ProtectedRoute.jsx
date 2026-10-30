import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = ['admin', 'kitchen', 'driver', 'rider'] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center animate-spin">
            <Loader2 className="w-7 h-7 text-orange-500" />
          </div>
        </div>
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
          Verifying Staff Credentials...
        </p>
      </div>
    );
  }

  // Not authenticated or invalid token
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict Role check
  if (!allowedRoles.includes(user.role)) {
    // If kitchen role tries to access admin-only pages, redirect to kitchen
    if (user.role === 'kitchen') {
      return <Navigate to="/kitchen" replace />;
    }
    // If driver role tries to access other pages, redirect to rider portal
    if (user.role === 'driver' || user.role === 'rider') {
      return <Navigate to="/rider" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
