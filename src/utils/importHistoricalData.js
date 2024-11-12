import { db } from '../firebaseConfig';
import { collection, doc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { PRICES } from './priceUtils';

export const importHistoricalData = async (excelFile) => {
  try {
    const workbook = XLSX.read(excelFile, { type: 'binary' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    for (const row of data) {
      const orderData = {
        id: row['ID NUM'],
        customer: row['CUSTOMER'],
        type: row['TYPE'],
        quantity: parseInt(row['QUANTITY']),
        address: row['ADDRESS'],
        contactNumber: row['CONTACT NUMBER'],
        date: new Date(formatDate(row['DATE'])).toISOString(),
        amount: parseInt(row['QUANTITY']) * PRICES[row['TYPE']],
        status: row['STATUS'],
        deliveredDate: row['Delivery Schedule'] ? new Date(formatDate(row['Delivery Schedule'])).toISOString() : null,
        paymentStatus: row['STATUS'] === 'Completed' ? 'Paid' : 'Unpaid',
        paymentDate: row['STATUS'] === 'Completed' ? new Date(formatDate(row['Delivery Schedule'])).toISOString() : null
      };

      // Add to Firestore with the ID from Excel
      const orderRef = doc(collection(db, 'orders'), orderData.id);
      await setDoc(orderRef, orderData);
    }

    return true;
  } catch (error) {
    console.error('Error importing historical data:', error);
    throw error;
  }
};

// Helper function to convert Excel date format (MM/DD/YYYY) to ISO string
const formatDate = (dateString) => {
  const [month, day, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}; 