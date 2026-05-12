const fs = require('fs');

const htmlFile = 'mekong_fiesta_assignments.html';
let html = fs.readFileSync(htmlFile, 'utf8');

// 1. Remove the huge const data block
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
        const fetchLogic = `let data = { buses: [], rooms: [] };`;
        html = html.substring(0, startIndex) + fetchLogic + html.substring(endIndex + 1);
    }
}

// 2. Wrap directory init
html = html.replace(/data\.buses\.forEach\(bus => {[\s\S]*?}\);\s*}\);/g, (match) => {
    return `function initDirectory() {\n            directory.clear();\n            ${match}\n        }`;
});

// 3. Insert loadDataFromExcel at the end
const endScriptPattern = "setLanguage('en');";
const endScriptIndex = html.lastIndexOf(endScriptPattern);

const fetchFunction = `
        async function loadDataFromExcel() {
            try {
                listContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">🔄 Loading data from Excel...</div>';
                const response = await fetch('Danh sách phòng - bus.xlsx');
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                const dataSheet = workbook.Sheets[workbook.SheetNames[0]]; 
                const leaderSheet = workbook.Sheets['Bus Leader'];

                const leaderData = XLSX.utils.sheet_to_json(leaderSheet);
                const leadersByEmail = {};
                leaderData.forEach(row => {
                    if (row['Leader Mail']) {
                        leadersByEmail[row['Leader Mail'].toLowerCase()] = {
                            phone: row['Leader Phone'] || '',
                            bus: row['Bus No']
                        };
                    }
                });

                const rawData = XLSX.utils.sheet_to_json(dataSheet);

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
                        finalName = \`\${name} (Family: \${familyDesc})\`;
                        nameVi = \`\${name} (Người nhà: \${familyDesc})\`;
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
                    if (!roomsMap.has(roomName)) roomsMap.set(roomName, { id: 'room-' + roomsMap.size, name: \`Room \${roomName}\`, name_vi: \`Phòng \${roomName}\`, members: [] });

                    busesMap.get(busName).members.push({...member});
                    roomsMap.get(roomName).members.push({...member});
                });

                const newBuses = Array.from(busesMap.values());
                const newRooms = Array.from(roomsMap.values());

                newBuses.forEach(bus => {
                    const leader = bus.members.find(m => m.is_leader);
                    if (leader) {
                        bus.leader = { name: leader.name, phone: leader.phone };
                    }
                    bus.members.sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0));
                });

                data.buses = newBuses;
                data.rooms = newRooms;
                
                initDirectory();
                
                if (searchInput.value.trim() !== '') {
                    searchPerson();
                } else {
                    renderList();
                }

            } catch (error) {
                console.error("Error loading Excel file:", error);
                listContent.innerHTML = '<div style="text-align:center; padding: 40px; color: #E65100; font-size: 1.1rem; line-height: 1.5;">⚠️ <strong>Không thể tải dữ liệu từ Excel.</strong><br><br>Vui lòng đảm bảo file <em>Danh sách phòng - bus.xlsx</em> nằm cùng thư mục và bạn đang chạy web qua local server (vd: npm start, Live Server).</div>';
            }
        }
`;

html = html.substring(0, endScriptIndex) + fetchFunction + "\n        " + endScriptPattern + "\n        loadDataFromExcel();\n" + html.substring(endScriptIndex + endScriptPattern.length);

// 4. Add SheetJS to head
html = html.replace('</head>', '    <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>\n</head>');

fs.writeFileSync(htmlFile, html, 'utf8');
console.log('Successfully updated HTML to use fetch!');
