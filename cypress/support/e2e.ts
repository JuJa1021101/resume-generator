// Import commands.js using ES2015 syntax:
import './commands';
import '@cypress/code-coverage/support';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // that might occur during AI processing or async operations
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  return true;
});

// Performance monitoring setup
beforeEach(() => {
  cy.window().then((win) => {
    // Clear performance marks before each test
    win.performance.clearMarks();
    win.performance.clearMeasures();
  });
});