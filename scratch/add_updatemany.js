const fs = require('fs');
const files = [
  'apps/backend/src/scan/scan.card-rules.spec.ts',
  'apps/backend/src/scan/scan.validation.spec.ts'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('updateMany: vi.fn(')) {
    content = content.replace(/findFirst: vi\.fn\(\)\.mockResolvedValue\(null\),/g, 
      "findFirst: vi.fn().mockResolvedValue(null),\n        updateMany: vi.fn(async (args) => { return { count: args?.where?.id?.in?.length || 0 }; }),");
    fs.writeFileSync(file, content);
  }
});
console.log('Done!');
