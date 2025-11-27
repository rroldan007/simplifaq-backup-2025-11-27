// Import the jest-dom library for custom matchers
import '@testing-library/jest-dom';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';

// Only set TextEncoder/TextDecoder if they don't exist in the global scope
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = NodeTextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = NodeTextDecoder as typeof global.TextDecoder;
}

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _store: store, // For test debugging
  };
};

// Initialize default localStorage mock
const localStorageMock = createLocalStorageMock();

// Only define window.localStorage if it's not already defined
if (!('localStorage' in window)) {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });
}

// Also add to global for Node.js environment
if (typeof global.localStorage === 'undefined') {
  (global as unknown as { localStorage: Storage }).localStorage = localStorageMock as unknown as Storage;
}

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});