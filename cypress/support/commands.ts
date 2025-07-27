/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to measure page performance
       */
      measurePerformance(): Chainable<PerformanceMetrics>;

      /**
       * Custom command to wait for AI processing to complete
       */
      waitForAIProcessing(): Chainable<void>;

      /**
       * Custom command to mock AI API responses
       */
      mockAIResponse(response: any): Chainable<void>;

      /**
       * Custom command to test accessibility
       */
      checkA11y(): Chainable<void>;
    }
  }
}

interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
}

// Performance measurement command
Cypress.Commands.add('measurePerformance', () => {
  return cy.window().then((win) => {
    return new Promise<PerformanceMetrics>((resolve) => {
      // Use PerformanceObserver to collect Web Vitals
      const observer = new win.PerformanceObserver((list) => {
        const entries = list.getEntries();
        const metrics: Partial<PerformanceMetrics> = {};

        entries.forEach((entry) => {
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              metrics.fcp = entry.startTime;
            }
          }
          if (entry.entryType === 'largest-contentful-paint') {
            metrics.lcp = entry.startTime;
          }
          if (entry.entryType === 'first-input') {
            metrics.fid = entry.processingStart - entry.startTime;
          }
          if (entry.entryType === 'layout-shift') {
            metrics.cls = (metrics.cls || 0) + entry.value;
          }
        });

        // Get TTFB from navigation timing
        const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          metrics.ttfb = navigation.responseStart - navigation.requestStart;
        }

        resolve(metrics as PerformanceMetrics);
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });

      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        resolve({
          fcp: 0,
          lcp: 0,
          fid: 0,
          cls: 0,
          ttfb: 0
        });
      }, 5000);
    });
  });
});

// Wait for AI processing command
Cypress.Commands.add('waitForAIProcessing', () => {
  // Wait for loading indicators to disappear
  cy.get('[data-testid="ai-loading"]', { timeout: 15000 }).should('not.exist');
  cy.get('[data-testid="progress-bar"]', { timeout: 15000 }).should('not.exist');

  // Wait for results to appear
  cy.get('[data-testid="analysis-results"]', { timeout: 15000 }).should('be.visible');
});

// Mock AI response command
Cypress.Commands.add('mockAIResponse', (response) => {
  cy.intercept('POST', '**/api/analyze', {
    statusCode: 200,
    body: response,
    delay: 1000 // Simulate processing time
  }).as('aiAnalysis');
});

// Accessibility check command
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y(null, null, (violations) => {
    violations.forEach((violation) => {
      cy.log(`A11y violation: ${violation.description}`);
      cy.log(`Impact: ${violation.impact}`);
      cy.log(`Help: ${violation.helpUrl}`);
    });
  });
});