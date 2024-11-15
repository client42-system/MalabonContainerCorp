import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { FaArrowLeft, FaFileImport } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './DataImport.css';

export default function DataImport() {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/ceo');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setImporting(true);
    setStatus('');

    if (!file) {
      setStatus('Error: No file selected');
      setImporting(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const allData = [];

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          allData.push(...data);
        });

        if (allData.length === 0) {
          setStatus('Error: Excel file is empty');
          return;
        }

        for (const row of allData) {
          const missingFields = [];
          const requiredFields = ['ID NUM', 'CUSTOMER', 'TYPE', 'QUANTITY', 'ADDRESS', 'CONTACT NUMBER', 'DATE', 'TOTAL'];

          requiredFields.forEach(field => {
            if (!row[field]) {
              missingFields.push(field);
            }
          });

          if (missingFields.length > 0) {
            throw new Error(`Missing required fields in row with ID: ${row['ID NUM'] || 'unknown'}. Missing: ${missingFields.join(', ')}`);
          }

          // Parse and validate the date before creating the order data
          let orderDate;
          try {
            orderDate = formatExcelDate(row['DATE']);
          } catch (error) {
            throw new Error(`Invalid date format for ID: ${row['ID NUM']}. Date value: ${row['DATE']}`);
          }

          const orderData = {
            id: row['ID NUM'].toString(),
            customer: row['CUSTOMER'].toString(),
            type: row['TYPE'].toString(),
            quantity: parseInt(row['QUANTITY']) || 0,
            address: row['ADDRESS'].toString(),
            contactNumber: row['CONTACT NUMBER'].toString(),
            date: orderDate,
            amount: parseInt(row['TOTAL']) || 0,
            status: 'Completed',
            expectedDeliveryDate: row['EXPECTED DELIVERY DATE'] ? formatExcelDate(row['EXPECTED DELIVERY DATE']) : null,
            actualDeliveryDate: row['ACTUAL DELIVERY DATE'] ? formatExcelDate(row['ACTUAL DELIVERY DATE']) : null,
            deliveryStatus: row['ACTUAL DELIVERY DATE'] ? 'DELIVERED' : 'PENDING',
            paymentStatus: 'Paid'
          };

          // Validate the order data
          const validationErrors = validateOrder(orderData);
          if (validationErrors.length > 0) {
            throw new Error(`Validation errors for ID ${orderData.id}: ${validationErrors.join(', ')}`);
          }

          const orderRef = doc(collection(db, 'orders'), orderData.id);
          await setDoc(orderRef, orderData);
        }

        setStatus(`Successfully imported ${allData.length} orders`);
      } catch (error) {
        console.error('Import error:', error);
        setStatus(`Error: ${error.message}`);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="ceo">
      <div className="dashboard-container">
        <button className="back-button" onClick={handleBack}>
          <FaArrowLeft /> Back
        </button>
        <h1 className="dashboard-title">Historical Data Import</h1>

        <div className="tabs">
          <button className="tab active">
            <FaFileImport /> Import Excel Data
          </button>
        </div>

        <div className="analytics-card">
          <h3>Import Historical Orders</h3>
          <p className="import-description">
            Upload your Excel file containing historical order data. 
            The file should include: Order ID, Customer, Type, Quantity, Address, Contact Number, Date, Status, 
            and Delivery Schedule (Expected Delivery Date, Actual Delivery Date).
          </p>

          <div className="import-controls">
            <label className="import-button" htmlFor="file-upload">
              <FaFileImport /> Choose Excel File
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={importing}
              />
            </label>
          </div>

          {status && (
            <div className={`status-message ${status.includes('Error') ? 'error-state' : 'success-state'}`}>
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatExcelDate(dateValue) {
  let date;
  
  // Handle different date formats
  if (typeof dateValue === 'string') {
    // Handle month names (e.g., "Jan/01/2021")
    const monthNames = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };

    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const monthStr = parts[0].toLowerCase();
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);

      if (monthNames.hasOwnProperty(monthStr)) {
        date = new Date(year, monthNames[monthStr], day);
      } else {
        // Try parsing as numeric month
        date = new Date(year, parseInt(parts[0]) - 1, day);
      }
    }
  } else if (typeof dateValue === 'number') {
    // Handle Excel's numeric date format
    date = new Date((dateValue - 25569) * 86400 * 1000);
  } else {
    date = new Date(dateValue);
  }

  // Validate the date
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateValue}`);
  }

  return date.toISOString();
} 

const validateOrder = (order) => {
  const errors = [];
  
  if (!order.date || isNaN(new Date(order.date).getTime())) {
    errors.push(`Invalid order date for Order ID: ${order.id}`);
  }

  if (order.expectedDeliveryDate && isNaN(new Date(order.expectedDeliveryDate).getTime())) {
    errors.push(`Invalid expected delivery date for Order ID: ${order.id}`);
  }

  if (order.actualDeliveryDate && isNaN(new Date(order.actualDeliveryDate).getTime())) {
    errors.push(`Invalid actual delivery date for Order ID: ${order.id}`);
  }

  if (order.actualDeliveryDate && order.expectedDeliveryDate && 
      new Date(order.actualDeliveryDate) < new Date(order.expectedDeliveryDate)) {
    errors.push(`Actual delivery date cannot be before expected delivery date for Order ID: ${order.id}`);
  }

  return errors;
}; 