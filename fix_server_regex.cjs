const fs = require('fs');
const file = 'backend/server.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\\\\\`/g, '`');
c = c.replace(/\\\\\$/g, '$');

fs.writeFileSync(file, c);
console.log('Fixed server.js');
