import { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Get additional user data from session storage
        const sessionUser = JSON.parse(sessionStorage.getItem('currentUser'));
        setCurrentUser({ ...user, ...sessionUser });
      } else {
        setCurrentUser(null);
        // Clear session storage when user is signed out
        sessionStorage.removeItem('currentUser');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { currentUser, loading };
}; 