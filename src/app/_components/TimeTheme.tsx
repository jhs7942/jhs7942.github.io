"use client";

import { useEffect } from "react";

type ThemeName = "day" | "sunset" | "night";
type GreetingPeriod = "morning" | "day" | "evening";

function getTheme(hour: number): ThemeName {
  if (hour >= 6 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}

function getGreetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "day";
  return "evening";
}

function applyTheme() {
  const now = new Date();
  const theme = getTheme(now.getHours());
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.greeting = getGreetingPeriod(now.getHours());

  const boundaryHour = [6, 12, 17, 18, 20].find(
    (hour) => hour > now.getHours(),
  );
  const nextBoundary = new Date(now);
  if (boundaryHour === undefined)
    nextBoundary.setDate(nextBoundary.getDate() + 1);
  nextBoundary.setHours(boundaryHour ?? 6, 0, 0, 0);

  return window.setTimeout(
    applyTheme,
    Math.max(nextBoundary.getTime() - now.getTime(), 1000),
  );
}

export function TimeTheme() {
  useEffect(() => {
    const timeoutId = applyTheme();
    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}
