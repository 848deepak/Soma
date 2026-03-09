export function getCurrentPhaseLabel(phase: string) {
  const labels: Record<string, string> = {
    menstrual: 'Menstrual Phase',
    follicular: 'Follicular Phase',
    ovulation: 'Ovulation Phase',
    luteal: 'Luteal Phase',
  };

  return labels[phase] ?? 'Cycle Phase';
}
