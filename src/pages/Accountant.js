import React, { useState, useEffect } from 'react'
import '../pages/Accountant.css'
import { FaSignOutAlt, FaExchangeAlt, FaFileInvoiceDollar, FaExclamationTriangle, FaTimes, FaEye, FaMoneyBillWave, FaCheck } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebaseConfig'
import { collection, getDocs, query, where, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore'
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

export default function AccountantDashboard() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, order: null, amountPaid: '' });
  const [confirmPayment, setConfirmPayment] = useState({ show: false, order: null });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedOrders = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firestoreId: doc.id,
        paymentStatus: doc.data().paymentStatus || 'UNPAID'
      }));
      
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      setError(`Failed to log out. Error: ${error.message}`)
    }
  }

  const generateReport = async () => {
    if (!selectedOrder) {
      setError('Please select an order to generate a report.');
      return;
    }

    if (typeof selectedOrder.amount !== 'number') {
      setShowWarningModal(true);
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150],
        margins: { top: 5, right: 5, bottom: 5, left: 5 }
      });

      // Set initial y position
      let y = 10;
      const leftCol = 8;
      const rightCol = doc.internal.pageSize.width - 8;

      // Company name and details
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("MALABON CONTAINER CORPORATION", doc.internal.pageSize.width / 2, y, { align: "center" });
      
      y += 4;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("123 Sample Street, Malabon City", doc.internal.pageSize.width / 2, y, { align: "center" });
      
      y += 3;
      doc.text("Tel: (02) 1234-5678", doc.internal.pageSize.width / 2, y, { align: "center" });
      
      // Modern divider
      y += 6;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(5, y, doc.internal.pageSize.width - 5, y);

      // Receipt title
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", doc.internal.pageSize.width / 2, y, { align: "center" });

      // Order Details
      y += 8;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");

      // Date and Order ID
      doc.setFont("helvetica", "bold");
      doc.text("DATE", leftCol, y);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString(), rightCol, y, { align: "right" });
      
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("ORDER ID", leftCol, y);
      doc.setFont("helvetica", "normal");
      doc.text(selectedOrder.id, rightCol, y, { align: "right" });

      // Customer Details Section
      y += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER DETAILS", leftCol, y);
      
      y += 4;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Customer Name:", leftCol, y);
      doc.text(selectedOrder.customer || 'N/A', rightCol, y, { align: "right" });
      
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.text("Contact Number:", leftCol, y);
      doc.text(selectedOrder.contactNumber || 'N/A', rightCol, y, { align: "right" });
      
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.text("Delivery Address:", leftCol, y);
      // Handle long addresses by wrapping text
      const maxWidth = 45;
      const addressLines = doc.splitTextToSize(selectedOrder.address || 'N/A', maxWidth);
      doc.text(addressLines, rightCol, y, { align: "right" });
      y += (addressLines.length * 3);
      
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.text("Notes:", leftCol, y);
      const notesLines = doc.splitTextToSize(selectedOrder.notes || 'N/A', maxWidth);
      doc.text(notesLines, rightCol, y, { align: "right" });
      y += (notesLines.length * 3);

      // Add some extra spacing before the order details table
      y += 4;

      // Order Details Table
      y += 8;
      doc.autoTable({
        startY: y,
        head: [["ITEM", "QTY", "AMOUNT"]],
        body: [[
          selectedOrder.type,
          selectedOrder.quantity,
          selectedOrder.amount.toLocaleString()
        ]],
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [51, 51, 51],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
        },
        theme: 'grid',
        margin: { left: 5, right: 5 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 25, halign: 'right' }
        }
      });

      // Total amount
      y = doc.autoTable.previous.finalY + 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL AMOUNT:", leftCol, y);
      doc.text(selectedOrder.amount.toLocaleString(), rightCol, y, { align: "right" });

      // Simple footer
      y += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(5, y, doc.internal.pageSize.width - 5, y);
      
      y += 6;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your business!", doc.internal.pageSize.width / 2, y, { align: "center" });

      // Save to Firestore
      const pdfData = doc.output('dataurlstring');
      await addDoc(collection(db, 'paymentReports'), {
        orderId: selectedOrder.id,
        customerName: selectedOrder.customer,
        date: new Date().toISOString(),
        totalAmount: selectedOrder.amount,
        report: pdfData,
        generatedBy: auth.currentUser.uid
      });

      // Show success message and close modal
      setIsReportModalOpen(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);

    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report: ' + error.message);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = 
      filterStatus === 'all' || 
      order.paymentStatus?.toUpperCase() === filterStatus;
      
    return matchesSearch && (filterStatus === 'all' || matchesStatus);
  });

  const handlePayment = async (order) => {
    try {
      setIsProcessing(true);
      console.log('Processing payment for order:', order);
      console.log('Firestore ID:', order.firestoreId);

      if (!order.firestoreId) {
        setError('Error: Could not find document ID');
        return;
      }

      const orderRef = doc(db, 'orders', order.firestoreId);
      
      const paymentUpdate = {
        paymentStatus: 'PAID',
        paymentDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.currentUser.uid
      };

      await updateDoc(orderRef, paymentUpdate);

      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);

      setConfirmPayment({ show: false, order: null });
      await fetchOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to process payment: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsReportModalOpen(true);
  };

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Order Details</h2>
            <button 
              className="close-modal" 
              onClick={() => {
                setSelectedOrder(null);
                setIsReportModalOpen(false);
              }}
            >
              <FaTimes />
            </button>
          </div>
          <div className="order-details">
            <div className="details-row">
              <p><strong>Order ID:</strong> {selectedOrder.id}</p>
              <p><strong>Customer:</strong> {selectedOrder.customer}</p>
            </div>
            <div className="details-row">
              <p><strong>Quantity:</strong> {selectedOrder.quantity}</p>
              <p><strong>Amount:</strong> ₱{selectedOrder.amount?.toFixed(2) || 'N/A'}</p>
            </div>
            <div className="details-row">
              <p><strong>Payment Status:</strong> 
                <span className={`status-badge ${selectedOrder.paymentStatus?.toLowerCase()}`}>
                  {selectedOrder.paymentStatus}
                </span>
              </p>
              <p><strong>Date:</strong> {new Date(selectedOrder.date).toLocaleDateString()}</p>
            </div>
          </div>
          <button className="generate-report-btn" onClick={generateReport}>
            <FaFileInvoiceDollar /> Generate & Send Report
          </button>
        </div>
      </div>
    );
  };

  const renderWarningModal = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-content warning-modal">
          <h2>⚠️ Warning</h2>
          <p>Unable to generate report. Order amount is not set.</p>
          <div className="button-group">
            <button 
              className="button button-secondary" 
              onClick={() => setShowWarningModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmPayment = () => {
    if (!confirmPayment.show) return null;
    
    return (
      <div className="modal-overlay">
        <div className="confirm-payment-modal">
          <h2>Confirm Payment</h2>
          <div className="payment-details">
            <p><strong>Order ID:</strong> {confirmPayment.order.id}</p>
            <p><strong>Customer:</strong> {confirmPayment.order.customer}</p>
            <p><strong>Amount:</strong> ₱{confirmPayment.order.amount?.toFixed(2) || 'N/A'}</p>
          </div>
          <div className="confirm-buttons">
            <button 
              className="cancel-btn"
              onClick={() => setConfirmPayment({ show: false, order: null })}
            >
              Cancel
            </button>
            <button 
              className="confirm-btn"
              onClick={() => handlePayment(confirmPayment.order)}
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessModal = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-content success-modal">
          <div className="success-icon">
            <FaCheck />
          </div>
          <h2>Success!</h2>
          <p>Report has been generated and sent to Office Secretary</p>
        </div>
      </div>
    );
  };

  return (
    <div className="accountant">
      <div className="dashboard-container">
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
        <h1 className="dashboard-title">Accountant Dashboard</h1>

        <div className="tab-buttons">
          <button className="tab-button active">
            <FaExchangeAlt /> Payment Status
          </button>
        </div>

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
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <div className="table-container">
          <table className="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.firestoreId || order.id} className="clickable-row">
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>{order.quantity}</td>
                  <td>₱{order.amount ? order.amount.toFixed(2) : 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${order.paymentStatus.toLowerCase()}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons-container">
                      <button 
                        className="view-btn" 
                        onClick={() => handleViewDetails(order)}
                      >
                        <FaEye /> View
                      </button>
                      {order.paymentStatus !== 'PAID' && (
                        <button 
                          className="pay-btn"
                          onClick={() => setConfirmPayment({ show: true, order: order })}
                        >
                          <FaMoneyBillWave /> Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isReportModalOpen && renderOrderDetails()}
        {showWarningModal && renderWarningModal()}
        {confirmPayment.show && renderConfirmPayment()}
        {showSuccessModal && renderSuccessModal()}
      </div>
    </div>
  )
}
