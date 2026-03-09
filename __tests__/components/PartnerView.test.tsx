/**
 * __tests__/components/PartnerView.test.tsx
 *
 * Component tests for PartnerView.
 * Verifies rendering based on partner permissions and data availability.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@/lib/supabase');
jest.mock('@/lib/auth');
jest.mock('expo-router');
jest.mock('expo-haptics');

jest.mock('@/hooks/usePartnerLogs', () => ({
  usePartnerLogs: jest.fn(),
}));

import { PartnerView } from '@/src/components/PartnerView';
import { usePartnerLogs } from '@/hooks/usePartnerLogs';
import type { PartnerVisibleLog } from '@/types/database';

function makePartnerLog(overrides: Partial<PartnerVisibleLog> = {}): PartnerVisibleLog {
  return {
    id: 'log-1',
    user_id: 'partner-user-id',
    date: '2024-01-14',
    cycle_day: 14,
    cycle_id: 'cycle-1',
    flow_level: 2,
    mood: null,
    energy_level: 'High',
    symptoms: [],
    fertility_flow_level: null,
    partner_alert: false,
    updated_at: new Date().toISOString(),
    cycle_phase: null,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    ...overrides,
  };
}

describe('PartnerView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    expect(() => render(<PartnerView />)).not.toThrow();
  });

  it('shows loading state while data is fetching', () => {
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: [], isLoading: true });
    render(<PartnerView />);
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it('shows "No data yet" when partner has no logs', () => {
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText(/No data yet/)).toBeTruthy();
  });

  it('shows "Partner\'s Day" header', () => {
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText("Partner's Day")).toBeTruthy();
  });

  it('shows "Live" indicator when partner data is available', () => {
    const logs = [makePartnerLog()];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('shows partner alert when partner_alert is true', () => {
    const logs = [makePartnerLog({ partner_alert: true })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText(/sent a support alert/)).toBeTruthy();
  });

  it('hides partner alert when partner_alert is false', () => {
    const logs = [makePartnerLog({ partner_alert: false })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.queryByText(/sent a support alert/)).toBeNull();
  });

  it('shows mood when share_mood is enabled (mood not null)', () => {
    const logs = [makePartnerLog({ mood: 'Calm' })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText('Calm')).toBeTruthy();
    expect(screen.getByText('Feeling')).toBeTruthy();
  });

  it('hides mood section when share_mood not enabled (mood is null)', () => {
    const logs = [makePartnerLog({ mood: null })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.queryByText('Feeling')).toBeNull();
  });

  it('shows fertility data when share_fertility is enabled (cycle_phase not null)', () => {
    const logs = [makePartnerLog({ cycle_phase: 'ovulation', cycle_day: 14 })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText('Ovulation Window')).toBeTruthy();
    expect(screen.getByText('Day 14')).toBeTruthy();
  });

  it('hides fertility section when share_fertility not enabled (cycle_phase is null)', () => {
    const logs = [makePartnerLog({ cycle_phase: null })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.queryByText(/Ovulation/)).toBeNull();
  });

  it('shows symptoms when share_symptoms is enabled', () => {
    const logs = [makePartnerLog({ symptoms: ['Cramps', 'Bloating'] })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText('Cramps')).toBeTruthy();
    expect(screen.getByText('Bloating')).toBeTruthy();
    expect(screen.getByText('Symptoms today')).toBeTruthy();
  });

  it('hides symptoms section when share_symptoms not enabled (empty array)', () => {
    const logs = [makePartnerLog({ symptoms: [] })];
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.queryByText('Symptoms today')).toBeNull();
  });

  it('shows 7-day activity strip when logs are available', () => {
    const logs = Array.from({ length: 7 }, (_, i) => {
      const d = new Date('2024-01-14');
      d.setDate(d.getDate() - i);
      return makePartnerLog({ date: d.toISOString().split('T')[0]!, id: `log-${i}` });
    });
    (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
    render(<PartnerView />);
    expect(screen.getByText('Recent 7 days')).toBeTruthy();
  });

  it('shows phase label correctly for all phases', () => {
    const phases: [string, string][] = [
      ['menstrual', 'Menstrual Phase'],
      ['follicular', 'Follicular Phase'],
      ['ovulation', 'Ovulation Window'],
      ['luteal', 'Luteal Phase'],
    ];

    phases.forEach(([phase, label]) => {
      const logs = [makePartnerLog({ cycle_phase: phase as 'menstrual' | 'follicular' | 'ovulation' | 'luteal' })];
      (usePartnerLogs as jest.Mock).mockReturnValue({ data: logs, isLoading: false });
      const { unmount, getByText } = render(<PartnerView />);
      expect(getByText(label)).toBeTruthy();
      unmount();
    });
  });
});
