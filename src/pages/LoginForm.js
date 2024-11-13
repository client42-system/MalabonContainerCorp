import React, { useState } from 'react';
import { Briefcase, Lock, Tag, Factory, Calculator, ClipboardList, User, Crown, X, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm relative">
        <button 
          onClick={() => navigate('/login')} 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>
        
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
              className="border border-gray-300 p-2 rounded-md w-full mb-4"
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 p-2 rounded-md w-full mb-4"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[40%] transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => navigate(`/forgot-password/${position}`)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Forgot Password?
            </button>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <button 
              type="submit" 
              className="bg-blue-600 text-white p-2 rounded-md flex items-center justify-center w-full"
            >
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


