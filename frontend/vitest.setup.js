import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Shared localStorage store for tests
const store = {};

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const key in store) delete store[key];
    }),
    keys: vi.fn(() => Object.keys(store)),
  },
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const key in store) delete store[key];
});
