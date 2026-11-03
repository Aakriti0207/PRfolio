"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ExternalLink, Link2, MapPin, GitMerge, GitPullRequest, XCircle } from "lucide-react";
import { getPublicProfile, type ApiContributionDay, type ApiPublicProfile } from "../../lib/api";
import { buildContributionWeeks, formatContributionTooltip, getContributionYear } from "../../lib/contributions";

const languageColors: Record<string, string> = { Rust: "#d48b4f", Dart: "#5ba9df", TypeScript: "#4b8cc8", JavaScript: "#d9b84b", Python: "#5b8fbd", Go: "#4dbea0" };
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const DESKTOP_PAGE_SIZE = 8;
const MOBILE_PAGE_SIZE = 6;
const CONTRIBUTION_VIEWPORT_QUERY = "(min-width: 640px)";
const CONTRIBUTION_GRID_SIZE = 12;
const CONTRIBUTION_GUTTER_WIDTH = 24;
const CONTRIBUTION_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CONTRIBUTION_LEVEL_COLORS: Record<number, string> = { 0: "#16181d", 1: "#0e4429", 2: "#006d32", 3: "#26a641", 4: "#39d353" };
const CONTRIBUTION_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Status({ state }: { state: ApiPublicProfile["pullRequests"][number]["state"] }) {
  const Icon = state === "MERGED" ? GitMerge : state === "OPEN" ? GitPullRequest : XCircle;
  const label = state === "MERGED" ? "Merged" : state === "OPEN" ? "Open" : "Closed";
  return <span className={`public-status ${state.toLowerCase()}`}><Icon size={13} />{label}</span>;
}

function useViewportPageSize(): number {
  const [pageSize, setPageSize] = useState(DESKTOP_PAGE_SIZE);
  useEffect(() => {
    const media = window.matchMedia(CONTRIBUTION_VIEWPORT_QUERY);
    const update = () => setPageSize(media.matches ? DESKTOP_PAGE_SIZE : MOBILE_PAGE_SIZE);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return pageSize;
}

function getPaginationWindow(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const candidates = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter((page) => page >= 1 && page <= totalPages));
  const pages = Array.from(candidates).sort((a, b) => a - b);
  const pageWindow: Array<number | "ellipsis"> = [];
  let previous: number | null = null;
  for (const page of pages) {
    if (previous !== null && page - previous > 1) pageWindow.push("ellipsis");
    pageWindow.push(page);
    previous = page;
  }
  return pageWindow;
}

function ContributionHeatmap({ contributions }: { contributions: ApiContributionDay[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of contributions) map.set(day.date, day.contributionCount ?? 0);
    return map;
  }, [contributions]);
  const year = useMemo(() => getContributionYear(contributions), [contributions]);
  const weeks = useMemo(() => buildContributionWeeks(year, counts), [year, counts]);
  const monthLabels = useMemo(() => {
    const labels: Array<{ week: number; month: string }> = [];
    const seenMonths = new Set<number>();
    for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
      const week = weeks[weekIndex];
      for (const cell of week.cells) {
        const parsed = cell ? new Date(`${cell.date}T00:00:00Z`) : null;
        if (cell && parsed && parsed.getUTCFullYear() === year && !seenMonths.has(parsed.getUTCMonth())) {
          seenMonths.add(parsed.getUTCMonth());
          labels.push({ week: weekIndex, month: CONTRIBUTION_MONTHS[parsed.getUTCMonth()] });
        }
      }
    }
    return labels;
  }, [weeks, year]);
  const totalContributions = useMemo(() => contributions.reduce((sum, day) => sum + (day.contributionCount ?? 0), 0), [contributions]);
  const heatmapColumns = useMemo(() => ["24px", ...weeks.map(() => "minmax(var(--hm-size), var(--hm-week-width))")].join(" "), [weeks]);

  if (contributions.length === 0) {
    return <div className="activity-empty">Contribution activity hasn't been synced yet.</div>;
  }

  return (
    <div className="public-heatmap" style={{ gridTemplateColumns: heatmapColumns }}>
      {CONTRIBUTION_WEEKDAY_LABELS.map((label, row) => (
        <span key={`weekday-${label}`} className="public-heatmap-weekday" style={{ gridColumn: 1, gridRow: row + 2 }}>{label}</span>
      ))}
      {weeks.map((week, weekIndex) => week.cells.map((cell, rowIndex) => {
        const level = cell ? cell.level : 0;
        const contributionCount = cell?.contributionCount ?? 0;
        const background = CONTRIBUTION_LEVEL_COLORS[level] ?? CONTRIBUTION_LEVEL_COLORS[0];
        const tooltip = cell ? formatContributionTooltip(cell.date, contributionCount) : formatContributionTooltip("", contributionCount);
        const key = `contribution-${weekIndex}-${rowIndex}`;
        if (!cell) {
          return <span key={key} className="public-heatmap-day" style={{ gridColumn: weekIndex + 2, gridRow: rowIndex + 2, background }} aria-hidden="true" />;
        }
        return (
          <button key={key} type="button" className="public-heatmap-day" style={{ gridColumn: weekIndex + 2, gridRow: rowIndex + 2, background }} title={tooltip} aria-label={tooltip}>
          </button>
        );
      }))}
      <div className="public-heatmap-months" style={{ gridTemplateColumns: heatmapColumns }}>
        {monthLabels.map((label) => (
          <span key={`month-${label.week}-${label.month}`} className="public-heatmap-month" style={{ gridColumn: label.week + 2 }}>{label.month}</span>
        ))}
      </div>
      <div className="public-heatmap-legend" style={{ gridColumn: "1 / -1" }} aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => <i key={`legend-${level}`} style={{ background: CONTRIBUTION_LEVEL_COLORS[level] }} />)}
        <span>More</span>
      </div>
      <p className="public-heatmap-summary" style={{ gridColumn: "1 / -1" }}>GitHub activity for {year}: {totalContributions} contributions</p>
      <span className="sr-only">GitHub contribution activity for {year}: {totalContributions} contributions.</span>
    </div>
  );
}

export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const [profile, setProfile] = useState<ApiPublicProfile | null>(null);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useViewportPageSize();

  useEffect(() => {
    let active = true;
    void params.then(({ slug: nextSlug }) => {
      setSlug(nextSlug);
      return getPublicProfile(nextSlug);
    }).then((data) => { if (active) setProfile(data); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "This profile is not available.");
    });
    return () => { active = false; };
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [slug]);

  const displayName = profile?.displayName || profile?.githubUsername || slug;
  const pullRequests = useMemo(() => profile?.pullRequests ?? [], [profile]);
  const contributions = useMemo(() => profile?.contributions ?? [], [profile]);

  if (error)   return <main className="public-page"><div className="public-message"><GitPullRequest size={28}/><h1>Profile unavailable</h1><p>{error}</p></div></main>;
  if (!profile) return <main className="public-page"><div className="public-message"><div className="public-loader" /><p>Loading profile...</p></div></main>;

  const totalPullRequests = pullRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalPullRequests / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * pageSize;
  const visiblePullRequests = pullRequests.slice(firstIndex, firstIndex + pageSize);
  const firstVisible = totalPullRequests === 0 ? 0 : firstIndex + 1;
  const lastVisible = Math.min(firstIndex + pageSize, totalPullRequests);
  const paginationWindow = getPaginationWindow(currentPage, totalPages);

  return <main className="public-page">
    <div className="public-grain" />
    <div className="public-layout">
      <aside className="public-sidebar">
        <div className="public-avatar-wrap">{profile.avatarUrl ? <img className="public-avatar" src={profile.avatarUrl} alt={`${displayName} GitHub avatar`} /> : <GitPullRequest size={58} />}</div>
        <h1>{displayName}</h1>
        <p className="public-handle">@{profile.githubUsername}</p>
        <p className="public-bio">{profile.bio || "Open-source contributor"}</p>
        <div className="public-links">
          {profile.location && <span><MapPin size={16} />{profile.location}</span>}
          {profile.website && <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer"><Link2 size={16} />{profile.website.replace(/^https?:\/\//, "")}</a>}
          <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noreferrer"><GitPullRequest size={16} />View GitHub <ExternalLink size={12} /></a>
        </div>
        <footer className="public-footer"><GitPullRequest size={20} />Built with PRfolio</footer>
      </aside>
      <section className="public-main">
        <header className="public-heading"><h2>Open Source Contributions</h2><p>Selected pull requests from open-source work across organizations.</p></header>
        {totalPullRequests === 0 ? <div className="public-empty">No featured contributions have been published yet.</div> : <>
          <div className="public-pr-grid">
            {visiblePullRequests.map((pr) => {
              const [owner, repo] = pr.repositoryFullName.split("/");
              return <article className="public-pr-card" key={`${pr.repositoryFullName}-${pr.number}`}>
                <div className="public-card-top"><h3>{pr.title}</h3><Status state={pr.state} /></div>
                <div className="public-repo"><GitPullRequest size={15} />{owner} <span>/</span> {repo}</div>
                <div className="public-card-bottom"><span className="public-language"><i style={{ background: languageColors[pr.language ?? ""] ?? "#8b96a3" }} />{pr.language || "Other"}</span><span className="public-separator" /><span>#{pr.number}</span><span className="public-separator" /><span><CalendarDays size={13} />{formatDate(pr.createdAtGitHub)}</span><a href={pr.htmlUrl} target="_blank" rel="noreferrer">View PR <ExternalLink size={13} /></a></div>
              </article>;
            })}
          </div>
          {totalPages > 1 && (
            <nav className="public-pagination" aria-label="Pull request pages">
              <p className="public-pagination-summary">Showing {firstVisible}–{lastVisible} of {totalPullRequests} pull requests</p>
              <div className="public-pagination-controls">
                <button type="button" className="public-pagination-button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>← Previous</button>
                {paginationWindow.map((entry, index) => entry === "ellipsis" ? <span key={`ellipsis-${index}`} className="public-pagination-ellipsis">…</span> : (
                  <button key={`page-${entry}`} type="button" className={`public-pagination-button public-pagination-page ${entry === currentPage ? "is-active" : ""}`} onClick={() => setPage(entry)} aria-current={entry === currentPage ? "page" : undefined}>{entry}</button>
                ))}
                <button type="button" className="public-pagination-button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next →</button>
              </div>
            </nav>
          )}
        </>}
        {profile.contributionGraphVisible && <section className="public-activity"><div className="public-activity-heading"><h2>GitHub Contributions</h2><span><i />Shown on profile</span></div>{contributions.length === 0 ? <div className="activity-empty">Contribution activity hasn't been synced yet.</div> : <ContributionHeatmap contributions={contributions} />}</section>}
      </section>
    </div>
  </main>;
}
