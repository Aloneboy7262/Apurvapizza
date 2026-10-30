import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const ALLOWED_STAFF_ROLES = ['admin', 'kitchen', 'driver', 'rider'];
const isStaffRole = (role) => typeof role === 'string' && ALLOWED_STAFF_ROLES.includes(role.toLowerCase());

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('apurva_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('apurva_admin_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session on app initialization
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('apurva_admin_token');
      const storedUser = localStorage.getItem('apurva_admin_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Strict Role Verification: allow admin, kitchen, driver, rider
          if (!isStaffRole(parsedUser.role)) {
            logout();
            setLoading(false);
            return;
          }

          setUser(parsedUser);
          setToken(storedToken);

          // Verify token against backend API
          const response = await api.get('/auth/me');
          if (response.data.success) {
            const freshUser = response.data.user;
            if (!isStaffRole(freshUser.role)) {
              logout();
            } else {
              setUser(freshUser);
              localStorage.setItem('apurva_admin_user', JSON.stringify(freshUser));
            }
          }
        } catch (error) {
          console.warn('[Admin Auth] Session verification failed:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  /**
   * Strict Login: Rejects standard customers and allows 'admin', 'kitchen', or 'driver'/'rider'
   */
  const login = async (identifier, password) => {
    const cleanId = String(identifier || '').trim();
    const response = await api.post('/auth/login', {
      username: cleanId,
      phone: cleanId,
      password
    });

    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;

      // SECURITY ENFORCEMENT: Only admin, kitchen, or driver (rider) roles allowed
      if (!isStaffRole(receivedUser.role)) {
        throw new Error(
          'ACCESS DENIED: Standard customer accounts cannot access the Staff & Rider portal. Please log in with an authorized staff or rider account.'
        );
      }

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('apurva_admin_token', receivedToken);
      localStorage.setItem('apurva_admin_user', JSON.stringify(receivedUser));
      return receivedUser;
    } else {
      throw new Error(response.data.message || 'Login failed.');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('apurva_admin_token');
    localStorage.removeItem('apurva_admin_user');
  };

  const updateCurrentUser = (updatedUser, newToken) => {
    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('apurva_admin_user', JSON.stringify(updatedUser));
    }
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('apurva_admin_token', newToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user && isStaffRole(user.role),
        isAdmin: user?.role === 'admin',
        isKitchen: user?.role === 'kitchen',
        isDriver: user?.role === 'driver' || user?.role === 'rider',
        loading,
        login,
        logout,
        updateCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
