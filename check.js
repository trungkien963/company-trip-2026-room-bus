const fs = require('fs');
let html = fs.readFileSync('mekong_fiesta_assignments.html', 'utf8');
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
    const jsonStr = html.substring(startIndex + 'const data = '.length, endIndex + 1);
    const data = JSON.parse(jsonStr);
    data.buses.forEach(b => {
       console.log(b.name);
       if (b.members.length > 0) {
           console.log("  first:", b.members[0].name, b.members[0].is_leader ? "(LEADER)" : "");
       }
    });
}
