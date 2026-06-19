import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const normalizeUser = (data) => data?.user || data;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const response = await authAPI.getProfile();
        setUser(normalizeUser(response.data));
        setToken(storedToken);
      } catch (error) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const normalizedUser = normalizeUser(response.data);
      const { token: newToken, success, ...userData } = normalizedUser;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const normalizedUser = normalizeUser(response.data);
      const { token: newToken, success, message, ...user } = normalizedUser;
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(user);
      }
      return { success: true, user, message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      if (localStorage.getItem('token')) {
        await authAPI.logout();
      }
    } catch (error) {
      // Local logout should still happen if the server cannot record it.
    }

    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const normalizedUser = normalizeUser(response.data);
      const { token: newToken, success, message, ...userData } = normalizedUser;

      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
      }

      setUser((currentUser) => ({ ...currentUser, ...userData }));
      return { success: true, user: userData, message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile',
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
