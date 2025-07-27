describe('Complete User Flow - Resume Generation', () => {
  beforeEach(() => {
    cy.visit('/');

    // Mock AI responses for consistent testing
    cy.mockAIResponse({
      keywords: [
        { text: 'React', importance: 0.9, category: 'technical', frequency: 5 },
        { text: 'TypeScript', importance: 0.8, category: 'technical', frequency: 3 },
        { text: 'Node.js', importance: 0.7, category: 'technical', frequency: 2 }
      ],
      skills: [
        { name: 'Frontend Development', level: 4, category: 'technical' },
        { name: 'Problem Solving', level: 5, category: 'soft' }
      ],
      matchScore: 85,
      suggestions: ['Consider adding more backend experience', 'Highlight your React expertise'],
      processingTime: 2500
    });
  });

  it('should complete the full resume generation workflow', () => {
    // Step 1: Landing page should load quickly
    cy.measurePerformance().then((metrics) => {
      expect(metrics.fcp).to.be.lessThan(2000); // FCP < 2s
      expect(metrics.lcp).to.be.lessThan(2500); // LCP < 2.5s
    });

    // Step 2: Input job description
    cy.get('[data-testid="jd-input"]').should('be.visible');
    cy.get('[data-testid="jd-textarea"]').type(`
      Senior Frontend Developer
      
      Requirements:
      - 5+ years experience with React
      - Strong TypeScript skills
      - Experience with modern build tools
      - Knowledge of state management (Redux, Zustand)
      - Understanding of web performance optimization
      
      Nice to have:
      - Node.js backend experience
      - GraphQL knowledge
      - Testing frameworks (Jest, Cypress)
    `, { delay: 10 });

    // Verify character count updates
    cy.get('[data-testid="char-count"]').should('contain', '400+');

    // Step 3: Submit for analysis
    cy.get('[data-testid="analyze-button"]').click();

    // Verify loading state
    cy.get('[data-testid="ai-loading"]').should('be.visible');
    cy.get('[data-testid="progress-bar"]').should('be.visible');

    // Wait for AI processing to complete
    cy.waitForAIProcessing();

    // Step 4: Verify analysis results
    cy.get('[data-testid="analysis-results"]').should('be.visible');
    cy.get('[data-testid="match-score"]').should('contain', '85%');
    cy.get('[data-testid="keywords-list"]').should('contain', 'React');
    cy.get('[data-testid="keywords-list"]').should('contain', 'TypeScript');

    // Step 5: Check skill matching visualization
    cy.get('[data-testid="skill-radar-chart"]').should('be.visible');
    cy.get('[data-testid="skill-bar-chart"]').should('be.visible');

    // Test chart interactions
    cy.get('[data-testid="skill-radar-chart"] svg').trigger('mouseover');
    cy.get('[data-testid="chart-tooltip"]').should('be.visible');

    // Step 6: Navigate to resume generation
    cy.get('[data-testid="generate-resume-button"]').click();
    cy.url().should('include', '/results');

    // Step 7: Customize resume content
    cy.get('[data-testid="resume-editor"]').should('be.visible');
    cy.get('[data-testid="personal-info-section"]').should('be.visible');

    // Fill in personal information
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="phone-input"]').type('+1-555-0123');

    // Step 8: Export to PDF
    cy.get('[data-testid="export-pdf-button"]').click();

    // Verify PDF generation loading
    cy.get('[data-testid="pdf-generating"]').should('be.visible');

    // Wait for PDF generation to complete (should be < 5s)
    cy.get('[data-testid="pdf-download-link"]', { timeout: 8000 }).should('be.visible');

    // Step 9: Verify download functionality
    cy.get('[data-testid="pdf-download-link"]').should('have.attr', 'download');

    // Step 10: Check history page
    cy.get('[data-testid="nav-history"]').click();
    cy.url().should('include', '/history');
    cy.get('[data-testid="history-item"]').should('have.length.at.least', 1);
  });

  it('should handle AI processing errors gracefully', () => {
    // Mock API error
    cy.intercept('POST', '**/api/analyze', {
      statusCode: 500,
      body: { error: 'AI service temporarily unavailable' }
    }).as('aiError');

    cy.get('[data-testid="jd-textarea"]').type('Test job description');
    cy.get('[data-testid="analyze-button"]').click();

    // Verify error handling
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'temporarily unavailable');
    cy.get('[data-testid="retry-button"]').should('be.visible');

    // Test retry functionality
    cy.mockAIResponse({ matchScore: 75, keywords: [], skills: [], suggestions: [], processingTime: 1000 });
    cy.get('[data-testid="retry-button"]').click();
    cy.waitForAIProcessing();
    cy.get('[data-testid="analysis-results"]').should('be.visible');
  });

  it('should work offline with cached models', () => {
    // First, load the page online to cache models
    cy.visit('/');
    cy.get('[data-testid="jd-textarea"]').type('Frontend developer position');
    cy.get('[data-testid="analyze-button"]').click();
    cy.waitForAIProcessing();

    // Simulate offline mode
    cy.window().then((win) => {
      // Override navigator.onLine
      Object.defineProperty(win.navigator, 'onLine', {
        writable: true,
        value: false
      });

      // Trigger offline event
      win.dispatchEvent(new Event('offline'));
    });

    // Verify offline indicator
    cy.get('[data-testid="offline-indicator"]').should('be.visible');

    // Test that cached functionality still works
    cy.get('[data-testid="jd-textarea"]').clear().type('Another job description');
    cy.get('[data-testid="analyze-button"]').click();

    // Should use local Transformers.js model
    cy.get('[data-testid="using-local-model"]').should('be.visible');
    cy.waitForAIProcessing();
    cy.get('[data-testid="analysis-results"]').should('be.visible');
  });

  it('should maintain performance under load', () => {
    // Test with large job description
    const largeJD = 'Large job description '.repeat(200);

    cy.get('[data-testid="jd-textarea"]').type(largeJD);

    // Measure input performance
    cy.window().then((win) => {
      const startTime = win.performance.now();

      cy.get('[data-testid="analyze-button"]').click().then(() => {
        const endTime = win.performance.now();
        expect(endTime - startTime).to.be.lessThan(500); // UI should remain responsive
      });
    });

    cy.waitForAIProcessing();

    // Verify memory usage doesn't exceed limits
    cy.window().then((win) => {
      if ('memory' in win.performance) {
        const memory = (win.performance as any).memory;
        expect(memory.usedJSHeapSize).to.be.lessThan(100 * 1024 * 1024); // < 100MB
      }
    });
  });

  it('should be accessible to users with disabilities', () => {
    // Install axe-core for accessibility testing
    cy.injectAxe();

    // Check initial page accessibility
    cy.checkA11y();

    // Navigate through the flow and check accessibility at each step
    cy.get('[data-testid="jd-textarea"]').type('Test job description');
    cy.checkA11y();

    cy.get('[data-testid="analyze-button"]').click();
    cy.waitForAIProcessing();
    cy.checkA11y();

    // Test keyboard navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'jd-textarea');

    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'analyze-button');

    // Test screen reader announcements
    cy.get('[data-testid="analysis-results"]').should('have.attr', 'aria-live', 'polite');
    cy.get('[data-testid="match-score"]').should('have.attr', 'aria-label');
  });
});