const ExcelJS = require('exceljs');

class ExcelProductImporter {
  async parse(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];
    const headers = [];
    worksheet.getRow(1).eachCell((cell, column) => { headers[column] = String(cell.value || '').trim(); });
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item = {};
      headers.forEach((header, column) => { if (header) item[header] = row.getCell(column).value ?? ''; });
      if (Object.values(item).some((value) => value !== '')) rows.push(item);
    });
    return rows;
  }
}

module.exports = ExcelProductImporter;
