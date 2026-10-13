const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Remove all section marker comments using a simple string replace approach
// We'll do multiple passes to catch all variations

// Pattern 1: HERO SECTION
content = content.replace(
  '{/* ══════════════════════════════════════════ HERO SECTION ══════════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 2: TRUST & PLATFORM STATS
content = content.replace(
  '{/* ══════════════════════════════════════════ TRUST & PLATFORM STATS ══════════════════════════════════════════════════ */}',
  ''
);

// Pattern 3: FEATURED VEHICLES
content = content.replace(
  '{/* ═════════════════════════════════════════ FEATURED VEHICLES ═══════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 3b: FEATURED VEHICLES (old format)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          FEATURED VEHICLES\n      ══════════════════════════════════════════ */}',
  ''
);

// Pattern 4: EXCLUSIVE ARRIVALS
content = content.replace(
  '{/* ══════════════════════════════════════════ EXCLUSIVE ARRIVALS ════════════════════════════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 5: COMING SOON
content = content.replace(
  '{/* ══════════════════════════════════════════ COMING SOON ═══════════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 6: TRUST & PLATFORM STATS (old format)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          TRUST & PLATFORM STATS\n      ═══════════════════════════════════════════ */}',
  ''
);

// Pattern 7: EXCLUSIVE ARRIVALS (old format)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          EXCLUSIVE ARRIVALS\n      ═══════════════════════════════════════════ */}',
  ''
);

// Pattern 8: COMING SOON (old format)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          COMING SOON\n      ═══════════════════════════════════════════ */}',
  ''
);

// Pattern 9: HERO SECTION (old format)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          HERO SECTION\n      ════════════════════════════════════════════ */}',
  ''
);

// Pattern 10: FEATURED VEHICLES (old format - single line)
content = content.replace(
  '{/* ══════════════════════════════════════════ FEATURED VEHICLES ════════════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 11: EXCLUSIVE ARRIVALS (old format - single line)
content = content.replace(
  '{/* ══════════════════════════════════════════ EXCLUSIVE ARRIVALS ═════════════════════════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 12: COMING SOON (old format - single line)
content = content.replace(
  '{/* ══════════════════════════════════════════ COMING SOON ═══════════════════════════════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 13: TRUST & PLATFORM STATS (single line)
content = content.replace(
  '{/* ═══════════════════════════════════════════ TRUST & PLATFORM STATS ════════════════════════════════════════════════════════════════════════════════ */}',
  ''
);

// Pattern 14: FEATURED VEHICLES (old single line)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          FEATURED VEHICLES\n      ══════════════════════════════════════════ */}',
  ''
);

// Pattern 15: EXCLUSIVE ARRIVALS (old format)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          EXCLUSIVE ARRIVALS\n      ═══════════════════════════════════════════ */}',
  ''
);

// Pattern 16: COMING SOON (old format)
content = content.replace(
  '{/* ═══════════════════════════════════════════\n          COMING SOON\n      ═══════════════════════════════════════════ */}',
  ''
);

// Pattern 17: HERO SECTION (old format)
content = content.replace(
  '{/* ══════════════════════════════════════════\n          HERO SECTION\n      ═══════════════════════════════════════════ */}',
  ''
);

// Also remove any remaining standalone comment lines that might be left
// Pattern: lines that are just {/* ... */} with box drawing characters
content = content.replace(/^\s*\{[\/][*][\s\S]*?[*][/]\}\s*$/gm, '');

fs.writeFileSync('app/page.tsx', content);
console.log('Removed all section marker comments');