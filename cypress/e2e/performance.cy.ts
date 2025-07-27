describe('Performance Testing', () => {
  beforeEach(() => {
    // Clear cache and storage before each test
    cy.clearLocalStorage();
    cy.clearCookies();

    // Clear IndexedDB
    cy.window().then((win) => {
      if ('indexedDB' in win) {
        const deleteReq = win.indexedDB.deleteDatabase('ai-resume-generator');
        deleteReq.onsuccess = () => console.log('Database delet     
   }
    });
  }
  });

it('should handle browser compatibility issues', () => {
  cy.visit('/');

  // Test IndexedDB support
  cy.window().then((win) => {
    expect(win.indexedDB).to.exist;
  });

  // Test Web Worker support
  cy.window().then((win) => {
    expect(win.Worker).to.exist;
  });

  // Test modern JavaScript features
  cy.window().then((win) => {
    expect(win.Promise).to.exist;
    expect(win.fetch).to.exist;
    expect(win.localStorage).to.exist;
  });

  // Test CSS Grid and Flexbox support
  cy.get('[data-testid="main-layout"]').should('have.css', 'display', 'grid');
});
});