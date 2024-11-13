import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaArchive, FaFileAlt, FaSearch, FaDownload, FaTools, FaUserCog, FaUserPlus, FaTrash, FaBan, FaKey, FaEye, FaEyeSlash } from 'react-icons/fa';
import { X, Eye, EyeOff } from 'lucide-react';
import '../pages/OfficeSecretary.css';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import AdminPanel from '../components/AdminPanel';

export default function OfficeSecretaryDashboard() {
  const [activeTab, setActiveTab] = useState('archivedOrders');
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState(null);
  const [paymentReports, setPaymentReports] = useState([]);
  const [archivedMaintenance, setArchivedMaintenance] = useState([]);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    jobPosition: '',
    name: '',
    employeeId: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    userId: null,
    userName: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchArchivedOrders();
    fetchPaymentReports();
    fetchArchivedMaintenance();
    fetchUsers();
  }, []);

  const fetchArchivedOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('status', 'in', ['DELIVERED', 'REJECTED']),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const archivedOrders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setArchivedOrders(archivedOrders);
    } catch (error) {
      console.error('Error fetching archived orders:', error);
    }
  };

  const fetchPaymentReports = async () => {
    try {
      const reportsRef = collection(db, 'paymentReports');
      const q = query(reportsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          date: data.date,
          generatedBy: 'Accountant',
          customerName: data.customerName || 'N/A',
          totalAmount: data.totalAmount || null,
          orderCount: data.orderCount || null,
          report: data.report
        };
      });
      
      setPaymentReports(reports);
    } catch (error) {
      console.error('Error fetching payment reports:', error);
      setError('Failed to load payment reports. Please try again later.');
    }
  };

  const fetchArchivedMaintenance = async () => {
    try {
      const maintenanceRef = collection(db, 'archivedMaintenance');
      const q = query(
        maintenanceRef,
        orderBy('completedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const maintenance = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setArchivedMaintenance(maintenance);
    } catch (error) {
      console.error('Error fetching archived maintenance:', error);
    }
  };

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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder({
      ...order,
      amount: order.amount ? order.amount.toFixed(2) : 'N/A'
    });
  };

  const closeModal = () => {
    setSelectedOrder(null);
  };

  const handleDownloadReport = (report) => {
    const linkSource = report.report;
    const downloadLink = document.createElement("a");
    const fileName = `payment_report_${new Date(report.date).toLocaleDateString()}.pdf`;

    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
  };

  const filteredOrders = archivedOrders.filter(order => {
    const matchesSearch = (
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = (
      filterStatus === 'all' || 
      order.status.toUpperCase() === filterStatus.toUpperCase()
    );
    
    return matchesSearch && matchesStatus;
  });

  const renderPaymentReports = () => (
    <div className="payment-reports">
      <h2>Payment Reports</h2>
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paymentReports.map((report) => (
              <tr key={report.id}>
                <td>{report.customerName}</td>
                <td>{new Date(report.date).toLocaleString()}</td>
                <td>₱{report.totalAmount ? report.totalAmount.toFixed(2) : 'N/A'}</td>
                <td>
                  <button className="download-btn" onClick={() => handleDownloadReport(report)}>
                    <FaDownload /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    return (
      <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Order Details</h2>
          <button onClick={() => setSelectedOrder(null)} className="close-btn">&times;</button>
          <div className="order-details">
            <table className="order-details-table">
              <tbody>
                <tr>
                  <th>ORDER ID:</th>
                  <td>{selectedOrder.id}</td>
                </tr>
                <tr>
                  <th>CUSTOMER:</th>
                  <td>{selectedOrder.customer}</td>
                </tr>
                <tr>
                  <th>TYPE:</th>
                  <td>{selectedOrder.type}</td>
                </tr>
                <tr>
                  <th>QUANTITY:</th>
                  <td>{selectedOrder.quantity}</td>
                </tr>
                <tr>
                  <th>AMOUNT:</th>
                  <td>₱{selectedOrder.amount}</td>
                </tr>
                <tr>
                  <th>STATUS:</th>
                  <td>{selectedOrder.status}</td>
                </tr>
                <tr>
                  <th>DATE:</th>
                  <td>{new Date(selectedOrder.date).toLocaleString()}</td>
                </tr>
                <tr>
                  <th>ADDRESS:</th>
                  <td>{selectedOrder.address}</td>
                </tr>
                <tr>
                  <th>CONTACT NUMBER:</th>
                  <td>{selectedOrder.contactNumber}</td>
                </tr>
                <tr>
                  <th>NOTES:</th>
                  <td>{selectedOrder.notes || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderArchivedMaintenance = () => {
    return (
      <div className="archived-maintenance-section">
        <h2>Archived Maintenance Tasks</h2>
        <div className="table-container">
          <table className="maintenance-table">
            <thead>
              <tr>
                <th>EQUIPMENT</th>
                <th>DESCRIPTION</th>
                <th>SERVICE DATE</th>
                <th>STATUS</th>
                <th>PRIORITY</th>
              </tr>
            </thead>
            <tbody>
              {archivedMaintenance.map((task) => (
                <tr key={task.id}>
                  <td>{task.equipment}</td>
                  <td>{task.description}</td>
                  <td>{new Date(task.completedAt).toLocaleDateString()}</td>
                  <td>
                    <span className="status-badge completed">
                      {task.status}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge ${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
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
      setIsCreateUserModalOpen(false);
      fetchUsers();
    } catch (error) {
      alert(`Error creating user: ${error.message}`);
    }
  };

  const handleResetPassword = async (userEmail) => {
    try {
      await sendPasswordResetEmail(auth, userEmail);
      alert('Password reset email sent successfully');
    } catch (error) {
      alert(`Error sending reset email: ${error.message}`);
    }
  };

  const handleDisableAccount = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const currentStatus = userDoc.data().disabled;
      
      await updateDoc(userRef, {
        disabled: !currentStatus
      });
      alert(`Account ${!currentStatus ? 'disabled' : 'enabled'} successfully`);
      fetchUsers();
    } catch (error) {
      alert(`Error updating account status: ${error.message}`);
    }
  };

  const handleDeleteAccount = async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setDeleteConfirmation({ isOpen: false, userId: null, userName: '' });
      fetchUsers();
    } catch (error) {
      alert(`Error deleting account: ${error.message}`);
    }
  };

  return (
    <div className="office-secretary">
      <div className="dashboard-container">
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
        <h1 className="dashboard-title">Office Secretary Dashboard</h1>
        
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'archivedOrders' ? 'active' : ''}`}
            onClick={() => setActiveTab('archivedOrders')}
          >
            <FaArchive /> Archived Orders
          </button>
          <button 
            className={`tab ${activeTab === 'paymentReports' ? 'active' : ''}`}
            onClick={() => setActiveTab('paymentReports')}
          >
            <FaFileAlt /> Payment Reports
          </button>
          <button 
            className={`tab ${activeTab === 'archivedMaintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('archivedMaintenance')}
          >
            <FaTools /> Archived Maintenance
          </button>
          <button 
            className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <FaUserCog /> Admin Panel
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'archivedOrders' && (
            <div className="archived-orders">
              <h2>Archived Orders</h2>
              <div className="filters">
                <div className="search-container">
                  <input 
                    type="text" 
                    placeholder="Search by customer or order ID" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Statuses</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div className="table-container">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.customer}</td>
                        <td>{new Date(order.date).toLocaleDateString()}</td>
                        <td>{order.quantity}</td>
                        <td>₱{order.amount ? order.amount.toFixed(2) : 'N/A'}</td>
                        <td>{order.status}</td>
                        <td>
                          <button className="view-btn" onClick={() => handleViewDetails(order)}>View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'paymentReports' && renderPaymentReports()}
          {activeTab === 'archivedMaintenance' && renderArchivedMaintenance()}
          {activeTab === 'admin' && (
            <div className="admin-section">
              <div className="admin-header">
                <h2>User Management</h2>
                <button 
                  className="create-user-btn"
                  onClick={() => setIsCreateUserModalOpen(true)}
                >
                  <FaUserPlus /> Create New User
                </button>
              </div>
              
              <div className="users-list">
                <h3>Existing Users</h3>
                <div className="table-container">
                  <table className="users-table">
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
                          <td className="action-buttons">
                            <button 
                              className="reset-btn"
                              onClick={() => handleResetPassword(user.email)}
                            >
                              <FaKey /> Reset Password
                            </button>
                            <button 
                              className="disable-btn"
                              onClick={() => handleDisableAccount(user.id)}
                            >
                              <FaBan /> {user.disabled ? 'Enable' : 'Disable'}
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => setDeleteConfirmation({ 
                                isOpen: true, 
                                userId: user.id, 
                                userName: user.name 
                              })}
                            >
                              <FaTrash /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Create User Modal */}
              {isCreateUserModalOpen && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <button 
                      className="modal-close"
                      onClick={() => setIsCreateUserModalOpen(false)}
                    >
                      <X size={20} />
                    </button>
                    <h2>Create New User</h2>
                    <form onSubmit={handleCreateUser} className="create-user-form">
                      <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <input
                          type="text"
                          id="fullName"
                          placeholder="Enter full name"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                          type="email"
                          id="email"
                          placeholder="Enter email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-container">
                          <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            placeholder="Enter password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            required
                          />
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="position">Position</label>
                        <select
                          id="position"
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedOrder && renderOrderDetails()}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirmation">
            <h2>Delete Account</h2>
            <p>Are you sure you want to delete the account for {deleteConfirmation.userName}?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="confirmation-buttons">
              <button 
                className="cancel-btn"
                onClick={() => setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={() => handleDeleteAccount(deleteConfirmation.userId)}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
