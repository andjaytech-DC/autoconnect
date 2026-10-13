const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');
const lines = content.split('\n');

let heroStart = -1, comingSoonStart = -1, exclusiveStart = -1, trustStart = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('aria-label="Hero"') && line.includes('<section')) {
    heroStart = i;
  }
  if (line.includes('aria-label="Coming soon"') && line.includes('<section')) {
    comingSoonStart = i;
  }
  if (line.includes('aria-label="Exclusive arrivals"') && line.includes('<section')) {
    exclusiveStart = i;
  }
  if (line.includes('aria-label="Platform statistics"') && line.includes('<section')) {
    trustStart = i;
  }
}

console.log('Hero start:', heroStart);
console.log('Coming Soon start:', comingSoonStart);
console.log('Exclusive start:', exclusiveStart);
console.log('Trust start:', trustStart);

function findSectionEnd(lines, startLine) {
  for (let i = startLine; i < lines.length; i++) {
    if (lines[i].trim() === '</section>') {
      return i;
    }
  }
  return -1;
}

const heroEnd = findSectionEnd(lines, heroStart);
const comingSoonEnd = findSectionEnd(lines, comingSoonStart);
const exclusiveEnd = findSectionEnd(lines, exclusiveStart);
const trustEnd = findSectionEnd(lines, trustStart);

console.log('Hero end:', heroEnd);
console.log('Coming Soon end:', comingSoonEnd);
console.log('Exclusive end:', exclusiveEnd);
console.log('Trust end:', trustEnd);

const heroSection = lines.slice(heroStart, heroEnd + 1).join('\n');
const comingSoonSection = lines.slice(comingSoonStart, comingSoonEnd + 1).join('\n');
const exclusiveSection = lines.slice(exclusiveStart, exclusiveEnd + 1).join('\n');
const trustSection = lines.slice(trustStart, trustEnd + 1).join('\n');

// Remove all four sections from the content
let newLines = lines.slice(0, comingSoonStart); // Everything before Coming Soon
newLines = newLines.concat(lines.slice(trustEnd + 1)); // Everything after Trust

// Now insert in correct order after the Hero section end
let newContent = newLines.join('\n');
const heroEndInNew = newContent.indexOf('      </section>', newContent.indexOf('      </section>') + 14) + 14;

if (heroEndInNew > 0) {
  newContent = newContent.slice(0, heroEndInNew) + '\n\n' + exclusiveSection + '\n\n' + comingSoonSection + '\n\n' + trustSection + '\n' + newContent.slice(heroEndInNew);
  fs.writeFileSync('app/page.tsx', newContent);
  console.log('Reordered sections successfully');
} else {
  console.log('Could not find hero end in new content');
}