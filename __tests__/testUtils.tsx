/**
 * __tests__/testUtils.tsx
 * Shared test utilities and providers
 */

import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/src/context/ThemeContext';

/**
 * Custom render function that wraps components with QueryClientProvider and ThemeProvider
 * Use this in tests instead of the default render() from @testing-library/react-native
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
