#!/usr/bin/env node

/**
 * Security Test Runner
 * Execute this script to run the comprehensive security test suite
 */

const path = require('path');
const fs = require('fs');

// Mock modules before importing anything else
global.jest = {
  fn: (impl) => {
    const mockFn = impl || (() => {});
    mockFn.mockReturnValue = (value) => {
      const newFn = () => value;
      Object.setPrototypeOf(newFn, mockFn);
      return newFn;
    };
    mockFn.mockResolvedValue = (value) => {
      const newFn = () => Promise.resolve(value);
      Object.setPrototypeOf(newFn, mockFn);
      return newFn;
    };
    return mockFn;
  },
  mock: () => {}
};

// Mock React Native Alert
global.Alert = {
  alert: (title, message, buttons) => {
    console.log(`Alert: ${title} - ${message}`);
    if (buttons && buttons.length > 0) {
      const okButton = buttons.find(b => b.text === 'OK' || b.style !== 'cancel');
      if (okButton && okButton.onPress) {
        okButton.onPress();
      }
    }
  }
};

// Import and run tests
async function runTests() {
  console.log('🚀 Starting Security Test Suite...\n');
  
  try {
    // Load the test suite
    const SecurityTestSuite = require('./securityTestSuite');
    
    const suite = new SecurityTestSuite();
    await suite.runAllTests();
    
    // Exit with appropriate code
    const exitCode = suite.testResults.critical > 0 ? 2 : 
                     suite.testResults.failed > 0 ? 1 : 0;
    
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Failed to run security tests:', error);
    console.error(error.stack);
    process.exit(3);
  }
}

// Run the tests
runTests();
