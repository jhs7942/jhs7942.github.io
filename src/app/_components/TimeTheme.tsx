"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type ThemeName = "day" | "sunset" | "night";
type GreetingPeriod = "morning" | "day" | "evening";

const THEME_STORAGE_KEY = "portfolio-theme";
const THEME_OPTIONS: ReadonlyArray<{ value: ThemeName; label: string }> = [
  { value: "day", label: "기본 테마" },
  { value: "sunset", label: "노을 테마" },
  { value: "night", label: "저녁 테마" },
];

function isThemeName(value: string | null): value is ThemeName {
  return value === "day" || value === "sunset" || value === "night";
}

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

function getNextBoundary(boundaryHours: readonly number[]) {
  const now = new Date();
  const boundaryHour = boundaryHours.find((hour) => hour > now.getHours());
  const nextBoundary = new Date(now);

  if (boundaryHour === undefined) nextBoundary.setDate(nextBoundary.getDate() + 1);
  nextBoundary.setHours(boundaryHour ?? boundaryHours[0], 0, 0, 0);

  return Math.max(nextBoundary.getTime() - now.getTime(), 1000);
}

function readSavedTheme(): ThemeName | null {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(savedTheme) ? savedTheme : null;
  } catch {
    return null;
  }
}

function applyDocumentTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
}

export function TimeTheme() {
  const pathname = usePathname();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName | null>(null);
  const themeTimeoutRef = useRef<number | null>(null);
  const greetingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const applyGreeting = () => {
      document.documentElement.dataset.greeting = getGreetingPeriod(new Date().getHours());
      greetingTimeoutRef.current = window.setTimeout(
        applyGreeting,
        getNextBoundary([6, 12, 18]),
      );
    };

    const applyAutomaticTheme = () => {
      const theme = getTheme(new Date().getHours());
      applyDocumentTheme(theme);
      setSelectedTheme(theme);
      themeTimeoutRef.current = window.setTimeout(
        applyAutomaticTheme,
        getNextBoundary([6, 17, 20]),
      );
    };

    applyGreeting();

    const savedTheme = readSavedTheme();
    if (savedTheme) {
      applyDocumentTheme(savedTheme);
      window.queueMicrotask(() => setSelectedTheme(savedTheme));
    } else {
      applyAutomaticTheme();
    }

    return () => {
      if (themeTimeoutRef.current !== null) window.clearTimeout(themeTimeoutRef.current);
      if (greetingTimeoutRef.current !== null) window.clearTimeout(greetingTimeoutRef.current);
    };
  }, []);

  const selectTheme = (theme: ThemeName) => {
    if (themeTimeoutRef.current !== null) {
      window.clearTimeout(themeTimeoutRef.current);
      themeTimeoutRef.current = null;
    }

    applyDocumentTheme(theme);
    setSelectedTheme(theme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // 저장소를 사용할 수 없어도 현재 화면의 테마 전환은 유지한다.
    }
  };

  if (!pathname.startsWith("/portfolio")) return null;

  return (
    <div className="time-theme-switcher" role="group" aria-label="화면 테마 선택">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="time-theme-option"
          aria-pressed={selectedTheme === option.value}
          onClick={() => selectTheme(option.value)}
        >
          <span
            className={`time-theme-swatch time-theme-swatch--${option.value}`}
            aria-hidden="true"
          />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
