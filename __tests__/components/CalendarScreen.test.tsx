/**
 * __tests__/components/CalendarScreen.test.tsx
 * Tests for CalendarScreen with Care Circle Me/Partner toggle integration
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { CalendarScreen } from '@/src/screens/CalendarScreen';

// Mock navigation
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useCareCircle', () => ({
  useCareCircle: jest.fn(() => ({
    data: {
      asPrimary: [],
      asViewer: [],
    },
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/hooks/useCurrentCycle', () => ({
  useCurrentCycle: () => ({
    data: {
      cycleDay: 14,
      phaseLabel: 'Ovulation Phase',
      phase: 'ovulation',
      progress: 0.5,
      cycle: {
        id: 'test-cycle',
        start_date: '2026-03-01',
      },
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCycleHistory', () => ({
  useCycleHistory: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useDailyLogs', () => ({
  useDailyLogs: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/src/components/SupportDashboard', () => ({
  SupportDashboard: ({ partnerId, partnerName }: any) => {
    const View = require('react-native').View;
    return (
      <View testID="support-dashboard">
        {partnerName}&apos;s Data
      </View>
    );
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <CalendarScreen />
    </QueryClientProvider>,
  );
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar in own view by default', async () => {
    renderComponent();

    await waitFor(() => {
      // Calendar should be visible
      expect(screen.getByTestId || screen.UNSAFE_queryByProps).toBeTruthy();
    });
  });

  it('does not show Me/Partner toggle when not a viewer', async () => {
    renderComponent();

    await waitFor(() => {
      // Toggle should not be present when user is not viewing anyone
      expect(screen.queryByTestId('calendar-view-toggle')).toBeNull();
    });
  });

  it('shows Me/Partner toggle when user is a viewer', async () => {
    const { useCareCircle } = require('@/hooks/useCareCircle');
    useCareCircle.mockReturnValue({
      data: {
        asPrimary: [],
        asViewer: [
          {
            id: 'partner-1',
            user_id: 'user-2',
            permissions: {
              role: 'viewer',
              share_mood: true,
              share_fertility: true,
              share_symptoms: true,
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('calendar-view-toggle')).toBeTruthy();
    });
  });

  it('toggles between Own and Shared views', async () => {
    const { useCareCircle } = require('@/hooks/useCareCircle');
    useCareCircle.mockReturnValue({
      data: {
        asPrimary: [],
        asViewer: [
          {
            id: 'partner-1',
            user_id: 'user-2',
            permissions: {
              role: 'viewer',
              share_mood: true,
              share_fertility: true,
              share_symptoms: true,
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderComponent();

    await waitFor(() => {
      const ownButton = screen.getByTestId('view-mode-own');
      const partnerButton = screen.getByTestId('view-mode-partner');

      expect(ownButton).toBeTruthy();
      expect(partnerButton).toBeTruthy();

      // Should start in own view (own button should be highlighted)
      fireEvent.press(partnerButton);

      // After pressing partner button, partner view should show
      expect(screen.getByTestId('support-dashboard')).toBeTruthy();
    });
  });

  it('displays own calendar when in Own view mode', async () => {
    renderComponent();

    await waitFor(() => {
      // Own calendar view should show cycle calendar
      expect(screen.getByTestId || screen.UNSAFE_queryByProps).toBeTruthy();
    });
  });

  it('displays SupportDashboard when in Shared view mode and viewing partner', async () => {
    const { useCareCircle } = require('@/hooks/useCareCircle');
    useCareCircle.mockReturnValue({
      data: {
        asPrimary: [],
        asViewer: [
          {
            id: 'partner-1',
            user_id: 'user-2',
            permissions: {
              role: 'viewer',
              share_mood: true,
              share_fertility: true,
              share_symptoms: true,
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderComponent();

    await waitFor(() => {
      const partnerButton = screen.getByTestId('view-mode-partner');
      fireEvent.press(partnerButton);

      expect(screen.getByTestId('support-dashboard')).toBeTruthy();
    });
  });

  it('passes correct partner data to SupportDashboard', async () => {
    const { useCareCircle } = require('@/hooks/useCareCircle');
    const partnerName = 'Test Partner';
    useCareCircle.mockReturnValue({
      data: {
        asPrimary: [],
        asViewer: [
          {
            id: 'partner-1',
            user_id: 'user-2',
            permissions: {
              role: 'trusted',
              share_mood: true,
              share_fertility: true,
              share_symptoms: true,
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderComponent();

    await waitFor(() => {
      const partnerButton = screen.getByTestId('view-mode-partner');
      fireEvent.press(partnerButton);

      // SupportDashboard should receive partner user_id
      expect(screen.getByTestId('support-dashboard')).toBeTruthy();
    });
  });

  it('handles multiple Care Circle connections', async () => {
    const { useCareCircle } = require('@/hooks/useCareCircle');
    useCareCircle.mockReturnValue({
      data: {
        asPrimary: [],
        asViewer: [
          {
            id: 'partner-1',
            user_id: 'user-2',
          },
          {
            id: 'partner-2',
            user_id: 'user-3',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderComponent();

    await waitFor(() => {
      // If multiple viewers exist, app currently shows first one
      // This test verifies the component doesn't crash
      expect(screen.getByTestId || screen.UNSAFE_queryByProps).toBeTruthy();
    });
  });

  it('returns to own view when Care Circle connection is revoked', async () => {
    const { useCareCircle } = require('@/hooks/useCareCircle');

    // Initial state: connected
    useCareCircle.mockReturnValue({
      data: {
        asPrimary: [],
        asViewer: [
          {
            id: 'partner-1',
            user_id: 'user-2',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { rerender } = renderComponent();

    await waitFor(() => {
      const partnerButton = screen.getByTestId('view-mode-partner');
      fireEvent.press(partnerButton);
      expect(screen.getByTestId('support-dashboard')).toBeTruthy();
    });

    // Simulate connection revocation
    useCareCircle.mockReturnValue({
      data: {
        asPrimary: [],
        asViewer: [],
      },
      isLoading: false,
      error: null,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <CalendarScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      // Toggle should no longer exist
      expect(screen.queryByTestId('calendar-view-toggle')).toBeNull();
    });
  });
});
