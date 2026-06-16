#!/usr/bin/env node
// Patches private class fields (#field) in react-native source files that hermesc on macOS cannot compile.
// Replaces #fieldName -> __priv_fieldName throughout each file.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname);

// Find all JS files in react-native that have private class field declarations
// Using a simple JS-based grep to avoid sed permission issues
const searchDirs = [
  'node_modules/react-native/Libraries',
  'node_modules/react-native/src',
];

const privateFieldPattern = /^(\s*)#([a-zA-Z_][a-zA-Z0-9_]*)/m;

let patched = 0;
let checked = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip test and build directories
      if (!['__tests__', '__mocks__', '.cxx', 'build', 'jest', 'jest-preset'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      checked++;
      const original = fs.readFileSync(fullPath, 'utf8');
      if (privateFieldPattern.test(original)) {
        const updated = original.replace(/#([a-zA-Z_][a-zA-Z0-9_]*)/g, '__priv_$1');
        if (original !== updated) {
          fs.writeFileSync(fullPath, updated, 'utf8');
          console.log(`Patched: ${path.relative(root, fullPath)}`);
          patched++;
        }
      }
    }
  }
}

for (const dir of searchDirs) {
  walkDir(path.join(root, dir));
}

console.log(`\nChecked ${checked} files. Patched ${patched} file(s).`);
