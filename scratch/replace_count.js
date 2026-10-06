const fs = require('fs');
const files = [
  'apps/backend/src/scan/scan.service.spec.ts',
  'apps/backend/src/passes/passes.service.spec.ts'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/vi\.spyOn\(prisma\.stamp, 'count'\)\.mockResolvedValue\((\d+)\);/g, 
    "vi.spyOn(prisma.stamp, 'aggregate').mockResolvedValue({ _sum: { amount: $1 } } as any);");
  
  // also fix the one that spans multiple lines in passes.service.spec.ts
  content = content.replace(/vi\.spyOn\(prisma\.stamp, 'count'\)\s*\n\s*\.mockResolvedValueOnce\(5\)\s*\n\s*\.mockResolvedValueOnce\(0\);/,
    "vi.spyOn(prisma.stamp, 'aggregate')\n        .mockResolvedValueOnce({ _sum: { amount: 5 } } as any)\n        .mockResolvedValueOnce({ _sum: { amount: 0 } } as any);");
    
  fs.writeFileSync(file, content);
});
console.log('Done!');
