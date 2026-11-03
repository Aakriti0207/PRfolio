export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionCell {
  date: string;
  contributionCount: number;
  level: ContributionLevel;
}

export interface ContributionWeek {
  cells: Array<ContributionCell | null>;
}

export const CONTRIBUTION_LEVEL_THRESHOLDS: ReadonlyArray<{ level: ContributionLevel; max: number }> = [
  { level: 0, max: 0 },
  { level: 1, max: 2 },
  { level: 2, max: 5 },
  { level: 3, max: 8 },
  { level: 4, max: Number.MAX_SAFE_INTEGER },
];

export const CONTRIBUTION_LEVEL_LABELS: Record<ContributionLevel, string> = {
  0: "No contributions",
  1: "Minimal activity",
  2: "Light activity",
  3: "Moderate activity",
  4: "High activity",
};

export function getContributionLevel(count: number): ContributionLevel {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  let level: ContributionLevel = 0;
  for (const threshold of CONTRIBUTION_LEVEL_THRESHOLDS) {
    if (safeCount <= threshold.max) {
      level = threshold.level;
      break;
    }
  }
  return level;
}

export function parseContributionDate(value: string): Date {
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
}

export function toContributionISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatContributionDate(value: string): string {
  const date = parseContributionDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatContributionTooltip(date: string, count: number): string {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return `${formatContributionDate(date)}: ${safeCount} contribution${safeCount === 1 ? "" : "s"}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
}

export function buildContributionWeeks(year: number, counts: ReadonlyMap<string, number>): ContributionWeek[] {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const firstWeekStart = startOfWeek(yearStart);
  const lastDay = new Date(Date.UTC(year, 12, 0));
  const weeks: ContributionWeek[] = [];
  let cells: Array<ContributionCell | null> = [];
  for (let timestamp = firstWeekStart.getTime(); timestamp <= lastDay.getTime(); timestamp += MS_PER_DAY) {
    const date = new Date(timestamp);
    const isoDate = date.toISOString().slice(0, 10);
    const inYear = date.getUTCFullYear() === year;
    const contributionCount = inYear ? counts.get(isoDate) ?? 0 : 0;
    if (date.getUTCDay() === 0 && cells.length > 0) {
      weeks.push({ cells });
      cells = [];
    }
    cells.push(inYear ? { date: isoDate, contributionCount, level: getContributionLevel(contributionCount) } : null);
  }
  if (cells.length > 0) weeks.push({ cells });
  return weeks;
}

export function getContributionYear(contributions: ReadonlyArray<{ date: string; contributionCount: number }> | undefined | null): number {
  if (!contributions || contributions.length === 0) return new Date().getUTCFullYear();
  const latest = contributions.reduce((acc, current) => (new Date(current.date).getTime() > new Date(acc.date).getTime() ? current : acc), contributions[0]);
  const parsed = parseContributionDate(latest.date);
  return Number.isNaN(parsed.getTime()) ? new Date().getUTCFullYear() : parsed.getUTCFullYear();
}
