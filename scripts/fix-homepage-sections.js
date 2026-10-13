const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Find the EXCLUSIVE ARRIVALS section that was incorrectly inserted
const exclusiveStart = content.indexOf('{/* ═══════════════════════════════════════════');
const exclusiveEnd = content.indexOf('      {/* ═══════════════════════════════════════════', exclusiveStart + 100);
const comingSoonEnd = content.indexOf('      {/* ═══════════════════════════════════════════', exclusiveEnd + 100);
const trustStart = content.indexOf('      {/* ═══════════════════════════════════════════', comingSoonEnd + 100);

// Extract the new sections
const newSections = content.slice(exclusiveStart, trustStart);

// Remove the incorrectly inserted sections
content = content.slice(0, exclusiveStart) + content.slice(trustStart);

// Now insert the new sections after the Hero section (after the second </section>)
const firstSectionEnd = content.indexOf('      </section>');
const secondSectionEnd = content.indexOf('      </section>', firstSectionEnd + 14);
const heroEndIndex = secondSectionEnd + 14;

content = content.slice(0, heroEndIndex) + newSections + content.slice(heroEndIndex);

fs.writeFileSync('app/page.tsx', content);
console.log('Done - moved sections to correct location');