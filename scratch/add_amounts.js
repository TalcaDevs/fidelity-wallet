const fs = require('fs');
let file = 'apps/backend/src/scan/scan.service.spec.ts';
let content = fs.readFileSync(file, 'utf8');

// replace { id: '...' } with { id: '...', amount: 1 } inside findMany mock
content = content.replace(/\{ id: '([^']+)' \}/g, "{ id: '$1', amount: 1 }");
content = content.replace(/\{ id: "([^"]+)" \}/g, "{ id: '$1', amount: 1 }");

fs.writeFileSync(file, content);
console.log('Done!');
