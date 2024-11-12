import React, { useState } from 'react';
import { importExcelData } from '../utils/excelImport';

export default function ExcelImport() {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setImporting(true);
      setMessage('Importing data...');
      await importExcelData(file);
      setMessage('Import completed successfully!');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        disabled={importing}
      />
      {message && <p>{message}</p>}
    </div>
  );
} 