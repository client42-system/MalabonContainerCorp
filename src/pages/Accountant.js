import React, { useState, useEffect } from 'react'
import '../pages/Accountant.css'
import { FaSignOutAlt, FaExchangeAlt, FaFileInvoiceDollar, FaExclamationTriangle, FaTimes, FaEye, FaMoneyBillWave } from 'react-icons/fa'
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
      const fetchedOrders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          firestoreId: doc.id,
          paymentStatus: data.paymentStatus || 'UNPAID'
        };
      });
      
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

    // Add amount validation
    if (typeof selectedOrder.amount !== 'number') {
      setShowWarningModal(true);
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      margins: { top: 20, right: 20, bottom: 20, left: 20 }
    });

    // Set initial y position
    let y = 30;

    // Add company header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("MALABON CONTAINER CORPORATION", doc.internal.pageSize.width / 2, y, { align: "center" });
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("123 Sample Street, Malabon City", doc.internal.pageSize.width / 2, y, { align: "center" });
    
    y += 6;
    doc.text("Tel: (02) 1234-5678", doc.internal.pageSize.width / 2, y, { align: "center" });
    
    // Add line separator
    y += 8;
    doc.setLineWidth(0.5);
    doc.line(20, y, doc.internal.pageSize.width - 20, y);

    // Add receipt title
    y += 12;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL RECEIPT", doc.internal.pageSize.width / 2, y, { align: "center" });

    // Add line separator
    y += 8;
    doc.line(20, y, doc.internal.pageSize.width - 20, y);

    // Add order details with more space for address
    y += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Left column details
    const leftX = 25;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, leftX, y);
    y += 8;
    doc.text(`Customer: ${selectedOrder.customer}`, leftX, y);
    y += 8;
    doc.text(`Order ID: ${selectedOrder.id}`, leftX, y);
    y += 8;
    doc.text(`Contact: ${selectedOrder.contactNumber || 'N/A'}`, leftX, y);

    // Right column details with wrapped address
    const rightX = doc.internal.pageSize.width / 2 + 10;
    const maxWidth = 80; // Maximum width for address text
    
    // Reset y for right column
    y -= 24;
    
    // Split address into multiple lines if needed
    const addressLines = doc.splitTextToSize(`Address: ${selectedOrder.address || 'N/A'}`, maxWidth);
    doc.text(addressLines, rightX, y);
    
    y += addressLines.length * 5 + 3; // Adjust y based on number of address lines
    doc.text(`Type: ${selectedOrder.type}`, rightX, y);
    y += 8;
    doc.text(`Status: ${selectedOrder.status}`, rightX, y);

    // Add line separator before table
    y += 15;
    doc.line(20, y, doc.internal.pageSize.width - 20, y);
    y += 8;

    // Create simplified table with clean numbers
    doc.autoTable({
      startY: y,
      head: [["Description", "Quantity", "Amount"]],
      body: [[
        selectedOrder.type || 'N/A',
        selectedOrder.quantity?.toString() || '0',
        `₱${selectedOrder.amount.toFixed(2)}`
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 10,
        halign: 'center',
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 }
      },
      margin: { left: 20, right: 20 },
      tableWidth: 'auto'
    });

    // Add total amount without ± symbol
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount:", 120, finalY);
    doc.text(`₱${selectedOrder.amount.toFixed(2)}`, 170, finalY, { align: "right" });

    // Add line separator
    doc.line(20, finalY + 5, doc.internal.pageSize.width - 20, finalY + 5);

    // Add footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("This is a computer-generated receipt.", doc.internal.pageSize.width / 2, finalY + 15, { align: "center" });
    doc.text("Thank you for your business!", doc.internal.pageSize.width / 2, finalY + 20, { align: "center" });

    try {
      // Instead of downloading, save to Firestore
      const pdfOutput = doc.output('dataurlstring');
      
      // Create a new payment report document
      const paymentReportRef = collection(db, 'paymentReports');
      await addDoc(paymentReportRef, {
        date: new Date().toISOString(),
        totalAmount: selectedOrder.amount,
        orderCount: 1,
        report: pdfOutput,
        orderId: selectedOrder.id,
        customerName: selectedOrder.customer
      });
      
      setError(null);
      alert('Receipt generated and sent to Office Secretary successfully!');
      setIsReportModalOpen(false);
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
      // Check if firestoreId exists
      if (!order.firestoreId) {
        setError('Error: Could not find document ID');
        return;
      }

      const orderRef = doc(db, 'orders', order.firestoreId);
      
      await updateDoc(orderRef, {
        paymentStatus: 'PAID',
        paymentDate: new Date().toISOString()
      });

      setConfirmPayment({ show: false, order: null });
      fetchOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to process payment: ' + error.message);
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
      </div>
    </div>
  )
}
