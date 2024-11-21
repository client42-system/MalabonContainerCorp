import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Shield, X } from 'lucide-react';
import { auth } from '../firebaseConfig'; 
import { sendPasswordResetEmail } from 'firebase/auth';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const { position } = useParams();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent. Check your inbox.');
      navigate('/login');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="forgot-password-container">
      <Card className="forgot-password-card">
        <div className="card-header">
          <Shield className="shield-icon" size={32} color="#3b82f6" />
          <h1>Reset Password</h1>
          <p className="subtitle">Enter your email to receive reset instructions</p>
        </div>
        <form onSubmit={handleForgotPassword} className="forgot-password-form">
          <div className="input-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="email-input"
            />
          </div>
          <Button type="submit" className="submit-button">
            Reset Password
          </Button>
          <button 
            type="button" 
            onClick={() => navigate('/login')} 
            className="back-to-login"
          >
            Back to Login
          </button>
        </form>
      </Card>
    </div>
  );
}
