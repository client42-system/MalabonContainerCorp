import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaChartLine, FaMoneyBillWave, FaTruck, FaCog } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  PieController,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import './CEO.css';

// Register all required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  PieController,
  Title,
  Tooltip,
  Legend
);

export default function CEO() {
  // State declarations
  const [activeTab, setActiveTab] = useState('predictions');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState({
    monthlyRevenue: Array(12).fill(0),
    productTypeSales: [0, 0, 0]
  });
  const [productionData, setProductionData] = useState({
    efficiency: Array(12).fill(0),
    volumeByType: [0, 0, 0]
  });
  const [maintenanceData, setMaintenanceData] = useState({
    issuesByPriority: [0, 0, 0],
    monthlyTasks: {
      completed: Array(12).fill(0),
      pending: Array(12).fill(0)
    }
  });
  const [predictiveAnalytics, setPredictiveAnalytics] = useState({
    orderTrends: {
      plain: Array(12).fill(0),
      lithograph: Array(12).fill(0),
      classC: Array(12).fill(0)
    },
    seasonalTrends: {
      Q1: { orders: 0, value: 0, avgOrderSize: 0 },
      Q2: { orders: 0, value: 0, avgOrderSize: 0 },
      Q3: { orders: 0, value: 0, avgOrderSize: 0 },
      Q4: { orders: 0, value: 0, avgOrderSize: 0 }
    },
    peakPeriods: {
      volume: [],
      value: []
    },
    frequentCustomers: [],
    bulkOrders: [],
    metrics: {
      avgOrderValue: 0,
      totalOrders: 0,
      totalValue: 0,
      avgMonthlyVolume: 0
    }
  });

  const navigate = useNavigate();

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  };

  const fetchSalesData = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const querySnapshot = await getDocs(ordersRef);
      const orders = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Process sales data
      const monthlyRevenue = Array(12).fill(0);
      const productTypeSales = { plain: 0, lithograph: 0, classC: 0 };

      orders.forEach(order => {
        const month = new Date(order.date).getMonth();
        monthlyRevenue[month] += order.amount || 0;

        const type = order.type?.toLowerCase() || 'plain';
        if (type.includes('plain')) productTypeSales.plain += order.quantity || 0;
        else if (type.includes('lithograph')) productTypeSales.lithograph += order.quantity || 0;
        else if (type.includes('class c')) productTypeSales.classC += order.quantity || 0;
      });

      setSalesData({
        monthlyRevenue,
        productTypeSales: Object.values(productTypeSales)
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const fetchProductionData = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      const orders = ordersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      const maintenanceRef = collection(db, 'maintenanceTasks');
      const maintenanceSnapshot = await getDocs(maintenanceRef);
      const maintenanceTasks = maintenanceSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      const efficiency = Array(12).fill(0);
      const volumeByType = { plain: 0, lithograph: 0, classC: 0 };
      const workingDaysPerMonth = 22;
      const targetOutputPerDay = 1000;

      orders.forEach(order => {
        const month = new Date(order.date).getMonth();
        const actualOutput = order.quantity || 0;
        const targetOutput = targetOutputPerDay * workingDaysPerMonth;
        efficiency[month] = Math.min((actualOutput / targetOutput) * 100, 100);

        const type = order.type?.toLowerCase() || 'plain';
        if (type.includes('plain')) volumeByType.plain += order.quantity || 0;
        else if (type.includes('lithograph')) volumeByType.lithograph += order.quantity || 0;
        else if (type.includes('class c')) volumeByType.classC += order.quantity || 0;
      });

      maintenanceTasks.forEach(task => {
        if (task.status === 'Completed') {
          const month = new Date(task.date).getMonth();
          efficiency[month] = Math.max(efficiency[month] - 2, 0);
        }
      });

      setProductionData({
        efficiency,
        volumeByType: Object.values(volumeByType)
      });
    } catch (error) {
      console.error('Error fetching production data:', error);
    }
  };

  const fetchMaintenanceData = async () => {
    try {
      const maintenanceRef = collection(db, 'maintenanceTasks');
      const querySnapshot = await getDocs(maintenanceRef);
      const tasks = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      const issuesByPriority = { high: 0, medium: 0, low: 0 };
      const monthlyTasks = {
        completed: Array(12).fill(0),
        pending: Array(12).fill(0)
      };

      tasks.forEach(task => {
        const priority = task.priority?.toLowerCase() || 'medium';
        issuesByPriority[priority]++;

        const month = new Date(task.date || task.dueDate).getMonth();
        if (task.status?.toLowerCase() === 'completed') {
          monthlyTasks.completed[month]++;
        } else {
          monthlyTasks.pending[month]++;
        }
      });

      setMaintenanceData({
        issuesByPriority: Object.values(issuesByPriority),
        monthlyTasks
      });
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchPredictiveAnalytics(),
          fetchSalesData(),
          fetchProductionData(),
          fetchMaintenanceData()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const fetchPredictiveAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const ordersRef = collection(db, 'orders');
      const querySnapshot = await getDocs(ordersRef);
      
      const orders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Calculate total amount based on quantity and a base price
        const basePrice = 100; // Example base price per unit
        const calculatedAmount = Number(data.quantity) * basePrice;

        return {
          id: doc.id,
          ...data,
          date: new Date(data.date),
          status: data.status || '',
          customer: data.customer || '',
          quantity: Number(data.quantity) || 0,
          type: data.type || 'Plain',
          totalAmount: calculatedAmount
        };
      });

      // Initialize tracking variables
      const monthlyOrders = Array(12).fill(0);
      const monthlyRevenue = Array(12).fill(0);
      const ordersByType = {
        plain: Array(12).fill(0),
        lithograph: Array(12).fill(0),
        classC: Array(12).fill(0)
      };
      
      let totalValue = 0;
      const totalOrders = orders.length;
      const customerFrequency = {};

      // Process orders
      orders.forEach(order => {
        const month = order.date.getMonth();
        const amount = order.totalAmount;
        const type = (order.type || '').toLowerCase();
        const quantity = Number(order.quantity) || 0;

        monthlyOrders[month]++;
        monthlyRevenue[month] += amount;
        totalValue += amount;

        if (type.includes('plain')) ordersByType.plain[month] += quantity;
        else if (type.includes('lithograph')) ordersByType.lithograph[month] += quantity;
        else if (type.includes('class c')) ordersByType.classC[month] += quantity;

        if (order.customer) {
          customerFrequency[order.customer] = (customerFrequency[order.customer] || 0) + 1;
        }
      });

      // Calculate final metrics
      const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
      const avgMonthlyVolume = totalOrders > 0 ? totalOrders / 12 : 0;

      setPredictiveAnalytics({
        orderTrends: ordersByType,
        seasonalTrends: {
          Q1: calculateQuarterMetrics(orders, 0),
          Q2: calculateQuarterMetrics(orders, 3),
          Q3: calculateQuarterMetrics(orders, 6),
          Q4: calculateQuarterMetrics(orders, 9)
        },
        peakPeriods: {
          volume: findPeakPeriods(monthlyOrders),
          value: findPeakPeriods(monthlyRevenue)
        },
        frequentCustomers: Object.entries(customerFrequency)
          .map(([customer, frequency]) => ({ customer, frequency }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 5),
        bulkOrders: orders
          .filter(order => order.quantity > 1000)
          .map(order => ({
            date: order.date.toLocaleDateString(),
            customer: order.customer || 'Unknown',
            type: order.type || 'Plain',
            quantity: order.quantity || 0
          }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5),
        metrics: {
          avgOrderValue,
          totalOrders,
          totalValue,
          avgMonthlyVolume
        }
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  // Define renderChart before using it
  const renderChart = (type, data, options, id) => {
    return (
      <div className="chart-container">
        {type === 'line' && (
          <Line 
            id={id}
            data={data}
            options={options}
          />
        )}
        {type === 'bar' && (
          <Bar 
            id={id}
            data={data}
            options={options}
          />
        )}
        {type === 'pie' && (
          <Pie 
            id={id}
            data={data}
            options={options}
          />
        )}
      </div>
    );
  };

  const renderPredictiveAnalytics = () => {
    if (isLoading) return <div className="loading-state">Loading analytics...</div>;
    if (error) return <div className="error-state">{error}</div>;
    if (!predictiveAnalytics) return null;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
      <div className="predictive-analytics">
        {/* Summary Metrics */}
        <div className="analytics-card summary-metrics">
          <h3>Key Metrics</h3>
          <div className="metrics-grid">
            <div className="metric">
              <label>Total Orders</label>
              <span className="metric-value">{predictiveAnalytics?.metrics?.totalOrders?.toLocaleString() || '0'}</span>
            </div>
            <div className="metric">
              <label>Average Order Value</label>
              <span className="metric-value">₱{predictiveAnalytics?.metrics?.avgOrderValue?.toLocaleString(undefined, {maximumFractionDigits: 2}) || '0'}</span>
            </div>
            <div className="metric">
              <label>Average Monthly Volume</label>
              <span className="metric-value">{predictiveAnalytics?.metrics?.avgMonthlyVolume?.toLocaleString(undefined, {maximumFractionDigits: 0}) || '0'}</span>
            </div>
          </div>
        </div>

        {/* Order Trends */}
        {predictiveAnalytics?.orderTrends && (
          <div className="analytics-card">
            <h3>Order Trends</h3>
            <div className="chart-container">
              <Line
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: 'Plain',
                      data: predictiveAnalytics.orderTrends.plain || Array(12).fill(0),
                      borderColor: '#3498db',
                      tension: 0.4
                    },
                    {
                      label: 'Lithograph',
                      data: predictiveAnalytics.orderTrends.lithograph || Array(12).fill(0),
                      borderColor: '#e74c3c',
                      tension: 0.4
                    },
                    {
                      label: 'Class C',
                      data: predictiveAnalytics.orderTrends.classC || Array(12).fill(0),
                      borderColor: '#2ecc71',
                      tension: 0.4
                    }
                  ]
                }}
                options={chartOptions}
              />
            </div>
          </div>
        )}

        {/* Peak Periods */}
        {predictiveAnalytics?.peakPeriods?.volume && predictiveAnalytics.peakPeriods.volume.length > 0 && (
          <div className="analytics-card">
            <h3>Peak Periods</h3>
            <div className="peak-periods-grid">
              <div className="peak-volume">
                <h4>Volume Peaks</h4>
                {predictiveAnalytics.peakPeriods.volume.map((period, index) => (
                  <div key={index} className="peak-item">
                    <span>{period.month}</span>
                    <span>{period.value?.toLocaleString() || '0'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Orders */}
        {predictiveAnalytics?.bulkOrders && predictiveAnalytics.bulkOrders.length > 0 && (
          <div className="analytics-card">
            <h3>Significant Bulk Orders</h3>
            <div className="bulk-orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {predictiveAnalytics.bulkOrders.map((order, index) => (
                    <tr key={index}>
                      <td>{order.date || 'N/A'}</td>
                      <td>{order.customer || 'N/A'}</td>
                      <td>{order.type || 'N/A'}</td>
                      <td>{order.quantity?.toLocaleString() || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSalesAnalytics = () => (
    <div className="analytics-section">
      <div className="analytics-card">
        <h3>Monthly Sales Revenue</h3>
        <div className="chart-container">
          <Line 
            id="sales-revenue-chart"
            data={{
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              datasets: [
                {
                  label: 'Revenue',
                  data: salesData?.monthlyRevenue || Array(12).fill(0),
                  borderColor: '#2ecc71',
                  tension: 0.4
                }
              ]
            }}
            options={chartOptions}
          />
        </div>
      </div>

      <div className="analytics-card">
        <h3>Sales by Product Type</h3>
        <div className="chart-container">
          <Bar 
            id="sales-by-type-chart"
            data={{
              labels: ['Plain', 'Lithograph', 'Class C'],
              datasets: [{
                label: 'Sales Volume',
                data: salesData?.productTypeSales || [0, 0, 0],
                backgroundColor: ['#3498db', '#e74c3c', '#f1c40f']
              }]
            }}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  );

  const renderProductionAnalytics = () => (
    <div className="analytics-section">
      <div className="analytics-card">
        <h3>Production Efficiency</h3>
        <div className="chart-container">
          <Line 
            id="production-efficiency-chart"
            data={{
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              datasets: [
                {
                  label: 'Efficiency Rate',
                  data: productionData?.efficiency || Array(12).fill(0),
                  borderColor: '#3498db',
                  tension: 0.4
                }
              ]
            }}
            options={chartOptions}
          />
        </div>
      </div>

      <div className="analytics-card">
        <h3>Production Volume by Type</h3>
        <div className="chart-container">
          <Bar 
            id="production-volume-chart"
            data={{
              labels: ['Plain', 'Lithograph', 'Class C'],
              datasets: [{
                label: 'Production Volume',
                data: productionData?.volumeByType || [0, 0, 0],
                backgroundColor: ['#2ecc71', '#9b59b6', '#e67e22']
              }]
            }}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  );

  const renderMaintenanceAnalytics = () => (
    <div className="analytics-section">
      <div className="analytics-card">
        <h3>Maintenance Issues by Priority</h3>
        <div className="chart-container">
          <Pie
            id="maintenance-priority-chart"
            data={{
              labels: ['High', 'Medium', 'Low'],
              datasets: [{
                data: maintenanceData?.issuesByPriority || [0, 0, 0],
                backgroundColor: ['#e74c3c', '#f1c40f', '#2ecc71']
              }]
            }}
            options={{
              ...chartOptions,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right'
                }
              }
            }}
          />
        </div>
      </div>

      <div className="analytics-card">
        <h3>Monthly Maintenance Tasks</h3>
        <div className="chart-container">
          <Line 
            id="maintenance-tasks-chart"
            data={{
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              datasets: [
                {
                  label: 'Completed Tasks',
                  data: maintenanceData?.monthlyTasks?.completed || Array(12).fill(0),
                  borderColor: '#2ecc71',
                  tension: 0.4
                },
                {
                  label: 'Pending Tasks',
                  data: maintenanceData?.monthlyTasks?.pending || Array(12).fill(0),
                  borderColor: '#e74c3c',
                  tension: 0.4
                }
              ]
            }}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  );

  // Helper function to calculate quarterly metrics
  const calculateQuarterMetrics = (orders, startMonth) => {
    const quarterOrders = orders.filter(order => {
      const month = order.date.getMonth();
      return month >= startMonth && month < startMonth + 3;
    });

    const totalOrders = quarterOrders.length;
    const totalValue = quarterOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const avgOrderSize = totalOrders > 0 ? totalValue / totalOrders : 0;

    return {
      orders: totalOrders,
      value: totalValue,
      avgOrderSize
    };
  };

  // Helper function to find peak periods
  const findPeakPeriods = (data) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return data
      .map((value, index) => ({
        month: months[index],
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  };

  return (
    <div className="ceo">
      <div className="dashboard-container">
        <h1 className="dashboard-title">CEO Dashboard</h1>
        
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>

        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'predictions' ? 'active' : ''}`}
              onClick={() => setActiveTab('predictions')}
            >
              <FaChartLine /> Predictive Analytics
            </button>

            <button 
              className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <FaMoneyBillWave /> Sales Analytics
            </button>

            <button 
              className={`tab ${activeTab === 'production' ? 'active' : ''}`}
              onClick={() => setActiveTab('production')}
            >
              <FaTruck /> Production Analytics
            </button>

            <button 
              className={`tab ${activeTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('maintenance')}
            >
              <FaCog /> Maintenance Analytics
            </button>
          </div>
        </div>

        {activeTab === 'predictions' && renderPredictiveAnalytics()}
        {activeTab === 'sales' && renderSalesAnalytics()}
        {activeTab === 'production' && renderProductionAnalytics()}
        {activeTab === 'maintenance' && renderMaintenanceAnalytics()}
      </div>
    </div>
  );
}