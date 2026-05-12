const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('Danh sách phòng - bus.xlsx');
const dataSheetName = workbook.SheetNames[0]; // 'Room & Bus list - HNH'
const dataSheet = workbook.Sheets[dataSheetName];
const rawData = xlsx.utils.sheet_to_json(dataSheet, { header: 1 });

console.log("HEADERS:", rawData[0]);
// Let's also see what a 'family' row looks like
const familyRow = rawData.find(r => r[3]);
console.log("FAMILY ROW:", familyRow);
