describe('AI Functionality Accuracy and Consistency Tests', () => {
  const TEST_CASES = [
    {
      name: 'Frontend Developer JD',
      input: `
        Senior Frontend Developer
        
        Requirements:
        - 5+ years React experience
        - TypeScript proficiency
        - Modern build tools (Webpack, Vite)
        - State management (Redux, Zustand)
        - Testing frameworks (Jest, Cypress)
        - Performance optimization
        
        Nice to have:
        - Node.js backend experience
        - GraphQL knowledge
        - AWS cloud services
      `,
      expectedKeywords: ['React', 'TypeScript', 'Webpack', 'Vite', 'Redux', 'Zustand', 'Jest', 'Cypress'],
      expectedSkills: ['Frontend Development', 'JavaScript', 'Testing'],
      minMatchScore: 70
    },
    {
      name: 'Backend Developer JD',
      input: `
        Backend Developer Position
        
        Requirements:
        - Python or Java expertise
        - Database design (PostgreSQL, MongoDB)
        - API development (REST, GraphQL)
        - Cloud platforms (AWS, GCP)
        - Microservices architecture
        - Docker containerization
        
        Preferred:
        - Kubernetes orchestration
        - CI/CD pipelines
        - Security best practices
      `,
      expectedKeywords: ['Python', 'Java', 'PostgreSQL', 'MongoDB', 'REST', 'GraphQL', 'AWS', 'Docker'],
      expectedSkills: ['Backend Development', 'Database Design', 'API Development'],
      minMatchScore: 65
    },
    {
      name: 'Full Stack Developer JD',
      input: `
        Full Stack Developer
        
        Requirements:
        - Frontend: React, Vue.js, or Angular
        - Backend: Node.js, Python, or Java
        - Database: SQL and NoSQL
        - Version control: Git
        - Agile methodologies
        
        Bonus:
        - Mobile development
        - DevOps experience
        - Machine learning basics
      `,
      expectedKeywords: ['React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Java', 'SQL', 'Git'],
      expectedSkills: ['Full Stack Development', 'Frontend Development', 'Backend Development'],
      minMatchScore: 75
    }
  ];

  beforeEach(() => {
    cy.visit('/');
  });

  describe('Keyword Extraction Accuracy', () => {
    TEST_CASES.forEach((testCase) => {
      it(`should accurately extract keywords from ${testCase.name}`, () => {
        cy.get('[data-testid="jd-textarea"]').type(testCase.input);
        cy.get('[data-testid="analyze-button"]').click();
        cy.waitForAIProcessing();

        // Verify keyword extraction accuracy
        cy.get('[data-testid="keywords-list"]').within(() => {
          testCase.expectedKeywords.forEach((keyword) => {
            cy.contains(keyword).should('exist');
          });
        });

        // Verify keyword importance scoring
        cy.get('[data-testid="keyword-item"]').should('have.length.at.least', 5);
        cy.get('[data-testid="keyword-importance"]').each(($el) => {
          const importance = parseFloat($el.text());
          expect(importance).to.be.within(0, 1);
        });
      });
    });
  });

  describe('Skill Matching Accuracy', () => {
    TEST_CASES.forEach((testCase) => {
      it(`should accurately match skills for ${testCase.name}`, () => {
        cy.get('[data-testid="jd-textarea"]').type(testCase.input);
        cy.get('[data-testid="analyze-button"]').click();
        cy.waitForAIProcessing();

        // Verify skill matching
        cy.get('[data-testid="skills-list"]').within(() => {
          testCase.expectedSkills.forEach((skill) => {
            cy.contains(skill).should('exist');
          });
        });

        // Verify match score is reasonable
        cy.get('[data-testid="match-score"]').then(($el) => {
          const score = parseInt($el.text().replace('%', ''));
          expect(score).to.be.at.least(testCase.minMatchScore);
        });
      });
    });
  });

  describe('AI Consistency Tests', () => {
    it('should produce consistent results for identical inputs', () => {
      const testInput = TEST_CASES[0].input;
      const results = [];

      // Run the same analysis 3 times
      for (let i = 0; i < 3; i++) {
        cy.get('[data-testid="jd-textarea"]').clear().type(testInput);
        cy.get('[data-testid="analyze-button"]').click();
        cy.waitForAIProcessing();

        // Collect results
        cy.get('[data-testid="match-score"]').then(($score) => {
          cy.get('[data-testid="keywords-list"] [data-testid="keyword-item"]').then(($keywords) => {
            results.push({
              score: parseInt($score.text().replace('%', '')),
              keywordCount: $keywords.length,
              keywords: Array.from($keywords).map(el => el.textContent)
            });

            if (results.length === 3) {
              // Verify consistency
              const scores = results.map(r => r.score);
              const maxScoreDiff = Math.max(...scores) - Math.min(...scores);
              expect(maxScoreDiff, 'Score consistency').to.be.lessThan(10); // Within 10% variance

              const keywordCounts = results.map(r => r.keywordCount);
              const maxCountDiff = Math.max(...keywordCounts) - Math.min(...keywordCounts);
              expect(maxCountDiff, 'Keyword count consistency').to.be.lessThan(3); // Within 3 keywords
            }
          });
        });
      }
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        { name: 'Empty input', input: '', shouldError: true },
        { name: 'Very short input', input: 'Developer', shouldError: false },
        { name: 'Very long input', input: 'Developer position '.repeat(500), shouldError: false },
        { name: 'Special characters', input: 'Developer @#$%^&*()_+ position', shouldError: false },
        { name: 'Non-English text', input: '开发者职位要求', shouldError: false }
      ];

      edgeCases.forEach((edgeCase) => {
        cy.get('[data-testid="jd-textarea"]').clear().type(edgeCase.input);
        cy.get('[data-testid="analyze-button"]').click();

        if (edgeCase.shouldError) {
          cy.get('[data-testid="error-message"]').should('be.visible');
        } else {
          cy.waitForAIProcessing();
          cy.get('[data-testid="analysis-results"]').should('be.visible');
        }
      });
    });
  });

  describe('AI Engine Comparison', () => {
    it('should compare GPT-4o and Transformers.js results', () => {
      const testInput = TEST_CASES[0].input;
      const results = {};

      // Test with GPT-4o (if available)
      cy.get('[data-testid="ai-engine-selector"]').select('gpt4o');
      cy.get('[data-testid="jd-textarea"]').type(testInput);
      cy.get('[data-testid="analyze-button"]').click();
      cy.waitForAIProcessing();

      cy.get('[data-testid="match-score"]').then(($score) => {
        results.gpt4o = {
          score: parseInt($score.text().replace('%', '')),
          processingTime: Date.now() // Simplified for demo
        };
      });

      // Test with Transformers.js
      cy.get('[data-testid="ai-engine-selector"]').select('transformers');
      cy.get('[data-testid="jd-textarea"]').clear().type(testInput);
      cy.get('[data-testid="analyze-button"]').click();
      cy.waitForAIProcessing();

      cy.get('[data-testid="match-score"]').then(($score) => {
        results.transformers = {
          score: parseInt($score.text().replace('%', '')),
          processingTime: Date.now() // Simplified for demo
        };

        // Compare results
        const scoreDiff = Math.abs(results.gpt4o.score - results.transformers.score);
        expect(scoreDiff, 'AI engine score difference').to.be.lessThan(20); // Within 20% difference

        cy.log(`GPT-4o score: ${results.gpt4o.score}%, Transformers.js score: ${results.transformers.score}%`);
      });
    });
  });

  describe('Performance vs Accuracy Trade-offs', () => {
    it('should maintain accuracy under performance constraints', () => {
      const testInput = TEST_CASES[0].input;

      // Test with performance mode enabled
      cy.get('[data-testid="performance-mode"]').check();
      cy.get('[data-testid="jd-textarea"]').type(testInput);

      const startTime = Date.now();
      cy.get('[data-testid="analyze-button"]').click();
      cy.waitForAIProcessing().then(() => {
        const processingTime = Date.now() - startTime;

        // Should be faster in performance mode
        expect(processingTime).to.be.lessThan(3000);

        // But still maintain reasonable accuracy
        cy.get('[data-testid="match-score"]').then(($score) => {
          const score = parseInt($score.text().replace('%', ''));
          expect(score).to.be.at.least(60); // Minimum acceptable accuracy
        });
      });
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    it('should gracefully handle AI service failures', () => {
      // Mock API failure
      cy.intercept('POST', '**/api/analyze', {
        statusCode: 500,
        body: { error: 'AI service unavailable' }
      }).as('aiFailure');

      cy.get('[data-testid="jd-textarea"]').type('Test job description');
      cy.get('[data-testid="analyze-button"]').click();

      // Should show error and offer fallback
      cy.get('[data-testid="error-message"]').should('contain', 'AI service unavailable');
      cy.get('[data-testid="fallback-option"]').should('be.visible');

      // Test fallback to local model
      cy.get('[data-testid="use-local-model"]').click();
      cy.waitForAIProcessing();
      cy.get('[data-testid="analysis-results"]').should('be.visible');
    });

    it('should handle partial AI responses', () => {
      // Mock partial response
      cy.intercept('POST', '**/api/analyze', {
        statusCode: 200,
        body: {
          keywords: [{ text: 'React', importance: 0.9, category: 'technical', frequency: 3 }],
          skills: [], // Missing skills
          matchScore: null, // Missing score
          suggestions: ['Partial suggestion'],
          processingTime: 1000
        }
      }).as('partialResponse');

      cy.get('[data-testid="jd-textarea"]').type('Test job description');
      cy.get('[data-testid="analyze-button"]').click();

      cy.wait('@partialResponse');

      // Should handle missing data gracefully
      cy.get('[data-testid="keywords-list"]').should('contain', 'React');
      cy.get('[data-testid="match-score"]').should('contain', 'N/A');
      cy.get('[data-testid="incomplete-analysis-warning"]').should('be.visible');
    });
  });
});