/**
 * __tests__/components/InsightsScreen.test.tsx
 *
 * Component tests for InsightsScreen.
 * Verifies correct rendering of cycle history bars, symptom patterns,
 * and trend insights with mock data.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';

import { renderWithProviders } from "../testUtils";

const mockLogDataAccess = jest.fn();

jest.mock('@/lib/supabase');
jest.mock('@/lib/auth');
jest.mock('expo-router');
jest.mock('expo-haptics');

jest.mock('@/src/services/auditService', () => ({
  logDataAccess: (...args: any[]) => mockLogDataAccess(...args),
}));

jest.mock('@/hooks/useCycleHistory', () => ({
  useCycleHistory: jest.fn(),
}));

jest.mock('@/hooks/useDailyLogs', () => ({
  useDailyLogs: jest.fn(),
  useTodayLog: jest.fn(() => ({ data: null, isLoading: false })),
}));

import { InsightsScreen } from '@/src/screens/InsightsScreen';
import { useCycleHistory } from '@/hooks/useCycleHistory';
import { useDailyLogs } from '@/hooks/useDailyLogs';
import type { CompletedCycle, DailyLogRow, SymptomOption } from '@/types/database';

function makeCycle(startDate: string, length: number): CompletedCycle {
  return {
    id: `cycle-${startDate}`,
    user_id: 'user-1',
    start_date: startDate,
    end_date: new Date(new Date(startDate).getTime() + length * 864e5).toISOString().split('T')[0]!,
    cycle_length: length,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeLog(date: string, symptoms: SymptomOption[] = []): DailyLogRow {
  return {
    id: `log-${date}`,
    user_id: 'user-1',
    date,
    cycle_day: null,
    cycle_id: null,
    flow_level: null,
    mood: null,
    energy_level: null,
    symptoms,
    notes: null,
    hydration_glasses: null,
    sleep_hours: null,
    partner_alert: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('InsightsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogDataAccess.mockResolvedValue(undefined);
    (useCycleHistory as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    (useDailyLogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  });

  it('emits observability event for insights overview', () => {
    renderWithProviders(<InsightsScreen />);

    expect(mockLogDataAccess).toHaveBeenCalledWith(
      'cycle_data',
      'view',
      expect.objectContaining({ source: 'insights_overview' }),
    );
  });

  it('renders without crashing', () => {
    expect(() => renderWithProviders(<InsightsScreen />)).not.toThrow();
  });

  it('shows page title "Body Trends"', () => {
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText(/Body/)).toBeTruthy();
  });

  it('shows "Cycle History" section header', () => {
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText('Cycle History')).toBeTruthy();
  });

  it('shows "Symptom Patterns" section header', () => {
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText('Symptom Patterns')).toBeTruthy();
  });

  it('shows empty state when no cycles available', () => {
    (useCycleHistory as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText(/Complete your first cycle/)).toBeTruthy();
  });

  it('shows empty state when no symptoms logged', () => {
    (useDailyLogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText(/Log symptoms to see patterns/)).toBeTruthy();
  });

  it('renders skeleton bars while loading', () => {
    (useCycleHistory as jest.Mock).mockReturnValue({ data: [], isLoading: true });
    (useDailyLogs as jest.Mock).mockReturnValue({ data: [], isLoading: true });
    // Should render loading state without errors
    expect(() => renderWithProviders(<InsightsScreen />)).not.toThrow();
  });

  it('shows cycle history bars when cycle data is available', () => {
    const cycles = [
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 30),
      makeCycle('2024-03-01', 29),
    ];
    (useCycleHistory as jest.Mock).mockReturnValue({ data: cycles, isLoading: false });
    renderWithProviders(<InsightsScreen />);
    // Month labels should appear
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Feb')).toBeTruthy();
    expect(screen.getByText('Mar')).toBeTruthy();
  });

  it('shows symptom tags when logs have symptoms', () => {
    const logs = [
      makeLog('2024-01-01', ['Cramps', 'Bloating']),
      makeLog('2024-01-02', ['Cramps']),
      makeLog('2024-01-03', ['Cramps']),
    ];
    (useDailyLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText('Cramps')).toBeTruthy();
  });

  it('shows "Keep Logging" trend when fewer than 2 cycles', () => {
    (useCycleHistory as jest.Mock).mockReturnValue({
      data: [makeCycle('2024-01-01', 28)],
      isLoading: false,
    });
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText('Keep Logging')).toBeTruthy();
  });

  it('shows "Very Regular" trend for consistent cycles', () => {
    const cycles = [
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 28),
    ];
    (useCycleHistory as jest.Mock).mockReturnValue({ data: cycles, isLoading: false });
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText('Very Regular')).toBeTruthy();
  });

  it('shows "Cycle Lengthening" for significantly longer last cycle', () => {
    const cycles = [
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 34), // delta +6
    ];
    (useCycleHistory as jest.Mock).mockReturnValue({ data: cycles, isLoading: false });
    renderWithProviders(<InsightsScreen />);
    expect(screen.getByText('Cycle Lengthening')).toBeTruthy();
  });
});
