import React, { useState, useEffect } from 'react';
import './GeneralManager.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { FaChartLine, FaClipboardList, FaTools, FaSignOutAlt, FaCheck, FaTimes, FaEye, FaCalendar, FaUserCog, FaUserPlus, FaKey, FaBan, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, query, orderBy, onSnapshot, where, addDoc, limit, deleteDoc, getDoc } from 'firebase/firestore';
import AdminPanel from '../components/AdminPanel';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { X, Eye, EyeOff } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function GeneralManager() {
  const [activeTab, setActiveTab] = useState('productionAnalytics');
  const [orders, setOrders] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [productionData, setProductionData] = useState(null);
  const [weeklyProductionData, setWeeklyProductionData] = useState(null);
  const [monthlyProductionData, setMonthlyProductionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
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
    const unsubscribe = setupRealtimeListeners();
    fetchMaintenanceTasks();
    fetchProductionData();
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const setupRealtimeListeners = () => {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', 'in', ['PENDING_APPROVAL', 'Pending', 'Accepted', 'COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED']),
      orderBy('date', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const fetchedOrders = querySnapshot.docs
        .map(doc => ({
          ...doc.data(),
          firestoreId: doc.id
        }))
        .sort((a, b) => b.id.localeCompare(a.id));
      
      setOrders(fetchedOrders);
    }, (error) => {
      console.error('Error setting up real-time listeners:', error);
    });
  };

  const fetchMaintenanceTasks = async () => {
    try {
      setIsLoading(true);
      const tasksRef = collection(db, 'maintenanceTasks');
      const q = query(
        tasksRef,
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaintenanceTasks(tasks);
    } catch (error) {
      console.error('Error fetching maintenance tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductionData = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      
      // Weekly data using existing index (status, date, __name__)
      const weeklyQuery = query(
        ordersRef,
        where('status', '==', 'DELIVERED'),
        orderBy('date', 'desc'),
        limit(7)
      );
      
      const weeklySnapshot = await getDocs(weeklyQuery);
      const weeklyData = processProductionData(weeklySnapshot.docs);
      setWeeklyProductionData(weeklyData);

      // Monthly data using same index
      const monthlyQuery = query(
        ordersRef,
        where('status', '==', 'DELIVERED'),
        orderBy('date', 'desc'),
        limit(30)
      );
      
      const monthlySnapshot = await getDocs(monthlyQuery);
      const monthlyData = processProductionData(monthlySnapshot.docs);
      setMonthlyProductionData(monthlyData);
    } catch (error) {
      console.error('Error fetching production data:', error);
    }
  };

  const processProductionData = (docs) => {
    const data = {};
    
    // Process in reverse to get chronological order
    docs.reverse().forEach(doc => {
      const date = new Date(doc.data().date).toLocaleDateString();
      const quantity = doc.data().quantity || 0;
      
      if (data[date]) {
        data[date] += quantity;
      } else {
        data[date] = quantity;
      }
    });

    return {
      labels: Object.keys(data),
      datasets: [{
        label: 'Completed Production',
        data: Object.values(data),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };
  };

  const renderProductionAnalytics = () => (
    <div className="production-analytics">
      <div className="analytics-header">
        <h2>Production Overview</h2>
        <div className="date-range">Last 30 Days</div>
      </div>
      <div className="analytics-grid">
        <div className="graph-wrapper">
          {weeklyProductionData && (
            <div className="chart-container">
              {renderProductionGraph(weeklyProductionData, "Weekly Production")}
            </div>
          )}
        </div>
        <div className="graph-wrapper">
          {monthlyProductionData && (
            <div className="chart-container">
              {renderProductionGraph(monthlyProductionData, "Monthly Production")}
            </div>
          )}
        </div>
        <div className="stats-container">
          <div className="stat-card">
            <h3>Weekly Total</h3>
            <div className="stat-value">
              {weeklyProductionData ? weeklyProductionData.datasets[0].data.reduce((a, b) => a + b, 0) : 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Monthly Total</h3>
            <div className="stat-value">
              {monthlyProductionData ? monthlyProductionData.datasets[0].data.reduce((a, b) => a + b, 0) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProductionGraph = (data, title) => (
    <Line 
      data={{
        ...data,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3b82f6',
          tension: 0.4
        }))
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                family: "'Segoe UI', sans-serif",
                weight: '500'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                return `Quantity: ${context.parsed.y}`;
              }
            }
          },
          title: {
            display: true,
            text: title,
            color: '#1e293b',
            font: {
              size: 20,
              family: "'Segoe UI', sans-serif",
              weight: '600'
            },
            padding: { bottom: 30 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(226, 232, 240, 0.6)',
              drawBorder: false
            },
            border: {
              display: false
            },
            ticks: {
              padding: 10,
              color: '#64748b',
              font: {
                size: 12,
                family: "'Segoe UI', sans-serif"
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              padding: 10,
              color: '#64748b',
              font: {
                size: 12,
                family: "'Segoe UI', sans-serif"
              }
            }
          }
        }
      }}
    />
  );

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const acceptOrder = async (orderId, firestoreId) => {
    try {
      const orderRef = doc(db, 'orders', firestoreId);
      await updateDoc(orderRef, { 
        status: 'Pending',
        approvedAt: new Date().toISOString(),
        approvedBy: auth.currentUser.uid
      });
      console.log('Order approved successfully');
    } catch (error) {
      console.error('Error approving order:', error);
    }
  };

  const handleRejectOrder = async (orderId, firestoreId) => {
    try {
      // Update the order status to REJECTED
      const orderRef = doc(db, 'orders', firestoreId);
      await updateDoc(orderRef, {
        status: 'REJECTED',
        rejectedAt: new Date().toISOString(),
        rejectedBy: auth.currentUser.uid
      });

      // Show success message
      alert('Order rejected successfully');
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('Failed to reject order');
    }
  };

  const completeMaintenanceTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'maintenanceTasks', taskId);
      await updateDoc(taskRef, { status: 'Completed' });
      fetchMaintenanceTasks();
    } catch (error) {
      console.error('Error completing maintenance task:', error);
    }
  };

  const renderOrders = () => (
    <div className="orders">
      <h2>Orders</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.firestoreId}>
                <td>{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.type}</td>
                <td>{order.quantity}</td>
                <td>₱{order.amount ? order.amount.toFixed(2) : 'N/A'}</td>
                <td>{new Date(order.date).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${order.status?.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {order.status === 'PENDING_APPROVAL' ? (
                      <>
                        <button 
                          className="accept-btn"
                          onClick={() => acceptOrder(order.id, order.firestoreId)}
                        >
                          <FaCheck /> Accept
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleRejectOrder(order.id, order.firestoreId)}
                        >
                          <FaTimes /> Reject
                        </button>
                      </>
                    ) : (
                      <button 
                        className="view-btn"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <FaEye /> View Details
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedOrder && renderOrderDetails()}
    </div>
  );

  const renderOrderDetails = () => (
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
                <td>₱{selectedOrder.amount ? selectedOrder.amount.toFixed(2) : 'N/A'}</td>
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
                <td>{selectedOrder.address || 'N/A'}</td>
              </tr>
              <tr>
                <th>CONTACT NUMBER:</th>
                <td>{selectedOrder.contactNumber || 'N/A'}</td>
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

  const renderMaintenanceTasks = () => {
    const activeTasks = maintenanceTasks.filter(task => task.status !== 'Completed');
    const completedTasks = maintenanceTasks.filter(task => task.status === 'Completed');

    return (
      <div className="maintenance-section">
        <div className="maintenance-header">
          <h2 className="section-title">Maintenance Tasks Monitor</h2>
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon total">
                <FaClipboardList />
              </div>
              <div className="stat-info">
                <span className="stat-value">{maintenanceTasks.length}</span>
                <span className="stat-label">Total Tasks</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon active">
                <FaTools />
              </div>
              <div className="stat-info">
                <span className="stat-value">{activeTasks.length}</span>
                <span className="stat-label">Active</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon completed">
                <FaCheck />
              </div>
              <div className="stat-info">
                <span className="stat-value">{completedTasks.length}</span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="maintenance-content">
          <div className="tasks-container">
            <div className="active-tasks-section">
              <div className="section-header">
                <h3>Active Tasks</h3>
              </div>
              <div className="tasks-grid">
                {activeTasks.map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-priority">
                      <span className={`priority-indicator ${task.priority.toLowerCase()}`}></span>
                      {task.priority}
                    </div>
                    <h4 className="task-title">{task.equipment}</h4>
                    <p className="task-description">{task.description}</p>
                    <div className="task-meta">
                      <div className="due-date">
                        <FaCalendar />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="task-status">{task.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="completed-tasks-section">
              <div className="section-header">
                <h3>Completed Tasks</h3>
              </div>
              <div className="completed-list">
                {completedTasks.map(task => (
                  <div key={task.id} className="completed-task-item">
                    <div className="completed-task-info">
                      <span className="equipment-name">{task.equipment}</span>
                      <span className="completion-date">
                        {new Date(task.completedAt || task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="completed-description">{task.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteAccount = async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setDeleteConfirmation({ isOpen: false, userId: null, userName: '' });
      // Refresh users list after deletion
      fetchUsers();
    } catch (error) {
      alert(`Error deleting account: ${error.message}`);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );

      // Add user details to Firestore
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        email: newUser.email,
        name: newUser.name,
        jobPosition: newUser.jobPosition,
        employeeId: newUser.employeeId,
        disabled: false,
        createdAt: new Date().toISOString()
      });

      // Reset form and close modal
      setNewUser({
        email: '',
        password: '',
        jobPosition: '',
        name: '',
        employeeId: ''
      });
      setIsCreateUserModalOpen(false);
      fetchUsers();
      alert('User created successfully!');
    } catch (error) {
      alert(`Error creating user: ${error.message}`);
    }
  };

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent successfully!');
    } catch (error) {
      alert(`Error sending password reset email: ${error.message}`);
    }
  };

  return (
    <div className="general-manager">
      <div className="dashboard-container">
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
        <h1 className="dashboard-title">General Manager Dashboard</h1>
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'productionAnalytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('productionAnalytics')}
            >
              <FaChartLine /> Production Analytics
            </button>
            <button 
              className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <FaClipboardList /> Orders
            </button>
            <button 
              className={`tab ${activeTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('maintenance')}
            >
              <FaTools /> Maintenance
            </button>
            <button 
              className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <FaUserCog /> Admin Panel
            </button>
          </div>
        </div>
        <div className="tab-content">
          {activeTab === 'productionAnalytics' && renderProductionAnalytics()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'maintenance' && renderMaintenanceTasks()}
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
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="reset-btn"
                              onClick={() => handleResetPassword(user.email)}
                            >
                              <FaKey /> Reset Password
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                      <option value="General Manager">General Manager</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Plant Manager">Plant Manager</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Plant Supervisor">Plant Supervisor</option>
                      <option value="Office Secretary">Office Secretary</option>
                      <option value="CEO">CEO</option>
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
      </div>
    </div>
  );
}

export default GeneralManager;
