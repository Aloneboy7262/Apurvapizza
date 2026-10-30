import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('apurva_auth_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and check current user on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('apurva_auth_token');
      const storedUser = localStorage.getItem('apurva_auth_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);

          // Verify token validity in background
          const response = await api.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.user);
            localStorage.setItem('apurva_auth_user', JSON.stringify(response.data.user));
          }
        } catch (error) {
          console.warn('Session expired or invalid token:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (identifier, password) => {
    const response = await api.post('/auth/login', {
      username: identifier,
      email: identifier,
      phone: identifier,
      password
    });
    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('apurva_auth_token', receivedToken);
      localStorage.setItem('apurva_auth_user', JSON.stringify(receivedUser));
      return receivedUser;
    }
  };

  const loginWithOtp = async (phone, otp, name) => {
    const response = await api.post('/auth/login-otp', {
      phone,
      otp,
      name
    });
    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('apurva_auth_token', receivedToken);
      localStorage.setItem('apurva_auth_user', JSON.stringify(receivedUser));
      return receivedUser;
    }
  };

  const register = async ({ name, email, phone, password, address, role, isEmailVerified }) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      phone,
      password,
      address,
      role,
      isEmailVerified
    });

    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('apurva_auth_token', receivedToken);
      localStorage.setItem('apurva_auth_user', JSON.stringify(receivedUser));
      return receivedUser;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('apurva_auth_token');
    localStorage.removeItem('apurva_auth_user');
  };

  const updateProfile = async ({ name, address, addresses }) => {
    const response = await api.put('/auth/profile', { name, address, addresses });
    if (response.data.success) {
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('apurva_auth_user', JSON.stringify(updatedUser));
      return updatedUser;
    }
  };

  const addAddress = async (addressData) => {
    const response = await api.post('/auth/addresses', addressData);
    if (response.data.success) {
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('apurva_auth_user', JSON.stringify(updatedUser));
      return response.data;
    }
  };

  const updateAddress = async (addressId, addressData) => {
    const response = await api.put(`/auth/addresses/${addressId}`, addressData);
    if (response.data.success) {
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('apurva_auth_user', JSON.stringify(updatedUser));
      return response.data;
    }
  };

  const deleteAddress = async (addressId) => {
    const response = await api.delete(`/auth/addresses/${addressId}`);
    if (response.data.success) {
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('apurva_auth_user', JSON.stringify(updatedUser));
      return response.data;
    }
  };

  const setDefaultAddress = async (addressId) => {
    const response = await api.patch(`/auth/addresses/${addressId}/default`);
    if (response.data.success) {
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('apurva_auth_user', JSON.stringify(updatedUser));
      return response.data;
    }
  };

  const changeCredentials = async ({ oldPassword, newUsername, newPassword, confirmPassword }) => {
    const response = await api.put('/auth/change-credentials', {
      oldPassword,
      newUsername,
      newPassword,
      confirmPassword
    });
    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      if (receivedToken) {
        setToken(receivedToken);
        localStorage.setItem('apurva_auth_token', receivedToken);
      }
      if (receivedUser) {
        setUser(receivedUser);
        localStorage.setItem('apurva_auth_user', JSON.stringify(receivedUser));
      }
      return response.data;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        role: user?.role || 'customer',
        loading,
        login,
        loginWithOtp,
        register,
        logout,
        updateProfile,
        changeCredentials,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress
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
