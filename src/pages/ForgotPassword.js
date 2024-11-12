import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Shield } from 'lucide-react';
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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-6">
          <Shield className="w-12 h-12 text-gray-600 mb-2" />
          <h1 className="text-2xl font-bold">Forgot Password - {position}</h1>
        </div>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div className="flex justify-between">
            <Button type="button" onClick={() => navigate(-1)} variant="outline">Back</Button>
            <Button type="submit">Forgot</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
