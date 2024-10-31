const fs = require('fs');
const path = require('path');

// Copies electron.js to build folder
try {
  fs.copyFileSync(
    path.join(__dirname, 'electron.js'),
    path.join(__dirname, '../build/electron.js')
  );
  console.log('Successfully copied electron.js to build folder');
} catch (err) {
  console.error('Error copying electron.js:', err);
} 