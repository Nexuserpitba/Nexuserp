const fs = require('fs');
const path = 'backend/server.js';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\\\\\$\\{/g, '${').replace(/\\\\`/g, '`');
fs.writeFileSync(path, c);
console.log('Done');
