// jest.setup.js

// Mock the 'node-cron' module to prevent actual cron jobs from being executed in tests
jest.mock('node-cron', () => ({
    schedule: jest.fn(), // Mock cron.schedule to ensure no real cron jobs run during testing
  }));
  
  // If  need to set up other global mocks or configurations,  can add them here
  // For example, if  want to mock any global functions or modules
  
// Mock the 'fs' module if  dealing with file system operations
//   jest.mock('fs', () => ({
//     unlinkSync: jest.fn(), // Mock fs.unlinkSync if it's used in your code
//   }));
  
  // If you use any environment variables in your tests, set them here
  process.env.NODE_ENV = 'test'; // Set the environment to test
  
  // Can also add global setups for other testing utilities here, e.g.:
  // jest.setTimeout(30000); // Set global test timeout for long-running tests
  