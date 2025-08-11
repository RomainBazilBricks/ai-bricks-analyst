#!/bin/bash

# Script pour downgrader Vite si Node.js 22 ne fonctionne pas sur Railway

echo "Downgrading Vite to version compatible with Node.js 18/20..."

cd front
npm install vite@^5.4.0 --save-dev
cd ..

echo "Vite downgraded to v5.4.0 (compatible with Node.js 18+)"
echo "You can now run: git add . && git commit -m 'downgrade: Vite to v5.4.0 for Railway compatibility' && git push" 