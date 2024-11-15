import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginForms from './pages/LoginSelection';
import LoginForm from './pages/LoginForm';
import LandingPage from './pages/LandingPage';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import GeneralManager from './pages/GeneralManager';
import Marketing from './pages/Marketing';
import PlantManager from './pages/PlantManager';
import Accountant from './pages/Accountant';
import PlantSupervisor from './pages/PlantSupervisor';
import OfficeSecretary from './pages/OfficeSecretary';
import CEO from './pages/CEO';
import DataImport from './pages/DataImport';
import './index.css';
import './pages/SignUp.css';
import './pages/ForgotPassword.css';
import { useAuth } from './hooks/useAuth';

// Define protected routes
const protectedRoutes = [
  { path: '/GeneralManager', element: GeneralManager },
  { path: '/marketing', element: Marketing },
  { path: '/plant-manager', element: PlantManager },
  { path: '/accountant', element: Accountant },
  { path: '/plant-supervisor', element: PlantSupervisor },
  { path: '/office-secretary', element: OfficeSecretary },
  { path: '/ceo', element: CEO },
  { path: '/data-import', element: DataImport }
];

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForms />} />
          <Route path="/login/:position" element={<LoginForm />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password/:position" element={<ForgotPassword />} />
          
          {/* Protected Routes */}
          {protectedRoutes.map(({ path, element: Element }) => (
            <Route
              key={path}
              path={path}
              element={
                user && !user.isDisabled ? (
                  <Element />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          ))}
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
