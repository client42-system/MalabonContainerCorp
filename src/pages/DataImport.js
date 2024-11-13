import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc } from 'firebase/firestore';
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
    try {
      setImporting(true);
      setStatus('Starting import...');
      
      const file = event.target.files[0];
      if (!file) {
        setStatus('Error: No file selected');
        return;
      }

      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls'].includes(fileExt)) {
        setStatus('Error: Please upload a valid Excel file (.xlsx or .xls)');
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

            const orderData = {
              id: row['ID NUM'].toString(),
              customer: row['CUSTOMER'].toString(),
              type: row['TYPE'].toString(),
              quantity: parseInt(row['QUANTITY']) || 0,
              address: row['ADDRESS'].toString(),
              contactNumber: row['CONTACT NUMBER'].toString(),
              date: formatExcelDate(row['DATE']),
              amount: parseInt(row['TOTAL']) || 0,
              status: 'Completed',
              deliverySchedule: row['Delivery Schedule'] ? row['Delivery Schedule'].toString() : null,
              paymentStatus: 'Paid'
            };

            const orderRef = doc(collection(db, 'orders'), orderData.id);
            await setDoc(orderRef, orderData);
          }
          setStatus('Import completed successfully!');
        } catch (error) {
          console.error('Import error:', error);
          setStatus(`Import failed: ${error.message}`);
        }
      };

      reader.onerror = (error) => {
        setStatus(`Error reading file: ${error}`);
      };
      
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Upload error:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setImporting(false);
    }
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
            The file should include: Order ID, Customer, Type, Quantity, Address, Contact Number, Date, and Status.
            temporary lang to :).
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