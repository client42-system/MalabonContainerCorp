import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requiredPosition }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (currentUser.position !== requiredPosition) {
    return <Navigate to="/login" />;
  }

  return children;
}; 