// Import commands.js using ES2015 syntax:
import './commands';
import '@cypress/code-coverage/support';

// Import global styles
import '../../src/index.css';

// Mount command for component testing
import { mount } from 'cypress/react18';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);