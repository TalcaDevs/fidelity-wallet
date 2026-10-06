const fs = require('fs');
let file = 'apps/backend/src/scan/scan.service.spec.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\{ id: `s\$\{i\}` \}/g, "{ id: `s${i}`, amount: 1 }");
content = content.replace(/\{ id: `s\$\{n\}` \}/g, "{ id: `s${n}`, amount: 1 }");

fs.writeFileSync(file, content);
console.log('Done!');
