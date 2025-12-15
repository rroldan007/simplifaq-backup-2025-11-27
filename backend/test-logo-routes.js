// Test if logoRoutes can be loaded
console.log('Testing logoRoutes import...');

try {
  const path = require('path');
  // Try to require the compiled version
  const routesPath = path.join(__dirname, 'src/routes/logoRoutes');
  console.log('Attempting to load:', routesPath);
  
  require('ts-node/register');
  const logoRoutes = require('./src/routes/logoRoutes.ts');
  
  console.log('✅ logoRoutes loaded successfully');
  console.log('Is it a Router?', typeof logoRoutes.default);
  console.log('Stack:', logoRoutes.default.stack?.length, 'routes');
  
  if (logoRoutes.default && logoRoutes.default.stack) {
    console.log('\nRoutes found:');
    logoRoutes.default.stack.forEach((layer, i) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        console.log(`  ${i + 1}. ${methods} ${layer.route.path}`);
      }
    });
  }
} catch (error) {
  console.error('❌ Error loading logoRoutes:', error.message);
  console.error('Stack:', error.stack);
}
