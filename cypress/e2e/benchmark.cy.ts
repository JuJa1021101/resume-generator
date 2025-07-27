describe('Performance Benchmark Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    FCP: 1800, // First Contentful Paint < 1.8s
    LCP: 2500, // Largest Contentful Paint < 2.5s
    FID: 100,  // First Input Delay < 100ms
    CLS: 0.1,  // Cumulative Layout Shift < 0.1
    TTFB: 800, // Time to First Byte < 800ms
    AI_PROCESSING: 5000, // AI processing < 5s
    PDF_GENERATION: 3000, // PDF generation < 3s
    MEMORY_USAGE: 150 * 1024 * 1024 // Memory usage < 150MB
  };

  beforeEach(() => {
    // Clear all caches and storage
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.window().then((win) => {
      if ('caches' in win) {
        win.caches.keys().then((names) => {
          names.forEach((name) => {
            win.caches.delete(name);
          });
        });
      }
    });
  });

  it('should meet Core Web Vitals benchmarks', () => {
    const startTime = Date.now();

    cy.visit('/');

    // Measure and verify Core Web Vitals
    cy.measurePerformance().then((metrics) => {
      expect(metrics.fcp, 'First Contentful Paint').to.be.lessThan(PERFORMANCE_THRESHOLDS.FCP);
      expect(metrics.lcp, 'Largest Contentful Paint').to.be.lessThan(PERFORMANCE_THRESHOLDS.LCP);
      expect(metrics.fid, 'First Input Delay').to.be.lessThan(PERFORMANCE_THRESHOLDS.FID);
      expect(metrics.cls, 'Cumulative Layout Shift').to.be.lessThan(PERFORMANCE_THRESHOLDS.CLS);
      expect(metrics.ttfb, 'Time to First Byte').to.be.lessThan(PERFORMANCE_THRESHOLDS.TTFB);

      // Log performance metrics for reporting
      cy.log(`Performance Metrics:
        FCP: ${metrics.fcp}ms (threshold: ${PERFORMANCE_THRESHOLDS.FCP}ms)
        LCP: ${metrics.lcp}ms (threshold: ${PERFORMANCE_THRESHOLDS.LCP}ms)
        FID: ${metrics.fid}ms (threshold: ${PERFORMANCE_THRESHOLDS.FID}ms)
        CLS: ${metrics.cls} (threshold: ${PERFORMANCE_THRESHOLDS.CLS})
        TTFB: ${metrics.ttfb}ms (threshold: ${PERFORMANCE_THRESHOLDS.TTFB}ms)`);
    });
  });

  it('should benchmark AI processing performance', () => {
    cy.visit('/');

    // Test different input sizes
    const testCases = [
      { name: 'Small JD', content: 'Frontend developer position', expectedTime: 2000 },
      { name: 'Medium JD', content: 'Frontend developer position '.repeat(50), expectedTime: 3000 },
      { name: 'Large JD', content: 'Frontend developer position '.repeat(100), expectedTime: 5000 }
    ];

    testCases.forEach((testCase) => {
      cy.get('[data-testid="jd-textarea"]').clear().type(testCase.content);

      const startTime = Date.now();
      cy.get('[data-testid="analyze-button"]').click();

      cy.waitForAIProcessing().then(() => {
        const processingTime = Date.now() - startTime;
        expect(processingTime, `${testCase.name} processing time`).to.be.lessThan(testCase.expectedTime);

        cy.log(`${testCase.name}: ${processingTime}ms (expected: <${testCase.expectedTime}ms)`);
      });
    });
  });

  it('should benchmark PDF generation performance', () => {
    cy.visit('/');

    // Setup test data
    cy.mockAIResponse({
      matchScore: 85,
      keywords: Array.from({ length: 20 }, (_, i) => ({
        text: `Keyword${i}`,
        importance: Math.random(),
        category: 'technical',
        frequency: Math.floor(Math.random() * 10)
      })),
      skills: Array.from({ length: 10 }, (_, i) => ({
        name: `Skill${i}`,
        level: Math.floor(Math.random() * 5) + 1,
        category: 'technical'
      })),
      suggestions: ['Suggestion 1', 'Suggestion 2'],
      processingTime: 1000
    });

    cy.get('[data-testid="jd-textarea"]').type('Test job description');
    cy.get('[data-testid="analyze-button"]').click();
    cy.waitForAIProcessing();

    // Navigate to results and test PDF generation
    cy.get('[data-testid="generate-resume-button"]').click();

    const startTime = Date.now();
    cy.get('[data-testid="export-pdf-button"]').click();

    cy.get('[data-testid="pdf-download-link"]', { timeout: 10000 }).should('exist').then(() => {
      const pdfGenerationTime = Date.now() - startTime;
      expect(pdfGenerationTime, 'PDF generation time').to.be.lessThan(PERFORMANCE_THRESHOLDS.PDF_GENERATION);

      cy.log(`PDF Generation: ${pdfGenerationTime}ms (threshold: ${PERFORMANCE_THRESHOLDS.PDF_GENERATION}ms)`);
    });
  });

  it('should benchmark memory usage', () => {
    cy.visit('/');

    // Perform multiple operations to test memory management
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="jd-textarea"]').clear().type(`Job description ${i}`);
      cy.get('[data-testid="analyze-button"]').click();
      cy.waitForAIProcessing();

      // Check memory usage
      cy.window().then((win) => {
        if ('memory' in win.performance) {
          const memory = (win.performance as any).memory;
          expect(memory.usedJSHeapSize, `Memory usage after operation ${i}`).to.be.lessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE);

          cy.log(`Memory usage after operation ${i}: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
      });
    }
  });

  it('should benchmark caching efficiency', () => {
    cy.visit('/');

    // First load - should cache models and data
    cy.get('[data-testid="jd-textarea"]').type('Test job description');

    const firstLoadStart = Date.now();
    cy.get('[data-testid="analyze-button"]').click();
    cy.waitForAIProcessing().then(() => {
      const firstLoadTime = Date.now() - firstLoadStart;

      // Second load - should use cache
      cy.get('[data-testid="jd-textarea"]').clear().type('Another test description');

      const secondLoadStart = Date.now();
      cy.get('[data-testid="analyze-button"]').click();
      cy.waitForAIProcessing().then(() => {
        const secondLoadTime = Date.now() - secondLoadStart;

        // Second load should be significantly faster
        const improvement = (firstLoadTime - secondLoadTime) / firstLoadTime;
        expect(improvement, 'Cache performance improvement').to.be.greaterThan(0.2); // At least 20% improvement

        cy.log(`First load: ${firstLoadTime}ms, Second load: ${secondLoadTime}ms, Improvement: ${(improvement * 100).toFixed(1)}%`);
      });
    });
  });

  it('should benchmark concurrent operations', () => {
    cy.visit('/');

    // Test multiple concurrent operations
    const operations = [];
    const startTime = Date.now();

    // Simulate concurrent user actions
    for (let i = 0; i < 3; i++) {
      operations.push(
        cy.window().then((win) => {
          return new Promise((resolve) => {
            // Simulate concurrent API calls
            setTimeout(() => {
              fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `Concurrent test ${i}` })
              }).then(resolve);
            }, i * 100);
          });
        })
      );
    }

    cy.wrap(Promise.all(operations)).then(() => {
      const totalTime = Date.now() - startTime;
      expect(totalTime, 'Concurrent operations time').to.be.lessThan(8000); // Should handle concurrency efficiently

      cy.log(`Concurrent operations completed in: ${totalTime}ms`);
    });
  });

  it('should benchmark network performance', () => {
    // Test with network throttling
    cy.visit('/', {
      onBeforeLoad: (win) => {
        // Simulate slow network
        Object.defineProperty(win.navigator, 'connection', {
          value: {
            effectiveType: '3g',
            downlink: 1.5,
            rtt: 300
          }
        });
      }
    });

    cy.measurePerformance().then((metrics) => {
      // Even with slow network, should meet reasonable thresholds
      expect(metrics.fcp, 'FCP with slow network').to.be.lessThan(3000);
      expect(metrics.lcp, 'LCP with slow network').to.be.lessThan(4000);

      cy.log(`Slow network performance - FCP: ${metrics.fcp}ms, LCP: ${metrics.lcp}ms`);
    });
  });
});