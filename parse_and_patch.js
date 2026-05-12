const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('Danh sách phòng - bus.xlsx');
const dataSheet = workbook.Sheets[workbook.SheetNames[0]]; // 'Room & Bus list - HNH'
const leaderSheet = workbook.Sheets['Bus Leader'];

const leaderData = xlsx.utils.sheet_to_json(leaderSheet);
const leadersByEmail = {};
leaderData.forEach(row => {
    if (row['Leader Mail']) {
        leadersByEmail[row['Leader Mail'].toLowerCase()] = {
            phone: row['Leader Phone'] || '',
            bus: row['Bus No']
        };
    }
});

const rawData = xlsx.utils.sheet_to_json(dataSheet);

const busesMap = new Map();
const roomsMap = new Map();

rawData.forEach(row => {
    if (!row['Full name']) return;
    
    let name = row['Full name'].toString().trim();
    let email = row['Email'] ? row['Email'].toString().trim() : '';
    let isFamily = !!row['Người nhà'];
    let familyDesc = isFamily ? row['Người nhà'].toString().trim() : '';
    let busName = row['Bus'] ? row['Bus'].toString().trim() : 'Unknown Bus';
    let roomName = row['Room'] ? row['Room'].toString().trim() : 'Unknown Room';

    let finalName = name;
    let nameVi = name;
    if (isFamily) {
        finalName = `${name} (Family: ${familyDesc})`;
        nameVi = `${name} (Người nhà: ${familyDesc})`;
    }

    let isLeader = false;
    let phone = '';
    if (email && leadersByEmail[email.toLowerCase()] && leadersByEmail[email.toLowerCase()].bus === busName) {
        isLeader = true;
        phone = leadersByEmail[email.toLowerCase()].phone;
    }

    const member = {
        name: finalName,
        email: email,
        role_en: isFamily ? 'Family' : 'Member',
        role_vi: isFamily ? 'Người nhà' : 'Thành viên',
        is_leader: isLeader,
        phone: phone ? phone.toString() : ''
    };
    
    if (isFamily) {
        member.name_vi = nameVi;
    }

    if (!busesMap.has(busName)) busesMap.set(busName, { id: 'bus-' + busesMap.size, name: busName, leader: null, members: [] });
    if (!roomsMap.has(roomName)) roomsMap.set(roomName, { id: 'room-' + roomsMap.size, name: `Room ${roomName}`, name_vi: `Phòng ${roomName}`, members: [] });

    busesMap.get(busName).members.push({...member}); // clone to avoid ref issues
    roomsMap.get(roomName).members.push({...member});
});

const newBuses = Array.from(busesMap.values());
const newRooms = Array.from(roomsMap.values());

newBuses.forEach(bus => {
    const leader = bus.members.find(m => m.is_leader);
    if (leader) {
        bus.leader = { name: leader.name, phone: leader.phone };
    }
    // Sort bus members: leader first
    bus.members.sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0));
});

const newData = { buses: newBuses, rooms: newRooms };
const newDataStr = JSON.stringify(newData, null, 2);

const htmlFile = 'mekong_fiesta_assignments.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const startPattern = 'const data = {';
const startIndex = html.indexOf(startPattern);
if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    let foundStart = false;
    for (let i = startIndex + 'const data = '.length; i < html.length; i++) {
        if (html[i] === '{') {
            braceCount++;
            foundStart = true;
        } else if (html[i] === '}') {
            braceCount--;
        }
        
        if (foundStart && braceCount === 0) {
            endIndex = i;
            break;
        }
    }
    
    if (endIndex !== -1) {
        html = html.substring(0, startIndex + 'const data = '.length) + newDataStr + html.substring(endIndex + 1);
        fs.writeFileSync(htmlFile, html, 'utf8');
        console.log('Successfully fully rebuilt data from Excel!');
    }
}
