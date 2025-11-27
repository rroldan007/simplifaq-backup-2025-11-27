#!/usr/bin/env node

/**
 * Verification Script: API Response Format
 * 
 * Checks that all API responses follow the standard format
 * Run before committing: node scripts/verify-api-format.js
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '../backend/src');
const ERRORS = [];
const WARNINGS = [];

// Patterns to check
const ANTI_PATTERNS = [
  {
    pattern: /res\.json\(\s*\{\s*success:\s*true,\s*data:\s*\{[^}]+\}\s*\}\s*\)/g,
    message: 'Found nested object in response. Use successResponse(data) instead of { success: true, data: { items } }',
    severity: 'error'
  },
  {
    pattern: /prisma\..*\.findMany\([^)]*\)[\s\S]*?res\.json\([^)]*\{[^}]*\}[^)]*\)/g,
    message: 'Possible incorrect response format after findMany. Ensure you return the array directly.',
    severity: 'warning'
  },
  {
    pattern: /where:\s*\{[^}]*\}(?!.*userId)/g,
    message: 'Query without userId filter. This might be a security issue.',
    severity: 'error'
  }
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(BACKEND_DIR, filePath);
  
  ANTI_PATTERNS.forEach(({ pattern, message, severity }) => {
    const matches = content.match(pattern);
    if (matches) {
      const issue = `${relativePath}: ${message}`;
      if (severity === 'error') {
        ERRORS.push(issue);
      } else {
        WARNINGS.push(issue);
      }
    }
  });
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      checkFile(filePath);
    }
  });
}

console.log('🔍 Verificando formato de respuestas API...\n');

scanDirectory(BACKEND_DIR);

if (WARNINGS.length > 0) {
  console.log('⚠️  ADVERTENCIAS:');
  WARNINGS.forEach(w => console.log(`  - ${w}`));
  console.log('');
}

if (ERRORS.length > 0) {
  console.log('❌ ERRORES:');
  ERRORS.forEach(e => console.log(`  - ${e}`));
  console.log('\n💡 Sugerencia: Usa successResponse() de utils/apiResponse.ts\n');
  process.exit(1);
} else {
  console.log('✅ Todo correcto!\n');
  process.exit(0);
}
