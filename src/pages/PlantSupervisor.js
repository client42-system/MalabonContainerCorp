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
      
      const ordersRef = collection(db, 'orders');
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
        const dateStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        deliveredOrders[dateStr] = 0;
      }
      
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        if (order.deliveredDate) {
          const date = new Date(order.deliveredDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
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
            fill: true,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#3b82f6',
            tension: 0.4
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
        text: 'Daily Production Output',
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
        },
        title: {
          display: true,
          text: 'Quantity Delivered',
          color: '#475569',
          font: {
            size: 13,
            family: "'Segoe UI', sans-serif",
            weight: '600'
          },
          padding: { bottom: 10 }
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
        },
        title: {
          display: true,
          text: 'Date',
          color: '#475569',
          font: {
            size: 13,
            family: "'Segoe UI', sans-serif",
            weight: '600'
          },
          padding: { top: 10 }
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2,
        fill: true
      },
      point: {
        radius: 4,
        hitRadius: 6,
        hoverRadius: 6,
        hoverBorderWidth: 2
      }
    }
  };

  const renderProductionAnalytics = () => (
    <div className="production-analytics">
      <div className="analytics-header">
        <h2>Production Overview</h2>
        <div className="date-range">Last 7 Days</div>
      </div>
      <div className="analytics-grid">
        <div className="graph-wrapper">
          <div className="chart-container">
            {isLoading ? (
              <div className="loading-spinner">Loading production data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : productionData ? (
              <Line options={chartOptions} data={productionData} />
            ) : (
              <div className="no-data-message">No delivery data available</div>
            )}
          </div>
        </div>
        <div className="stats-container">
          <div className="stat-card">
            <h3>Total Delivered</h3>
            <div className="stat-value">
              {productionData ? productionData.datasets[0].data.reduce((a, b) => a + b, 0) : 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Daily Average</h3>
            <div className="stat-value">
              {productionData ? 
                Math.round(productionData.datasets[0].data.reduce((a, b) => a + b, 0) / 7) 
                : 0}
            </div>
          </div>
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
