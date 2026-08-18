const pdfParse = require('pdf-parse');

/**
 * Universal Multi-Modal Document & Image Text Extractor
 * Supports: PDF, Excel (XLSX/XLS), CSV, Images (PNG/JPG/JPEG/WEBP), and Plain Text
 */
const extractTextFromFile = async ({ fileBuffer, originalName = '', mimeType = '' }) => {
  if (!fileBuffer || fileBuffer.length === 0) {
    return '';
  }

  const ext = (originalName.split('.').pop() || '').toLowerCase();

  // 1. PDF Files
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    try {
      const pdfData = await pdfParse(fileBuffer);
      if (pdfData && pdfData.text && pdfData.text.trim().length >= 10) {
        return pdfData.text.replace(/\x00/g, '').replace(/\r\n/g, '\n').trim();
      }
    } catch (err) {
      console.warn('[FileParser] pdf-parse warning, using raw stream fallback:', err.message);
    }
    const rawStr = fileBuffer.toString('utf-8');
    const matches = rawStr.match(/[\x20-\x7E\r\n]{4,}/g);
    return matches ? matches.join(' ') : rawStr;
  }

  // 2. Excel & CSV Spreadsheets
  if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      let sheetTexts = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        if (csvData && csvData.trim().length > 0) {
          sheetTexts.push(`[Sheet: ${sheetName}]\n${csvData}`);
        }
      });

      if (sheetTexts.length > 0) {
        return sheetTexts.join('\n\n');
      }
    } catch (err) {
      console.warn('[FileParser] Excel/CSV parse warning:', err.message);
    }
    return fileBuffer.toString('utf-8');
  }

  // 3. Image OCR (PNG, JPG, JPEG, WEBP)
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext) || mimeType.includes('image')) {
    try {
      const Tesseract = require('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng', {
        logger: () => {}, // silent
      });
      if (text && text.trim().length > 5) {
        return text.trim();
      }
    } catch (err) {
      console.warn('[FileParser] Tesseract OCR note, using buffer string extraction:', err.message);
    }
    // Fallback printable ASCII extraction
    const rawStr = fileBuffer.toString('latin1');
    const matches = rawStr.match(/[A-Za-z0-9\s:,\-\/.]{4,}/g);
    return matches ? matches.join(' ') : 'Timetable image processed.';
  }

  // 4. Default Text / Markdown / Code / JSON
  return fileBuffer.toString('utf-8');
};

module.exports = {
  extractTextFromFile,
};
