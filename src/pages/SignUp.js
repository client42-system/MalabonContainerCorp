import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Shield } from 'lucide-react';
import { auth } from '../firebaseConfig'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../firebaseConfig'; // Import Firestore instance
import './SignUp.css';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jobPosition, setJobPosition] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save the user's email and job position to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        jobPosition: jobPosition,
      });

      alert('Sign Up Successful!'); // Success notification
      navigate('/'); // Navigate to your desired route after signup
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-6">
          <Shield className="w-12 h-12 text-gray-600 mb-2" />
          <h1 className="text-2xl font-bold">Sign Up</h1>
        </div>
        <form onSubmit={handleSignUp} className="space-y-4">
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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label htmlFor="jobPosition" className="block text-sm font-medium text-gray-700">Job Position</label>
            <select
              id="jobPosition"
              value={jobPosition}
              onChange={(e) => setJobPosition(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">Select a position</option>
              <option value="General Manager">General Manager</option>
              <option value="Marketing">Marketing</option>
              <option value="Plant Manager">Plant Manager</option>
              <option value="Accountant">Accountant</option>
              <option value="Plant Supervisor">Plant Supervisor</option>
              <option value="Office Secretary">Office Secretary</option>
              <option value="CEO">CEO</option>
            </select>
          </div>
          <div className="flex justify-between">
            <Button type="button" onClick={() => navigate(-1)} variant="outline">Back</Button>
            <Button type="submit">Sign Up</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
