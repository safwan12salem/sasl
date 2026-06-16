// Run with: node scripts/translate.js
const fs = require('fs');
const path = require('path');

const languages = {
  'es': 'Spanish',
  'fr': 'French', 
  'it': 'Italian',
  'ja': 'Japanese',
  'hi': 'Hindi',
  'ar': 'Arabic',
  'pt-BR': 'Portuguese (Brazil)',
  'zh': 'Chinese'
};

// Copy English as base and create placeholder files for manual translation
const enPath = path.join(__dirname, '..', 'public', 'locales', 'en', 'translation.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

Object.entries(languages).forEach(([code, name]) => {
  const dirPath = path.join(__dirname, '..', 'public', 'locales', code);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  
  const filePath = path.join(dirPath, 'translation.json');
  if (!fs.existsSync(filePath)) {
    // Create with English as placeholder (will be translated)
    fs.writeFileSync(filePath, JSON.stringify(enData, null, 2));
    console.log(`Created ${name} (${code}) translation file`);
  }
});

console.log('Translation files ready for translation!');