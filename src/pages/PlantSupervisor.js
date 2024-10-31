import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaTools, FaChartLine, FaExclamationTriangle, FaCheck, FaTimes, FaPlus, FaCalendar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc, limit, getDoc, deleteDoc } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import './PlantSupervisor.css';

export default function PlantSupervisor() {
  const [activeTab, setActiveTab] = useState('maintenance');
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [productionData, setProductionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTask, setNewTask] = useState({
    equipment: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchMaintenanceTasks();
    fetchProductionData();
    fetchAlerts();
  }, []);

  const fetchMaintenanceTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tasksRef = collection(db, 'maintenanceTasks');
      const q = query(
        tasksRef,
        where('status', '!=', 'Completed'),
        orderBy('status'),
        orderBy('dueDate'),
        orderBy('__name__')
      );
      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaintenanceTasks(tasks);
    } catch (error) {
      console.error('Error fetching maintenance tasks:', error);
      setError('Failed to load maintenance tasks. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductionData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const ordersRef = collection(db, 'orders');
      // Simplified query that doesn't require a composite index
      const q = query(
        ordersRef,
        where('status', '==', 'DELIVERED')
      );
      
      const querySnapshot = await getDocs(q);
      const deliveredOrders = {};
      
      // Initialize data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString();
        deliveredOrders[dateStr] = 0;
      }
      
      // Process delivered orders and sort in memory
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        if (order.deliveredDate) {
          const date = new Date(order.deliveredDate).toLocaleDateString();
          if (deliveredOrders[date] !== undefined) {
            deliveredOrders[date] += Number(order.quantity) || 0;
          }
        }
      });

      // Format data for the chart
      setProductionData({
        labels: Object.keys(deliveredOrders),
        datasets: [
          {
            label: 'Delivered Orders',
            data: Object.values(deliveredOrders),
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.1
          }
        ]
      });

    } catch (error) {
      console.error('Error fetching production data:', error);
      setError('Failed to load production data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const alertsRef = collection(db, 'maintenanceAlerts');
      const q = query(alertsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedAlerts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(fetchedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError('Failed to load maintenance alerts');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const tasksRef = collection(db, 'maintenanceTasks');
      await addDoc(tasksRef, {
        ...newTask,
        status: 'Pending',
        createdAt: new Date(),
        assignedBy: auth.currentUser.uid
      });
      setIsModalOpen(false);
      setNewTask({
        equipment: '',
        description: '',
        priority: 'medium',
        dueDate: ''
      });
      fetchMaintenanceTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'maintenanceTasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
        throw new Error('Task not found');
      }

      const taskData = taskSnap.data();
      const completedAt = new Date().toISOString();

      // Create archive entry with all necessary fields
      const archiveRef = collection(db, 'archivedMaintenance');
      await addDoc(archiveRef, {
        equipment: taskData.equipment,
        description: taskData.description,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        status: 'Completed',
        completedAt: completedAt,
        originalTaskId: taskId,
        createdAt: taskData.createdAt || completedAt,
        completedBy: auth.currentUser.uid,
        completedByName: auth.currentUser.displayName || 'Plant Supervisor'
      });

      // Delete the original task
      await deleteDoc(taskRef);

      // Refresh the maintenance tasks list
      fetchMaintenanceTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      setError('Failed to complete task. Please try again.');
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      const alertRef = doc(db, 'maintenanceAlerts', alertId);
      await updateDoc(alertRef, {
        status: 'dismissed',
        dismissedAt: new Date()
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error dismissing alert:', error);
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Delivered Orders (Last 7 Days)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantity Delivered'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  const renderProductionAnalytics = () => (
    <div className="production-analytics">
      <div className="graph-wrapper">
        <h3>Delivered Orders Analytics</h3>
        <div className="chart-container">
          {isLoading ? (
            <p>Loading production data...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : productionData ? (
            <Line options={chartOptions} data={productionData} />
          ) : (
            <p>No delivery data available</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="plant-supervisor">
      <div className="dashboard-container">
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
        
        <h1 className="dashboard-title">Plant Supervisor Dashboard</h1>
        
        <div className="alerts-container">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.priority}`}>
              <FaExclamationTriangle className="alert-icon" />
              <div className="alert-content">
                <h3>{alert.title}</h3>
                <p>{alert.description}</p>
              </div>
              <button onClick={() => handleDismissAlert(alert.id)} className="dismiss-btn">
                <FaTimes />
              </button>
            </div>
          ))}
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <FaTools /> Maintenance Tasks
          </button>
          <button 
            className={`tab ${activeTab === 'production' ? 'active' : ''}`}
            onClick={() => setActiveTab('production')}
          >
            <FaChartLine /> Production Analytics
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'maintenance' && (
            <div className="maintenance-section">
              <div className="section-header">
                <h2>Maintenance Tasks</h2>
                <button className="add-task-btn" onClick={() => setIsModalOpen(true)}>
                  <FaPlus /> New Task
                </button>
              </div>
              
              {isLoading && (
                <div className="loading-state">
                  <p>Loading maintenance tasks...</p>
                </div>
              )}
              
              {error && (
                <div className="error-state">
                  <p>{error}</p>
                </div>
              )}
              
              {!isLoading && !error && (
                <div className="tasks-grid">
                  {maintenanceTasks.map(task => (
                    <div key={task.id} className="task-card">
                      <div className="task-header">
                        <h3 className="task-title">{task.equipment}</h3>
                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      <p className="task-description">{task.description}</p>
                      
                      <div className="task-meta">
                        <div className="task-due-date">
                          <FaCalendar />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      </div>

                      <button 
                        className="complete-btn"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        <FaCheck /> Mark Complete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'production' && (
            renderProductionAnalytics()
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create New Maintenance Task</h2>
            <form onSubmit={handleCreateTask}>
              <input
                type="text"
                placeholder="Equipment Name"
                value={newTask.equipment}
                onChange={(e) => setNewTask({...newTask, equipment: e.target.value})}
                required
              />
              <textarea
                placeholder="Task Description"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                required
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
