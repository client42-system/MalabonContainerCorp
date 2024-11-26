import React, { useState } from 'react';
import { Briefcase, Lock, Tag, Factory, Calculator, ClipboardList, User, Crown, X, Eye, EyeOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../pages/LoginForm.css';
import { useAuth } from '../contexts/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { position } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { tabId, setCurrentUser } = useAuth();

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
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Create user session data
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        position: position
      };

      // Store in session storage with tab-specific key
      sessionStorage.setItem(`user_${tabId}`, JSON.stringify(userData));
      setCurrentUser(userData);

      // Get user document with more detailed logging
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      console.log('Checking Firestore document:', userDocRef.path);
      
      const userDoc = await getDoc(userDocRef);
      console.log('Firestore response:', userDoc.exists() ? 'Document exists' : 'Document does not exist');

      if (!userDoc.exists()) {
        // If user doesn't exist in Firestore, create their document
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: email,
            jobPosition: position,
            createdAt: new Date().toISOString(),
            uid: userCredential.user.uid
          });
          console.log('Created new user document in Firestore');
          
          // Fetch the document again
          const newUserDoc = await getDoc(userDocRef);
          if (newUserDoc.exists()) {
            const userData = newUserDoc.data();
            handleSuccessfulLogin(userData);
          }
        } catch (firestoreError) {
          console.error('Error creating user document:', firestoreError);
          setError('Error creating user profile. Please try again.');
          return;
        }
      } else {
        const userData = userDoc.data();
        handleSuccessfulLogin(userData);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else {
        setError(`Login error: ${error.message}`);
      }
    }
  };

  // Separate function to handle successful login
  const handleSuccessfulLogin = (userData) => {
    if (userData.jobPosition?.toLowerCase() !== position?.toLowerCase()) {
      setError('You cannot log in as a different job position. Please use the correct position.');
      return;
    }

    console.log('Login successful for position:', userData.jobPosition);
    
    // Add debug log to check the exact position value
    console.log('Position value for switch:', userData.jobPosition);

    switch (userData.jobPosition.toLowerCase()) {  // Convert to lowercase for comparison
      case 'general manager':
        navigate('/GeneralManager');
        break;
      case 'marketing':
        navigate('/Marketing');  // Make sure this matches your route exactly
        break;
      case 'plant manager':
        navigate('/plant-manager');
        break;
      case 'accountant':
        navigate('/accountant');
        break;
      case 'plant supervisor':
        navigate('/plant-supervisor');
        break;
      case 'office secretary':
        navigate('/office-secretary');
        break;
      case 'ceo':
        navigate('/ceo');
        break;
      default:
        console.log('No matching route found for position:', userData.jobPosition);
        navigate('/login');  // Change this to navigate to selection page if no match
    }
  };

  const IconComponent = icons[position];

  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <button 
          onClick={() => navigate('/login')} 
          className="close-button"
        >
          <X size={20} />
        </button>
        
        <div className="logo">
          {IconComponent && <IconComponent size={32} />}
        </div>
        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Login as {position}</p>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="forgot-password">
            <button
              type="button"
              onClick={() => navigate(`/forgot-password/${position}`)}
            >
              Forgot Password?
            </button>
          </div>
          <button type="submit" className="login-button">
            <Lock size={16} className="login-icon" />
            Login
          </button>
        </form>
        <p className="footer">Protected by company security policy</p>
      </div>
    </div>
  );
}

export default LoginForm;