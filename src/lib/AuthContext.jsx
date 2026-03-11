import React, { createContext, useContext, useMemo } from 'react';

const AuthContext = createContext({
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  user: null,
  navigateToLogin: () => {},
});

export function AuthProvider({ children }) {
  const value = useMemo(
    () => ({
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      user: null,
      navigateToLogin: () => {},
    }),
    []
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

