import { db } from '../firebaseConfig';
import { collection, doc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export const importExcelData = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        for (const row of jsonData) {
          const orderData = {
            id: row['ID'],
            customer: row['CUSTOMER'],
            type: row['TYPE'],
            quantity: parseInt(row['QUANTITY']),
            address: row['ADDRESS'],
            contactNumber: row['CONTACT NUMBER'],
            date: new Date(row['DATE']).toISOString(),
            amount: parseInt(row['TOTAL']),
            status: 'Completed',
            deliverySchedule: row['Delivery Schedule'],
            paymentStatus: 'Paid'
          };

          const orderRef = doc(collection(db, 'orders'), orderData.id);
          await setDoc(orderRef, orderData);
        }
        resolve('Import completed successfully');
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}; 