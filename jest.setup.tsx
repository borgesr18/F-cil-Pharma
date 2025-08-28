import '@testing-library/jest-dom';
import React from 'react';

// Declarações de tipos para Jest
declare global {
  var jest: {
    fn: () => any;
    mock: (moduleName: string, factory?: () => any) => any;
  };
}

// Mocks mínimos de Next para testes
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  redirect: jest.fn(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

