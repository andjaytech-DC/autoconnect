const fs = require('fs');
const content = fs.readFileSync('app/components/admin/AdminNewCarsPanel.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inString = false;
  let stringChar = '';
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (!inString && (c === '"' || c === "'") && (j === 0 || line[j-1] !== '\\')) {
      inString = true;
      stringChar = c;
    } else if (inString && c === stringChar && line[j-1] !== '\\') {
      inString = false;
      stringChar = '';
    } else if (!inString && c === '/') {
      const next = line[j+1];
      if (next && next !== '/' && next !== '*') {
        console.log('Line ' + (i+1) + ': ' + line.trim());
        break;
      }
    }
  }
}