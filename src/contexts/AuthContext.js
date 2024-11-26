import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate a unique ID for this browser tab
  const tabId = window.sessionStorage.getItem('tabId') || Math.random().toString(36).substring(2);
  
  useEffect(() => {
    // Store the tab ID in session storage
    window.sessionStorage.setItem('tabId', tabId);
    
    // Initialize user state from session storage
    const sessionUser = JSON.parse(sessionStorage.getItem(`user_${tabId}`));
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }
    
    setLoading(false);
  }, [tabId]);

  const value = {
    currentUser,
    setCurrentUser,
    tabId
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 