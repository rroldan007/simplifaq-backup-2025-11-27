const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/src/controllers/authController.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the select block to include logoUrl
const oldPattern = /(\s+website: true,\n)(\s+language: true,)/;
const replacement = '$1        logoUrl: true,\n$2';

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, replacement);
    
    // Write the file back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully added logoUrl: true to the select block');
    console.log('🔄 Please restart your backend server now');
} else {
    console.log('❌ Could not find the pattern to replace');
    console.log('📝 Please manually add "logoUrl: true," after "website: true," in the select block');
}
