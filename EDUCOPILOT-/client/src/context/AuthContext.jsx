import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('educopilot_token');
      const cachedUser = localStorage.getItem('educopilot_user');

      if (token && cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
          // Verify with backend silently
          const res = await api.get('/auth/me');
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('educopilot_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('[AuthContext] Session expired or invalid');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, expectedRole) => {
    const res = await api.post('/auth/login', { email, password, expectedRole });
    const { token, ...userData } = res.data;
    localStorage.setItem('educopilot_token', token);
    localStorage.setItem('educopilot_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { token, ...userData } = res.data;
    localStorage.setItem('educopilot_token', token);
    localStorage.setItem('educopilot_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('educopilot_token');
    localStorage.removeItem('educopilot_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isStudent: user?.role === 'student',
        isProfessor: user?.role === 'professor',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
