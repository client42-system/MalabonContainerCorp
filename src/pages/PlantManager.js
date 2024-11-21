import React, { useState, useEffect } from 'react'
import '../pages/PlantManager.css'
import { FaSignOutAlt, FaEye, FaTruck, FaClipboardList, FaCheck, FaShippingFast, FaFlag } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebaseConfig'
import { collection, getDocs, doc, updateDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore'

export default function PlantManagerDashboard() {
  const [activeTab, setActiveTab] = useState('acceptedOrders')
  const [acceptedOrders, setAcceptedOrders] = useState([])
  const [completedOrders, setCompletedOrders] = useState([])
  const [outForDeliveryOrders, setOutForDeliveryOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false)
  const [schedulingData, setSchedulingData] = useState({
    deliveryDate: '',
    selectedOrder: null
  })
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate()

  useEffect(() => {
    console.log('PlantManager component mounted');
    const unsubscribe = setupRealtimeListeners();
    return () => unsubscribe();
  }, []);

  const setupRealtimeListeners = () => {
    const ordersRef = collection(db, 'orders');
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).toISOString();
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

    // Create a single listener for all order statuses
    const q = query(
      ordersRef,
      where('date', '>=', startOfYear),
      where('date', '<=', endOfYear),
      orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({
        ...doc.data(),
        firestoreId: doc.id,
        id: doc.data().id || doc.id
      }));

      // Filter orders based on their status
      setAcceptedOrders(allOrders.filter(order => order.status === 'Pending'));
      setCompletedOrders(allOrders.filter(order => order.status === 'COMPLETED'));
      setOutForDeliveryOrders(allOrders.filter(order => order.status === 'OUT_FOR_DELIVERY'));
      
      setIsLoading(false);
    }, (error) => {
      console.error('Error setting up real-time listeners:', error);
      setIsLoading(false);
    });
  };

  const handleCompleteOrder = async (order) => {
    try {
      const orderRef = doc(db, 'orders', order.firestoreId);
      await updateDoc(orderRef, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        completedBy: auth.currentUser.uid
      });
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const handleScheduleDelivery = async (order) => {
    try {
      const orderRef = doc(db, 'orders', order.firestoreId);
      await updateDoc(orderRef, {
        status: 'OUT_FOR_DELIVERY',
        scheduledDeliveryDate: schedulingData.deliveryDate,
        updatedAt: new Date().toISOString()
      });
      setIsSchedulingModalOpen(false);
      setSchedulingData({ deliveryDate: '', selectedOrder: null });
    } catch (error) {
      console.error('Error scheduling delivery:', error);
    }
  };

  const handleDelivered = async (order) => {
    try {
      const orderRef = doc(db, 'orders', order.firestoreId);
      await updateDoc(orderRef, {
        status: 'DELIVERED',
        deliveredDate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking order as delivered:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleViewDetails = (order) => {
    setSelectedOrder(order)
  }

  const handleSchedulingSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!schedulingData.selectedOrder || !schedulingData.selectedOrder.firestoreId) {
        console.error('Selected order or Firestore ID is missing');
        return;
      }
      const orderRef = doc(db, 'orders', schedulingData.selectedOrder.firestoreId);
      await updateDoc(orderRef, {
        deliveryDate: schedulingData.deliveryDate,
        status: 'OUT_FOR_DELIVERY',
        updatedAt: new Date().toISOString()
      });

      setIsSchedulingModalOpen(false);
      setSchedulingData({ deliveryDate: '', selectedOrder: null });
    } catch (error) {
      console.error('Error scheduling delivery:', error);
    }
  }

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
          <h2>Order Details</h2>
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
  };

  const renderAcceptedOrders = () => {
    try {
      return (
        <div className="orders-table">
          {isLoading ? (
            <div className="loading-message">Loading orders...</div>
          ) : acceptedOrders?.length === 0 ? (
            <div className="no-orders-message">No accepted orders found</div>
          ) : !acceptedOrders ? (
            <div className="error-message">Error loading orders</div>
          ) : (
            <table className="order-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {acceptedOrders.map((order) => {
                  console.log('Rendering order:', order); // Debug log
                  return (
                    <tr key={order.firestoreId || order.id}>
                      <td>{order.id}</td>
                      <td>{order.customer}</td>
                      <td>{order.type}</td>
                      <td>{order.quantity}</td>
                      <td>
                        <span className={`status-badge ${(order.status || '').toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="complete-btn" 
                            onClick={() => handleCompleteOrder(order)}
                          >
                            <FaCheck /> Complete
                          </button>
                          <button 
                            className="view-btn" 
                            onClick={() => setSelectedOrder(order)}
                          >
                            <FaEye /> View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error rendering accepted orders:', error);
      return <div className="error-message">Error rendering orders: {error.message}</div>;
    }
  };

  const renderCompletedOrders = () => (
    <div className="orders-table">
      <table className="order-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {completedOrders.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customer}</td>
              <td>{order.type}</td>
              <td>{order.quantity}</td>
              <td>
                <span className={`status-badge ${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button className="schedule-btn" onClick={() => {
                    setSchedulingData({ ...schedulingData, selectedOrder: order });
                    setIsSchedulingModalOpen(true);
                  }}>
                    <FaTruck /> Schedule
                  </button>
                  <button className="view-btn" onClick={() => setSelectedOrder(order)}>
                    <FaEye /> View Details
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOutForDeliveryOrders = () => (
    <div className="orders-table">
      <table className="order-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {outForDeliveryOrders.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customer}</td>
              <td>{order.type}</td>
              <td>{order.quantity}</td>
              <td>
                <span className={`status-badge ${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button className="complete-btn" onClick={() => handleDelivered(order)}>
                    <FaCheck /> Mark as Delivered
                  </button>
                  <button className="view-btn" onClick={() => setSelectedOrder(order)}>
                    <FaEye /> View Details
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="plant-manager">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Plant Manager Dashboard</h1>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'acceptedOrders' ? 'active' : ''}`}
              onClick={() => setActiveTab('acceptedOrders')}
            >
              <FaClipboardList /> Accepted Orders
            </button>
            <button 
              className={`tab ${activeTab === 'completedOrders' ? 'active' : ''}`}
              onClick={() => setActiveTab('completedOrders')}
            >
              <FaCheck /> Completed Orders
            </button>
            <button 
              className={`tab ${activeTab === 'outForDeliveryOrders' ? 'active' : ''}`}
              onClick={() => setActiveTab('outForDeliveryOrders')}
            >
              <FaShippingFast /> Out for Delivery
            </button>
          </div>
        </div>
        <div className="tab-content">
          {activeTab === 'acceptedOrders' && renderAcceptedOrders()}
          {activeTab === 'completedOrders' && renderCompletedOrders()}
          {activeTab === 'outForDeliveryOrders' && renderOutForDeliveryOrders()}
        </div>
        {selectedOrder && renderOrderDetails()}
        {isSchedulingModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content schedule-modal">
              <h2>Schedule Delivery for Order {schedulingData.selectedOrder.id}</h2>
              <form onSubmit={handleSchedulingSubmit}>
                <div className="form-group">
                  <label htmlFor="deliveryDate">Delivery Date:</label>
                  <input
                    type="date"
                    id="deliveryDate"
                    value={schedulingData.deliveryDate}
                    onChange={(e) => setSchedulingData({...schedulingData, deliveryDate: e.target.value})}
                    required
                  />
                </div>
                <div className="button-group">
                  <button type="submit" className="button">Schedule</button>
                  <button 
                    type="button" 
                    className="button button-secondary" 
                    onClick={() => setIsSchedulingModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
