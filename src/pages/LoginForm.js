import React, { useState } from 'react';
import { Briefcase, Lock, Tag, Factory, Calculator, ClipboardList, User, Crown } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import Firebase Auth method
import { auth } from '../firebaseConfig'; // Import the configured Firebase instance
import { getDoc, doc } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../firebaseConfig'; // Import Firestore instance
import '../pages/LoginForm.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // For handling authentication errors
  const { position } = useParams();
  const navigate = useNavigate(); // Initialize the navigate function

  // Define icons for each job position
  const icons = {
    "General Manager": Briefcase,
    "Marketing": Tag,
    "Plant Manager": Factory,
    "Accountant": Calculator,
    "Plant Supervisor": ClipboardList,
    "Office Secretary": User,
    "CEO": Crown,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Reset error before attempting login

    try {
      // Use Firebase signInWithEmailAndPassword for login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');

      const user = userCredential.user; // Get the logged-in user

      // Fetch user data from Firestore using UID
      const userDoc = await getDoc(doc(db, 'users', user.uid)); // Fetching the user document based on UID

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User Data:', userData); // Log the user data

        console.log('Position Parameter:', position); // Log the position parameter

        // Check if the user is trying to log in with the correct job position
        if (userData.jobPosition.toLowerCase() !== position.toLowerCase()) {
          alert('You cannot log in as a different job position. Please sign up again with the correct position.');
          return; // Prevent login
        }

        alert('Login Successful!'); // Success notification

        // Navigate to the corresponding page based on job position
        switch (userData.jobPosition) {
          case 'General Manager':
            navigate('/GeneralManager');
            break;
          case 'Marketing':
            navigate('/marketing');
            break;
          case 'Plant Manager':
            navigate('/plant-manager');
            break;
          case 'Accountant':
            navigate('/accountant');
            break;
          case 'Plant Supervisor':
            navigate('/plant-supervisor');
            break;
          case 'Office Secretary':
            navigate('/office-secretary');
            break;
          case 'CEO':
            navigate('/ceo');
            break;
          default:
            navigate('/home'); // Fallback if position does not match
        }
      } else {
        alert('User not found.');
      }
    } catch (error) {
      console.error('Error logging in:', error.message);
      setError('Invalid email or password. Please try again.');
    }
  };

  const IconComponent = icons[position]; // Get the corresponding icon

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <div className="logo">
          {IconComponent && <IconComponent size={32} />}
        </div>
        <h1 className="text-2xl font-bold">Login</h1>
        <p>Login as {position}</p>

        {/* Display error message */}
        {error && <p className="text-red-500 text-center">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 p-2 rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 p-2 rounded-md"
              required
            />
          </div>
          <div className="buttons flex justify-between">
            <button
              type="button"
              onClick={() => navigate('/login')} // Navigate back to the LoginSelection page
              className="bg-gray-200 p-2 rounded-md"
            >
              Back
            </button>
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-md flex items-center">
              <Lock size={16} className="mr-1" />
              Login
            </button>
          </div>
        </form>
        <p className="footer text-sm text-gray-500 text-center mt-4">Protected by company security policy</p>
      </div>
    </div>
  );
}

export default LoginForm;


