import { Card } from '@/src/components/ui/Card';
import { Typography } from '@/src/components/ui/Typography';

type DailyInsightCardProps = {
  title: string;
  description: string;
};

export function DailyInsightCard({ title, description }: DailyInsightCardProps) {
  return (
    <Card className="mt-6">
      <Typography variant="helper" className="mb-2 uppercase tracking-wider text-secondary dark:text-darkSecondary">
        Daily Insight
      </Typography>
      <Typography variant="h2" className="mb-2">
        {title}
      </Typography>
      <Typography variant="muted">{description}</Typography>
    </Card>
  );
}
