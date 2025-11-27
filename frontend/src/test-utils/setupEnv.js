// Mock Vite's import.meta.env
const mockEnv = {
  VITE_API_URL: 'http://localhost:3001/api',
};

// Mock import.meta.env for tests
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: mockEnv,
    },
  },
  configurable: true,
  writable: true,
});

// Mock process.env for any Node.js environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
};
