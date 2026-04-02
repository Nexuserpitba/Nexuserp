import fs from 'fs';
const path = 'src/lib/fiscal/nfeXmlGenerator.ts';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\\\\\$\\{/g, '${').replace(/\\\\`/g, '`');
fs.writeFileSync(path, c);
console.log('Done');
