import React, { useState } from 'react';
import { Briefcase, Lock, Tag, Factory, Calculator, ClipboardList, User, Crown, X, Eye, EyeOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../pages/LoginForm.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { position } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

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
      console.log('Login successful');

      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User Data:', userData);
        console.log('Position Parameter:', position);

        if (userData.jobPosition.toLowerCase() !== position.toLowerCase()) {
          alert('You cannot log in as a different job position. Please sign up again with the correct position.');
          return;
        }

        alert('Login Successful!');

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
            navigate('/home');
        }
      } else {
        alert('User not found.');
      }
    } catch (error) {
      console.error('Error logging in:', error.message);
      setError('Invalid email or password. Please try again.');
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