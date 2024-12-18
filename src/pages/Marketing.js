import React, { useState, useEffect } from 'react';
import '../pages/Marketing.css'
import { FaShoppingCart, FaUsers, FaFileAlt, FaTimes, FaSignOutAlt, FaPlus, FaMoneyBillWave, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, runTransaction, doc, where, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { onAuthStateChanged } from 'firebase/auth';
import { calculateOrderAmount } from '../utils/priceUtils';

function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState('purchased');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [purchasedOrders, setPurchasedOrders] = useState([]);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer: '',
    type: 'Plain',
    quantity: 0,
    address: '',
    contactNumber: '',
    notes: '',
  });
  const [dataFilter, setDataFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const navigate = useNavigate();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [monthlyOrders, setMonthlyOrders] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPurchasedOrders();
        fetchMonthlyOrders();
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const total = purchasedOrders.reduce((sum, order) => sum + order.quantity, 0);
    setTotalAmount(total);
  }, [purchasedOrders]);

  const fetchPurchasedOrders = async () => {
    console.log("Fetching purchased orders");
    try {
      if (!auth.currentUser) {
        console.error('No authenticated user');
        navigate('/login');
        return;
      }

      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('status', '!=', 'REJECTED')
      );
      
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          firestoreId: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setPurchasedOrders(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.code === 'permission-denied') {
        navigate('/login');
      }
    }
  };

  const fetchMonthlyOrders = async () => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('date', '>=', firstDayOfMonth.toISOString()),
        where('date', '<=', lastDayOfMonth.toISOString()),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({ ...doc.data() }));
      setMonthlyOrders(orders);
    } catch (error) {
      console.error('Error fetching monthly orders:', error);
    }
  };

  const handleViewDetails = (order) => {
    const formattedOrder = {
      ...order,
      amount: order.amount || 'N/A',
      paymentStatus: order.paymentStatus || 'Unpaid',
      paymentDate: order.paymentDate ? new Date(order.paymentDate).toLocaleString() : 'N/A',
      deliveredDate: order.deliveredDate ? new Date(order.deliveredDate).toLocaleString() : 'N/A'
    };
    setSelectedOrder(formattedOrder);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setIsNewOrderModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleNewOrder = async (e) => {
    e.preventDefault();
    console.log("Attempting to create new order:", newOrder);
    try {
      // Get the current counter value
      const counterRef = doc(db, 'counters', 'orderCounter');
      const counterSnap = await getDoc(counterRef);
      
      let newOrderNumber;
      const currentYear = new Date().getFullYear();
      
      if (!counterSnap.exists()) {
        newOrderNumber = 1;
        await setDoc(counterRef, { value: 1, year: currentYear });
      } else {
        const counterData = counterSnap.data();
        if (counterData.year !== currentYear) {
          newOrderNumber = 1;
          await setDoc(counterRef, { value: 1, year: currentYear });
        } else {
          newOrderNumber = counterData.value + 1;
          await updateDoc(counterRef, { value: newOrderNumber });
        }
      }

      const orderID = `${currentYear}-${newOrderNumber.toString().padStart(4, '0')}`;

      // Create the new order document with PENDING_APPROVAL status
      const orderRef = doc(collection(db, 'orders'));
      const amount = await calculateOrderAmount(newOrder.type, parseInt(newOrder.quantity));
      await setDoc(orderRef, {
        id: orderID,
        customer: newOrder.customer,
        type: newOrder.type,
        quantity: parseInt(newOrder.quantity),
        address: newOrder.address,
        contactNumber: newOrder.contactNumber,
        notes: newOrder.notes,
        date: new Date().toISOString(),
        status: 'PENDING_APPROVAL',
        paymentStatus: 'Unpaid',
        amount: amount
      });

      console.log('New order added successfully');
      setIsNewOrderModalOpen(false);
      setNewOrder({
        customer: '',
        type: 'Plain',
        quantity: 0,
        address: '',
        contactNumber: '',
        notes: '',
      });
      fetchPurchasedOrders();
    } catch (error) {
      console.error('Error adding new order:', error);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.message) {
        console.error('Error message:', error.message);
      }
    }
  };

  const filteredOrders = purchasedOrders.filter(order =>
    order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toString().includes(searchTerm)
  );

  const displayedOrders = dataFilter === 'recent' 
    ? purchasedOrders.slice(0, 5) // Show 5 most recent orders
    : searchTerm 
      ? filteredOrders // Show filtered orders when there's a search term
      : purchasedOrders; // Show all orders when no search term and 'All Data' is selected

  const handleOrderSelection = (order) => {
    setSelectedOrders(prevSelected => {
      if (prevSelected.find(o => o.id === order.id)) {
        return prevSelected.filter(o => o.id !== order.id);
      } else {
        return [...prevSelected, order];
      }
    });
  };

  const generateReport = () => {
    const doc = new jsPDF();
    
    // Set font size and style
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');

    // Add company name
    doc.text('Malabon Container Corporation', 105, 15, { align: 'center' });

    // Add title
    doc.setFontSize(18);
    doc.text('Monthly Sales Report', 105, 30, { align: 'center' });

    // Add date range
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    doc.text(`Report for: ${monthYear}`, 14, 40);

    // Calculate total sales
    const totalSales = monthlyOrders.reduce((sum, order) => sum + order.quantity, 0);
    doc.text(`Total Sales: ${totalSales} units`, 14, 50);

    // Prepare data for the table
    const tableColumn = ["Order ID", "Customer", "Type", "Quantity", "Date"];
    const tableRows = monthlyOrders.map(order => [
      order.id,
      order.customer,
      order.type,
      order.quantity,
      new Date(order.date).toLocaleDateString()
    ]);

    // Add the table
    doc.autoTable({
      startY: 60,
      head: [tableColumn],
      body: tableRows,
    });

    // Save the PDF
    doc.save(`MCC_monthly_sales_report_${monthYear}.pdf`);
  };

  const renderCustomerData = () => (
    <div className="customer-data">
      <div className="table-container">
        <table className="customer-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedOrders.length > 0 ? (
              displayedOrders.map((order) => (
                <tr key={order.firestoreId || `${order.id}-${order.date}`}>
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>{order.type}</td>
                  <td>{order.quantity}</td>
                  <td>₱{order.amount ? order.amount.toFixed(2) : 'N/A'}</td>
                  <td>
                    <span className={`status-text ${order.status.toLowerCase().replace(/ /g, '-')}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`payment-status ${order.paymentStatus.toLowerCase()}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="customer-data-placeholder">
                  <p>No orders found. Please try a different search term or add new orders.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Order Details</h2>
            <button className="close-button" onClick={() => setSelectedOrder(null)}>
              <FaTimes />
            </button>
          </div>
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
                  <td>
                    <span className={`status-badge ${selectedOrder.status?.toLowerCase()}`}>
                      {selectedOrder.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>PAYMENT STATUS:</th>
                  <td>
                    <span className={`status-badge ${selectedOrder.paymentStatus?.toLowerCase()}`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </td>
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

  const renderPurchasedOrders = () => (
    <>
      <div className="action-bar">
        <button className="add-order-btn" onClick={() => setIsNewOrderModalOpen(true)}>
          <FaPlus /> New Order
        </button>
      </div>
      <div className="table-container">
        <table className="order-table">
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>CUSTOMER</th>
              <th>TYPE</th>
              <th>QUANTITY</th>
              <th>AMOUNT</th>
              <th>PAYMENT STATUS</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {purchasedOrders.map((order) => (
              <tr key={order.firestoreId || `${order.id}-${order.date}`}>
                <td>{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.type}</td>
                <td>{order.quantity}</td>
                <td>₱{order.amount ? order.amount.toFixed(2) : 'N/A'}</td>
                <td>
                  <span className={`status-badge ${order.paymentStatus?.toLowerCase() || 'unpaid'}`}>
                    {order.paymentStatus || 'UNPAID'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${order.status?.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>{new Date(order.date).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons-container">
                    <button className="view-btn" onClick={() => handleViewDetails(order)}>
                      <FaEye /> View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )

  return (
    <div className="marketing">
      <button className="logout-button" onClick={handleLogout}>
        <FaSignOutAlt /> Logout
      </button>
      <h1 className="marketing-dashboard-title">Marketing Dashboard</h1>
      
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'purchased' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchased')}
          >
            <FaShoppingCart /> Purchased Orders
          </button>
          <button 
            className={`tab ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer')}
          >
            <FaUsers /> Customer Data
          </button>
        </div>
      </div>
      
      <p className="orders-description">Manage and view purchase orders</p>
      
      <h2 className="purchased-orders-title">Purchased Orders</h2>
      
      {activeTab === 'purchased' && renderPurchasedOrders()}
      {activeTab === 'customer' && renderCustomerData()}

      {selectedOrder && renderOrderDetails()}

      {isNewOrderModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content new-order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Order</h2>
              <button className="close-button" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleNewOrder} className="new-order-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="customer">Customer Name</label>
                  <input
                    type="text"
                    id="customer"
                    value={newOrder.customer}
                    onChange={(e) => setNewOrder({...newOrder, customer: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contactNumber">Contact Number</label>
                  <input
                    type="tel"
                    id="contactNumber"
                    value={newOrder.contactNumber}
                    onChange={(e) => setNewOrder({...newOrder, contactNumber: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="type">Product Type</label>
                  <select
                    id="type"
                    value={newOrder.type}
                    onChange={(e) => setNewOrder({...newOrder, type: e.target.value})}
                    required
                  >
                    <option value="Plain">Plain</option>
                    <option value="Lithograph">Lithograph</option>
                    <option value="Class C">Class C</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({...newOrder, quantity: parseInt(e.target.value)})}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Delivery Address</label>
                <input
                  type="text"
                  id="address"
                  value={newOrder.address}
                  onChange={(e) => setNewOrder({...newOrder, address: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Additional Notes</label>
                <textarea
                  id="notes"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                  placeholder="Enter any special instructions or notes here..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  <FaPlus /> Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingDashboard;

