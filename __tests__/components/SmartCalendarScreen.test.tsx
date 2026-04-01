import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { SmartCalendarScreen } from '@/src/screens/SmartCalendarScreen';

const mockCreateFromText = jest.fn();

jest.mock('react-native-gesture-handler', () => ({
  PinchGestureHandler: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/useSmartCalendar', () => ({
  useSmartCalendar: () => ({
    events: [
      {
        id: 'evt-1',
        userId: 'user-1',
        title: 'Morning Workout',
        startTime: '2026-04-01T07:00:00',
        endTime: '2026-04-01T08:00:00',
        type: 'manual',
        location: 'Gym',
        tags: ['fitness'],
        participants: [],
        recurrence: null,
        metadata: {},
      },
      {
        id: 'evt-2',
        userId: 'user-1',
        title: 'Daily check-in',
        startTime: '2026-04-01T08:00:00',
        endTime: '2026-04-01T08:20:00',
        type: 'log',
        location: null,
        tags: ['mood'],
        participants: [],
        recurrence: null,
        metadata: {},
      },
    ],
    suggestions: [
      {
        id: 's1',
        title: 'You usually workout around this time. Schedule it?',
        rationale: 'Based on recent fitness events',
        suggestedStartTime: '07:00',
        suggestedEndTime: '08:00',
        confidence: 0.82,
        source: 'habit',
        tags: ['fitness'],
      },
    ],
    logInsights: {
      totalLogs: 12,
      lowMoodCount: 3,
      avgSleepHours: 6.8,
      avgHydrationGlasses: 5.4,
      topSymptoms: ['Cramps', 'Bloating'],
      latestMood: 'Calm',
      latestEnergyLevel: 'High',
    },
    isLoading: false,
    isError: false,
    createFromText: (...args: unknown[]) => mockCreateFromText(...args),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderScreen() {
  return render(
    <QueryClientProvider client={queryClient}>
      <SmartCalendarScreen />
    </QueryClientProvider>,
  );
}

describe('SmartCalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFromText.mockResolvedValue({
      title: 'Workout',
      date: '2026-04-02',
      startTime: '07:00',
      endTime: '08:00',
      location: null,
      participants: [],
      tags: ['fitness'],
      recurrence: null,
      rawText: 'Workout tomorrow at 7 am',
      confidence: 0.9,
      needsReview: false,
      editableFields: ['title', 'date', 'startTime', 'endTime', 'location', 'participants', 'recurrence'],
    });
  });

  it('renders text-first input and today intelligence', () => {
    renderScreen();

    expect(screen.getByText('Smart Calendar')).toBeTruthy();
    expect(screen.getByText('Natural language input')).toBeTruthy();
    expect(screen.getByText('Today Intelligence')).toBeTruthy();
  });

  it('creates event from natural language input', async () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByPlaceholderText('Workout tomorrow at 7 am'),
      'Workout tomorrow at 7 am',
    );
    fireEvent.press(screen.getByText('Parse and add event'));

    await waitFor(() => {
      expect(mockCreateFromText).toHaveBeenCalledWith('Workout tomorrow at 7 am');
    });
  });

  it('opens year overview and shows month cards', () => {
    renderScreen();

    fireEvent.press(screen.getByText('Year'));

    expect(screen.getByText('January')).toBeTruthy();
    expect(screen.getAllByText(/logged days/i).length).toBeGreaterThan(0);
  });
});
