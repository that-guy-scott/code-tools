// Global test setup
import { beforeEach, afterEach } from 'vitest';
import sinon from 'sinon';

// Global cleanup after each test
afterEach(() => {
  sinon.restore();
});

// Suppress console logs in tests unless explicitly needed
beforeEach(() => {
  if (!process.env.VERBOSE_TESTS) {
    sinon.stub(console, 'log');
    sinon.stub(console, 'error');
    sinon.stub(console, 'warn');
  }
});