import React, { useState, useEffect } from 'react'
import '../pages/PlantManager.css'
import { FaSignOutAlt, FaEye, FaTruck, FaClipboardList, FaCheck, FaShippingFast, FaFlag } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebaseConfig'
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore'

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
  const navigate = useNavigate()

  useEffect(() => {
    console.log('PlantManager component mounted');
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('status', 'in', ['Pending', 'Accepted', 'COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED']),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firestoreId: doc.id
      }));

      // Filter orders based on status
      const accepted = orders.filter(order => order.status === 'Pending');
      const completed = orders.filter(order => order.status === 'COMPLETED');
      const outForDelivery = orders.filter(order => order.status === 'OUT_FOR_DELIVERY');

      setAcceptedOrders(accepted);
      setCompletedOrders(completed);
      setOutForDeliveryOrders(outForDelivery);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleCompleteOrder = async (order) => {
    try {
      const orderRef = doc(db, 'orders', order.firestoreId);
      await updateDoc(orderRef, {
        status: 'COMPLETED',
        completedDate: new Date().toISOString()
      });
      fetchOrders(); // This will update all order lists
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
      fetchOrders(); // Refresh the orders list
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
      fetchOrders(); // This will update all order lists
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
        status: 'Out for Delivery'
      });

      setIsSchedulingModalOpen(false);
      fetchOrders(); // Replace the two function calls with just fetchOrders
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

  const renderAcceptedOrders = () => (
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
          {acceptedOrders.map((order) => (
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
                  <button className="complete-btn" onClick={() => handleCompleteOrder(order)}>
                    <FaCheck /> Complete
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
