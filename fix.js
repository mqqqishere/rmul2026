import fs from 'fs';
import path from 'path';

const filesToFix = [
  'server.ts',
  'src/components/RoundRobinBracket.tsx',
  'src/components/SwissBracket.tsx',
  'src/pages/Admin.tsx',
  'src/pages/Home.tsx',
  'src/pages/TeamDetails.tsx',
  'src/pages/TournamentDetails.tsx'
];

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  }
});
