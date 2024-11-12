import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

function App() {
  
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForms />} />
          <Route path="/login/:position" element={<LoginForm />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password/:position" element={<ForgotPassword />} />
          <Route path="/GeneralManager" element={<GeneralManager />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/plant-manager" element={<PlantManager />} />
          <Route path="/accountant" element={<Accountant />} />
          <Route path="/plant-supervisor" element={<PlantSupervisor />} />
          <Route path="/office-secretary" element={<OfficeSecretary />} />
          <Route path="/ceo" element={<CEO />} />
          <Route path="/data-import" element={<DataImport />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
