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
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = fetchOrders();
    fetchMaintenanceTasks();
    fetchProductionData();
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const fetchOrders = () => {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', '!=', 'REJECTED')
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
      console.error('Error fetching orders:', error);
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

  const renderProductionGraph = (data, title) => (
    <div className="chart-container">
      <Line 
        data={{
          ...data,
          datasets: data.datasets.map(dataset => ({
            ...dataset,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: true,
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(0, 'rgba(75, 192, 192, 0.2)');
              gradient.addColorStop(1, 'rgba(75, 192, 192, 0)');
              return gradient;
            }
          }))
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                padding: 20,
                font: {
                  size: 12,
                  weight: 'bold'
                },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            title: {
              display: true,
              text: title,
              font: {
                size: 18,
                weight: 'bold'
              },
              padding: {
                top: 10,
                bottom: 30
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 12
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: '#f0f0f0'
              },
              ticks: {
                font: {
                  size: 12
                }
              }
            }
          },
          elements: {
            line: {
              tension: 0.4
            },
            point: {
              radius: 4,
              hoverRadius: 6,
              backgroundColor: 'white',
              borderWidth: 2
            }
          },
          interaction: {
            mode: null
          }
        }}
      />
    </div>
  );

  const renderProductionAnalytics = () => (
    <div className="production-analytics">
      <h2>Production Analytics</h2>
      <div className="graphs-container">
        {weeklyProductionData && (
          <div className="graph-wrapper">
            {renderProductionGraph(weeklyProductionData, "Weekly Production")}
          </div>
        )}
        {monthlyProductionData && (
          <div className="graph-wrapper">
            {renderProductionGraph(monthlyProductionData, "Monthly Production")}
          </div>
        )}
      </div>
    </div>
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
      await updateDoc(orderRef, { status: 'Accepted' });
      console.log('Order accepted successfully');
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const rejectOrder = async (orderId, firestoreId) => {
    try {
      // Update the order status to REJECTED
      const orderRef = doc(db, 'orders', firestoreId);
      await updateDoc(orderRef, {
        status: 'REJECTED',
        rejectedAt: new Date().toISOString(), // Add rejection timestamp
        rejectedBy: 'General Manager'  // Add who rejected it
      });

      // Update the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.firestoreId === firestoreId 
            ? { ...order, status: 'REJECTED' } 
            : order
        )
      );

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

  const handleRejectOrder = async (order) => {
    try {
      // First, add to archives collection
      const archiveRef = collection(db, 'archives');
      await addDoc(archiveRef, {
        ...order,
        archivedDate: new Date().toISOString(),
        reason: 'REJECTED',
        archivedBy: 'General Manager'
      });

      // Then update the order status
      const orderRef = doc(db, 'orders', order.firestoreId);
      await updateDoc(orderRef, {
        status: 'REJECTED',
        rejectedDate: new Date().toISOString()
      });

      // Refresh the orders list
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
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
                <td>{order.status}</td>
                <td>
                  <div className="action-buttons">
                    {order.status === 'Pending' ? (
                      <>
                        <button onClick={() => acceptOrder(order.id, order.firestoreId)} className="accept-btn">
                          <FaCheck /> Accept
                        </button>
                        <button onClick={() => rejectOrder(order.id, order.firestoreId)} className="reject-btn">
                          <FaTimes /> Reject
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setSelectedOrder(order)} className="view-btn">
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
        </div>
      </div>
    </div>
  );
}

export default GeneralManager;
