const fs = require('fs');
let file = 'apps/backend/src/scan/scan.service.spec.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\{ id: 'stamp-3', earnedAt: new Date\('2026-01-03T00:00:00Z'\) \}/g, "{ id: 'stamp-3', earnedAt: new Date('2026-01-03T00:00:00Z'), amount: 1 }");
content = content.replace(/\{ id: 'stamp-4', earnedAt: new Date\('2026-01-04T00:00:00Z'\) \}/g, "{ id: 'stamp-4', earnedAt: new Date('2026-01-04T00:00:00Z'), amount: 1 }");
content = content.replace(/\{ id: 'stamp-5', earnedAt: new Date\('2026-01-05T00:00:00Z'\) \}/g, "{ id: 'stamp-5', earnedAt: new Date('2026-01-05T00:00:00Z'), amount: 1 }");

fs.writeFileSync(file, content);
console.log('Done!');
