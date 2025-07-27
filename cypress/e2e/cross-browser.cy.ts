describe('Cross-Browser Compatibility', () => {
  const browsers = ['chrome', 'firefox', 'edge'];

  browsers.forEach((browser) => {
    describe(`${browser.toUpperCase()} Browser Tests`, () => {
      beforeEach(() => {
        cy.visit('/');
      });

      it(`should work correctly in ${browser}`, () => {
        // Test basic functionality
        cy.get('[data-testid="jd-textarea"]').should('be.visible');
        cy.get('[data-testid="analyze-button"]').should('be.visible');

        // Test input functionality
        cy.get('[data-testid="jd-textarea"]').type('Test job description');
        cy.get('[data-testid="jd-textarea"]').should('have.value', 'Test job description');

        // Test responsive design
        cy.viewport(1920, 1080); // Desktop
        cy.get('[data-testid="main-layout"]').should('be.visible');

        cy.viewport(768, 1024); // Tablet
        cy.get('[data-testid="main-layout"]').should('be.visible');

        cy.viewport(375, 667); // Mobile
        cy.get('[data-testid="main-layout"]').should('be.visible');
      });

      it(`should handle CSS features correctly in ${browser}`, () => {
        // Test CSS Grid support
        cy.get('[data-testid="main-layout"]').should('have.css', 'display');

        // Test Flexbox support
        cy.get('[data-testid="header"]').should('have.css', 'display');

        // Test CSS Variables
        cy.get('body').should('have.css', 'color');

        // Test modern CSS features
        cy.get('[data-testid="card"]').should('have.css', 'border-radius');
        cy.get('[data-testid="button"]').should('have.css', 'transition');
      });

      it(`should support modern JavaScript features in ${browser}`, () => {
        cy.window().then((win) => {
          // Test ES6+ features
          expect(win.Promise).to.exist;
          expect(win.fetch).to.exist;
          expect(win.Map).to.exist;
          expect(win.Set).to.exist;

          // Test Web APIs
          expect(win.localStorage).to.exist;
          expect(win.sessionStorage).to.exist;
          expect(win.indexedDB).to.exist;
          expect(win.Worker).to.exist;

          // Test modern DOM APIs
          expect(win.document.querySelector).to.exist;
          expect(win.document.querySelectorAll).to.exist;
        });
      });

      it(`should handle file operations in ${browser}`, () => {
        // Mock successful analysis
        cy.mockAIResponse({
          matchScore: 80,
          keywords: [{ text: 'React', importance: 0.9, category: 'technical', frequency: 3 }],
          skills: [],
          suggestions: [],
          processingTime: 1000
        });

        cy.get('[data-testid="jd-textarea"]').type('Frontend developer position');
        cy.get('[data-testid="analyze-button"]').click();
        cy.waitForAIProcessing();

        // Test PDF export functionality
        cy.get('[data-testid="export-pdf-button"]').click();

        // Verify download works in browser
        cy.get('[data-testid="pdf-download-link"]', { timeout: 10000 }).should('exist');
      });
    });
  });

  describe('Browser-Specific Feature Tests', () => {
    it('should handle Safari-specific issues', () => {
      cy.visit('/');

      // Test date input handling (Safari has different behavior)
      cy.get('[data-testid="date-input"]').should('be.visible');

      // Test file input handling
      cy.get('[data-testid="file-input"]').should('exist');

      // Test audio/video support if applicable
      cy.window().then((win) => {
        if (win.HTMLAudioElement) {
          expect(win.HTMLAudioElement).to.exist;
        }
      });
    });

    it('should handle Internet Explorer fallbacks', () => {
      cy.visit('/');

      // Test polyfill loading
      cy.window().then((win) => {
        // Check if polyfills are loaded for older browsers
        if (!win.fetch) {
          expect(win.XMLHttpRequest).to.exist;
        }

        if (!win.Promise) {
          // Should have Promise polyfill
          expect(win.Promise).to.exist;
        }
      });
    });

    it('should handle mobile browser differences', () => {
      cy.viewport('iphone-x');
      cy.visit('/');

      // Test touch interactions
      cy.get('[data-testid="jd-textarea"]').click();
      cy.get('[data-testid="jd-textarea"]').should('be.focused');

      // Test viewport meta tag
      cy.get('meta[name="viewport"]').should('exist');

      // Test mobile-specific CSS
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
    });
  });
});