"use client";

import { useMemo } from "react";

type DynamicGreetingProps = {
  name: string;
  className?: string;
};

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 22) return "Good Evening";
  return "Good Night";
}

export default function DynamicGreeting({
  name,
  className,
}: DynamicGreetingProps) {
  const greeting = useMemo(() => getGreeting(new Date()), []);

  return (
    <h3 className={className}>
      {greeting},
      <br />
      {name}
    </h3>
  );
}
