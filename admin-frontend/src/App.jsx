import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded portals for fast, independent station loading
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const DeliveryPortal = lazy(() => import('./pages/DeliveryPortal'));

const AdminFallbackLoader = () => (
  <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center space-y-3">
    <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-bold tracking-wider text-orange-400 uppercase animate-pulse">
      Loading Console...
    </span>
  </div>
);

// Root Router Redirector based on staff authentication state & role
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.role === 'kitchen') {
    return <Navigate to="/kitchen" replace />;
  }

  if (user.role === 'driver' || user.role === 'rider') {
    return <Navigate to="/rider" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<AdminFallbackLoader />}>
          <Routes>
            {/* Public / Staff Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Console (Admins only) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Protected Kitchen Display System - KDS (Kitchen staff & Admins) */}
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
                  <Kitchen />
                </ProtectedRoute>
              }
            />

            {/* Protected Delivery Partner / Rider Portal (Drivers, Riders & Admins) */}
            <Route
              path="/rider"
              element={
                <ProtectedRoute allowedRoles={['driver', 'rider', 'admin']}>
                  <DeliveryPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver"
              element={
                <ProtectedRoute allowedRoles={['driver', 'rider', 'admin']}>
                  <DeliveryPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery-portal"
              element={
                <ProtectedRoute allowedRoles={['driver', 'rider', 'admin']}>
                  <DeliveryPortal />
                </ProtectedRoute>
              }
            />

            {/* Default entry and catch-all */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
