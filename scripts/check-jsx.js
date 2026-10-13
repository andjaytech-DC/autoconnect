const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\bobby\\autoconnect\\app\\components\\admin\\VehicleForm.tsx', 'utf8');
const lines = content.split('\n');
let openDivs = 0;
let openForms = 0;
let openSections = 0;
let ternaryDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inString = false;
  let stringChar = '';
  let ternaryDepth = 0;
  
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (!inString && (c === '"' || c === "'" || c === '`')) {
      inString = true;
      stringChar = c;
    } else if (inString && c === stringChar && line[j-1] !== '\\') {
      inString = false;
      stringChar = '';
    } else if (!inString && c === '?') {
      const next = line[j+1];
      if (next && next !== '/' && next !== '*' && next !== '.') {
        ternaryDepth++;
      }
    } else if (c === ':' && ternaryDepth > 0) {
      ternaryDepth--;
    }
  }
  
  // Count tags - only count when not in ternary
  let openDivMatches = 0;
  let closeDivMatches = 0;
  let openFormMatches = 0;
  let closeFormMatches = 0;
  let openSectionMatches = 0;
  let closeSectionMatches = 0;
  
  // Simple tag counting - count tags outside ternary expressions
  let inTernary = false;
  let j = 0;
  while (j < line.length) {
    if (!inString && line[j] === '<') {
      if (line.substr(j, 5) === '<div>' || line.substr(j, 5) === '<div ') {
        if (ternaryDepth > 0) inString = true; // track as in ternary
        openDivMatches++;
      } else if (line.substr(j, 6) === '</div>') {
        closeDivMatches++;
      } else if (line.substr(j, 5) === '<form>' || line.substr(j, 5) === '<form ') {
        openFormMatches++;
      } else if (line.substr(j, 7) === '</form>') {
        closeFormMatches++;
      } else if (line.substr(j, 8) === '<section' || line.substr(j, 7) === '<section') {
        openSectionMatches++;
      } else if (line.substr(j, 9) === '</section>') {
        closeSectionMatches++;
      }
      j++;
    } else {
      j++;
    }
  }
  
  openDivs += openDivMatches - closeDivMatches;
  openForms += openFormMatches - closeFormMatches;
  openSections += openSectionMatches - closeSectionMatches;
  
  if (openDivs < 0 || openForms < 0 || openSections < 0) {
    console.log('Line ' + (i+1) + ': Negative count - div:' + openDivs + ' form:' + openForms + ' section:' + openSections);
    console.log('  Line: ' + lines[i].substring(0, 100));
  }
}

console.log('Final counts - div:' + openDivs + ' form:' + openForms + ' section:' + openSections);