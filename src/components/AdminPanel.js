import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FaUserPlus, FaKey } from 'react-icons/fa';
import './AdminPanel.css';

export default function AdminPanel({ isGeneralManager = false }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    jobPosition: '',
    name: '',
    employeeId: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );

      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        ...newUser,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      alert('User created successfully');
      setNewUser({ email: '', password: '', jobPosition: '', name: '', employeeId: '' });
      fetchUsers();
    } catch (error) {
      alert(`Error creating user: ${error.message}`);
    }
  };

  return (
    <div className="admin-panel">
      <h2>User Management</h2>
      <form onSubmit={handleCreateUser} className="create-user-form">
        <h3>Create New User</h3>
        <div className="form-group">
          <input
            type="text"
            placeholder="Full Name"
            value={newUser.name}
            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            required
          />
        </div>
        <div className="form-group">
          <select
            value={newUser.jobPosition}
            onChange={(e) => setNewUser({...newUser, jobPosition: e.target.value})}
            required
          >
            <option value="">Select Position</option>
            <option value="Marketing">Marketing</option>
            <option value="Plant Manager">Plant Manager</option>
            <option value="Accountant">Accountant</option>
            <option value="Plant Supervisor">Plant Supervisor</option>
            <option value="Office Secretary">Office Secretary</option>
          </select>
        </div>
        <button type="submit" className="create-btn">
          <FaUserPlus /> Create User
        </button>
      </form>

      <div className="users-list">
        <h3>Existing Users</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Position</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.jobPosition}</td>
                <td>
                  <button className="reset-btn">
                    <FaKey /> Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}