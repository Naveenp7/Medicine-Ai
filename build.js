const fs = require('fs-extra');
const path = require('path');

// Ensure dist directory exists
fs.ensureDirSync('dist');

// Copy public files to dist
fs.copySync('public', 'dist', {
    filter: (src) => {
        // Don't copy the bundle.js as webpack will generate it
        return !src.endsWith('bundle.js');
    }
});

console.log('Static files copied to dist directory');
