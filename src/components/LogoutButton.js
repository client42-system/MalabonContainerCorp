import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

const LogoutButton = () => {
  const { tabId, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Remove only this tab's session data
      sessionStorage.removeItem(`user_${tabId}`);
      setCurrentUser(null);
      
      // Sign out from Firebase but maintain other tabs' sessions
      await auth.signOut();
      
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}; 