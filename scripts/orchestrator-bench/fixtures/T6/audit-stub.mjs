#!/usr/bin/env node
// Minimal protocol-audit stand-in for protocol-watch --self-test.
// Usage: node audit-stub.mjs <dir>
// Exits 1 if any .md file in <dir> lacks the inheritance line, else 0.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MARKER = 'Inherits the [Proactive Protocol]';
const dir = process.argv[2];
if (!dir) {
  console.error('usage: audit-stub.mjs <dir>');
  process.exit(2);
}

const missing = readdirSync(dir)
  .filter(f => f.endsWith('.md'))
  .filter(f => !readFileSync(join(dir, f), 'utf8').includes(MARKER));

if (missing.length > 0) {
  console.log('Missing files:');
  for (const f of missing) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('audit clean');
