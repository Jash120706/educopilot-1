const XLSX = require('xlsx');

// Create a dummy workbook with email list
const run = () => {
  const wb = XLSX.utils.book_new();
  const data = [
    ['Name', 'Email Address', 'Roll No'],
    ['Student A', 'studenta@gmail.com', '101'],
    ['Student B', 'studentb@gmail.com', '102'],
    ['Student C', 'INVALID_EMAIL', '103'],
    ['Student D', 'student.d@outlook.com', '104']
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  // Now parse using our logic
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Parsed rows:', parsedData);
  
  const emails = new Set();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const row of parsedData) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (cell !== null && cell !== undefined) {
        // Coerce to string to support any cell type safely
        const cellStr = String(cell).trim();
        if (emailRegex.test(cellStr)) {
          emails.add(cellStr);
        }
      }
    }
  }
  
  console.log('Extracted emails:', Array.from(emails));
};

run();
