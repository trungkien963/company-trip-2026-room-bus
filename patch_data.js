const fs = require('fs');
const xlsx = require('xlsx');

// Read Leader Data
const workbook = xlsx.readFile('Danh sách phòng - bus.xlsx');
const leaderSheet = workbook.Sheets['Bus Leader'];
const leaderData = xlsx.utils.sheet_to_json(leaderSheet);

const leadersByEmail = {};
leaderData.forEach(row => {
    leadersByEmail[row['Leader Mail']] = row;
});

const htmlFile = 'mekong_fiesta_assignments.html';
let html = fs.readFileSync(htmlFile, 'utf8');

// Find the data object
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
        const jsonStr = html.substring(startIndex + 'const data = '.length, endIndex + 1);
        const data = JSON.parse(jsonStr);
        
        // Modify data
        data.buses.forEach(bus => {
            // reset leader info
            bus.leader = null;
            bus.members.forEach(member => {
                const leaderInfo = leadersByEmail[member.email];
                if (leaderInfo && leaderInfo['Bus No'] === bus.name) {
                    member.is_leader = true;
                    member.phone = leaderInfo['Leader Phone'];
                    bus.leader = {
                        name: member.name,
                        phone: member.phone
                    };
                } else {
                    member.is_leader = false;
                    member.phone = "";
                }
            });
            // Move leader to front of members list
            bus.members.sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0));
        });
        
        const newJsonStr = JSON.stringify(data, null, 2);
        html = html.substring(0, startIndex + 'const data = '.length) + newJsonStr + html.substring(endIndex + 1);
        fs.writeFileSync(htmlFile, html, 'utf8');
        console.log('Successfully patched data!');
    } else {
        console.log('Could not find end of data object');
    }
} else {
    console.log('Could not find start of data object');
}
