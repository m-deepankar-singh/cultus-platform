// Jest setup file for cache testing
require('dotenv').config({ path: '.env.local' });

// Mock console.log for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables if needed
process.env.NODE_ENV = 'test'; 