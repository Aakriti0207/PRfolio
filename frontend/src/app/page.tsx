"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp, ArrowUpRight, ChevronDown, CircleHelp, Code2,
  ExternalLink, EyeOff, GitPullRequest, FolderGit2, Grid2X2,
  LayoutList, Menu, MoreHorizontal, Search, Settings2, Star,
  X, Clock3, CalendarDays, CheckCircle2, CircleDot, GitMerge,
} from "lucide-react";

type PRStatus = "Merged" | "Open" | "Closed";
type PR = {
  id: number; owner: string; repo: string; title: string; number: number;
  status: PRStatus; language: string; languageColor: string; createdAt: string;
  mergedAt?: string; updatedAt: string; description: string; url: string;
  featured: boolean; hidden: boolean; additions: number; deletions: number;
};

// Preview data only. Connect GitHub to replace these examples with real PRs.
const initialPRs: PR[] = [
  { id: 1, owner: "juspay", repo: "hyperswitch", title: "Fix payment link localization review feedback", number: 14482, status: "Merged", language: "Rust", languageColor: "#dea584", createdAt: "2026-10-24", mergedAt: "2026-10-28", updatedAt: "2026-10-28", description: "Refines the localized payment-link copy based on review feedback and keeps the displayed text consistent across supported locales.", url: "https://github.com/juspay/hyperswitch/pull/14482", featured: true, hidden: false, additions: 5, deletions: 2 },
  { id: 2, owner: "juspay", repo: "hyperswitch", title: "Add missing D24 connector metadata", number: 14481, status: "Open", language: "Rust", languageColor: "#dea584", createdAt: "2026-10-29", updatedAt: "2026-10-31", description: "Adds the missing D24 connector metadata entry so payment-method filters can be resolved consistently.", url: "https://github.com/juspay/hyperswitch/pull/14481", featured: true, hidden: false, additions: 8, deletions: 1 },
  { id: 3, owner: "CCExtractor", repo: "taskwarrior-flutter", title: "Improve task filtering and empty states", number: 286, status: "Merged", language: "Dart", languageColor: "#00b4ab", createdAt: "2026-10-20", mergedAt: "2026-10-29", updatedAt: "2026-10-29", description: "Makes task filtering easier to understand and adds a helpful empty state when a filter returns no results.", url: "https://github.com/CCExtractor/taskwarrior-flutter/pull/286", featured: false, hidden: false, additions: 64, deletions: 18 },
  { id: 4, owner: "apideck-libraries", repo: "api-dash", title: "Handle request history edge cases", number: 912, status: "Open", language: "Dart", languageColor: "#00b4ab", createdAt: "2026-10-26", updatedAt: "2026-10-30", description: "Covers edge cases in request-history rendering and avoids inconsistent UI states when a request has incomplete metadata.", url: "https://github.com/apideck-libraries/api-dash/pull/912", featured: false, hidden: false, additions: 42, deletions: 9 },
  { id: 5, owner: "Apna-Engineering-Wallah", repo: "AEW-Email-Service", title: "Add backend email service interface", number: 2, status: "Merged", language: "TypeScript", languageColor: "#3178c6", createdAt: "2026-10-18", mergedAt: "2026-10-24", updatedAt: "2026-10-24", description: "Introduces a reusable email service interface to keep delivery providers behind a consistent backend API.", url: "https://github.com/Apna-Engineering-Wallah/AEW-Email-Service/pull/2", featured: false, hidden: false, additions: 126, deletions: 14 },
  { id: 6, owner: "CCExtractor", repo: "taskwarrior-flutter", title: "Document keyboard shortcuts", number: 271, status: "Closed", language: "Dart", languageColor: "#00b4ab", createdAt: "2026-10-12", updatedAt: "2026-10-17", description: "Documents keyboard shortcuts and improves discoverability for common actions.", url: "https://github.com/CCExtractor/taskwarrior-flutter/pull/271", featured: false, hidden: true, additions: 31, deletions: 4 },
  { id: 7, owner: "juspay", repo: "hyperswitch", title: "Clarify connector error mapping", number: 14397, status: "Merged", language: "Rust", languageColor: "#dea584", createdAt: "2026-10-09", mergedAt: "2026-10-15", updatedAt: "2026-10-15", description: "Clarifies error mapping for a connector response and adds focused test coverage for the changed behavior.", url: "https://github.com/juspay/hyperswitch/pull/14397", featured: false, hidden: true, additions: 38, deletions: 6 },
  { id: 8, owner: "Anveshan-BPIT", repo: "reforged-website", title: "Polish responsive event schedule", number: 18, status: "Merged", language: "TypeScript", languageColor: "#3178c6", createdAt: "2026-10-04", mergedAt: "2026-10-08", updatedAt: "2026-10-08", description: "Improves schedule layout at narrow viewport widths and keeps event information easy to scan on mobile.", url: "https://github.com/Anveshan-BPIT/reforged-website/pull/18", featured: false, hidden: false, additions: 52, deletions: 11 },
];

const fmtDate = (date?: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const daysBetween = (start: string, end?: string) => end ? Math.max(0, Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000)) : null;

function StatusBadge({ status }: { status: PRStatus }) {
  const Icon = status === "Merged" ? GitMerge : status === "Open" ? CircleDot : X;
  return <span className={`status-badge ${status.toLowerCase()}`}><Icon size={13} strokeWidth={2.2} />{status}</span>;
}
function Language({ name, color }: { name: string; color: string }) {
  return <span className="language"><i style={{ background: color }} />{name}</span>;
}

export default function Home() {
  const [prs, setPrs] = useState(initialPRs);
  const [tab, setTab] = useState<"All" | "Featured" | "Hidden">("All");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [repoFilter, setRepoFilter] = useState("All repositories");
  const [sort, setSort] = useState("Recently updated");
  const [view, setView] = useState<"list" | "grid">("list");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");

  const repoNames = Array.from(new Set(prs.map(pr => `${pr.owner}/${pr.repo}`))).sort();
  const counts = {
    all: prs.filter(pr => !pr.hidden).length,
    featured: prs.filter(pr => pr.featured && !pr.hidden).length,
    hidden: prs.filter(pr => pr.hidden).length,
    merged: prs.filter(pr => pr.status === "Merged").length,
  };
  const visible = useMemo(() => {
    const list = prs.filter(pr => {
      if (tab === "Featured" && (!pr.featured || pr.hidden)) return false;
      if (tab === "Hidden" && !pr.hidden) return false;
      if (tab === "All" && pr.hidden) return false;
      if (statusFilter !== "All statuses" && pr.status !== statusFilter) return false;
      if (repoFilter !== "All repositories" && `${pr.owner}/${pr.repo}` !== repoFilter) return false;
      const haystack = `${pr.title} ${pr.repo} ${pr.owner} ${pr.number} ${pr.language}`.toLowerCase();
      return haystack.includes(query.toLowerCase().trim());
    });
    return list.sort((a, b) => {
      if (sort === "Oldest first") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "Recently merged") return (b.mergedAt ?? "").localeCompare(a.mergedAt ?? "");
      if (sort === "Longest time to merge") return (daysBetween(b.createdAt, b.mergedAt) ?? -1) - (daysBetween(a.createdAt, a.mergedAt) ?? -1);
      if (sort === "Shortest time to merge") return (daysBetween(a.createdAt, a.mergedAt) ?? 99999) - (daysBetween(b.createdAt, b.mergedAt) ?? 99999);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [prs, tab, statusFilter, repoFilter, query, sort]);

  function updatePR(id: number, patch: Partial<PR>, message: string) {
    setPrs(current => current.map(pr => pr.id === id ? { ...pr, ...patch } : pr));
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }
  function chooseTab(next: "All" | "Featured" | "Hidden") { setTab(next); setExpanded(null); setPinnedOpen(null); }

  const sidebar = <>
    <a className="brand" href="#top" aria-label="PRfolio home"><span className="brand-symbol"><GitPullRequest size={19}/></span><span className="brand-word">prfolio<span>.</span></span></a>
    <div className="sidebar-workspace"><div className="workspace-avatar">AA</div><div className="workspace-copy"><strong>Aakriti Arya</strong><span>Personal workspace</span></div><ChevronDown size={14} className="workspace-chevron"/></div>
    <div className="nav-caption">WORKSPACE</div>
    <nav className="nav-list">
      <button className="nav-item active" onClick={() => chooseTab("All")}><LayoutList size={17}/>Overview</button>
      <button className={`nav-item ${tab === "All" ? "subtle-active" : ""}`} onClick={() => chooseTab("All")}><GitPullRequest size={17}/>All PRs<span className="nav-count">{counts.all}</span></button>
      <button className={`nav-item ${tab === "Featured" ? "subtle-active" : ""}`} onClick={() => chooseTab("Featured")}><Star size={17}/>Featured<span className="nav-count">{counts.featured}</span></button>
      <button className={`nav-item ${tab === "Hidden" ? "subtle-active" : ""}`} onClick={() => chooseTab("Hidden")}><EyeOff size={17}/>Hidden<span className="nav-count">{counts.hidden}</span></button>
    </nav>
    <div className="nav-caption profile-caption">PROFILE</div>
    <nav className="nav-list"><button className="nav-item" onClick={() => setNotice("Public profile preview will be available when GitHub is connected.")}><ExternalLink size={17}/>Public profile<ArrowUpRight size={13} className="nav-external"/></button><button className="nav-item" onClick={() => setNotice("Profile settings are coming after the dashboard MVP.")}><Settings2 size={17}/>Settings</button></nav>
    <div className="sidebar-bottom"><div className="github-connected"><span className="github-icon"><FolderGit2 size={17}/></span><span><strong>GitHub connected</strong><small>@Aakriti0207 · Preview</small></span><span className="connected-dot"/></div><div className="sidebar-footnote"><span className="green-dot"/> Preview mode <span className="foot-sep">·</span> Sample PR data</div></div>
  </>;

  return <main className="app-shell" id="top">
    {mobileNav && <div className="mobile-backdrop" onClick={() => setMobileNav(false)}><aside className="sidebar mobile-sidebar" onClick={e => e.stopPropagation()}><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18}/></button>{sidebar}</aside></div>}
    <aside className="sidebar desktop-sidebar">{sidebar}</aside>
    <section className="main-panel">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{tab === "All" ? "Overview" : tab}</strong></div><div className="topbar-actions"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19}/></button><span className="preview-pill"><span/> PREVIEW DATA</span><button className="help-button" aria-label="Help" onClick={() => setNotice("Connect GitHub to import your real pull requests.")}><CircleHelp size={17}/></button><span className="user-avatar">AA</span></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"/>YOUR CONTRIBUTION WORKSPACE</div><h1>{tab === "All" ? "Your contributions" : tab === "Featured" ? "Featured PRs" : "Hidden PRs"}<span className="heading-period">.</span></h1><p>{tab === "All" ? "Every contribution, ready to be curated for your public profile." : tab === "Featured" ? "Put your strongest open-source work front and center." : "These PRs stay in your workspace, out of your public profile."}</p></div><button className="primary-button" onClick={() => setNotice("GitHub sync will be enabled when OAuth is configured.")}><FolderGit2 size={16}/> Sync GitHub <ArrowUpRight size={14}/></button></div>

        <div className="stats-row">
          <div className="stat-card"><div className="stat-label">VISIBLE PRs <span className="stat-icon"><GitPullRequest size={15}/></span></div><div className="stat-number">{counts.all.toString().padStart(2, "0")}</div><div className="stat-description">Available for your profile</div></div>
          <div className="stat-card"><div className="stat-label">FEATURED <span className="stat-icon star-icon"><Star size={15}/></span></div><div className="stat-number">{counts.featured.toString().padStart(2, "0")}</div><div className="stat-description">Prioritized for visitors</div></div>
          <div className="stat-card"><div className="stat-label">MERGED <span className="stat-icon merge-icon"><GitMerge size={15}/></span></div><div className="stat-number">{counts.merged.toString().padStart(2, "0")}</div><div className="stat-description">Successfully merged</div></div>
        </div>

        <section className="contributions-section" aria-label="Manage pull requests">
          <div className="section-title-row"><div><h2>Manage pull requests</h2><p>Search, sort, and decide what belongs on your profile.</p></div><div className="view-toggle" role="group" aria-label="View mode"><button className={view === "list" ? "selected" : ""} onClick={() => setView("list")} aria-label="Compact list view"><LayoutList size={16}/><span>List</span></button><button className={view === "grid" ? "selected" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={15}/><span>Grid</span></button></div></div>
          <div className="toolbar"><label className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search PRs, repositories, languages..."/><kbd>⌘ K</kbd>{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={13}/></button>}</label><label className="select-wrap"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All statuses</option><option>Merged</option><option>Open</option><option>Closed</option></select><ChevronDown size={14}/></label><label className="select-wrap repo-select"><span className="sr-only">Filter by repository</span><select value={repoFilter} onChange={e => setRepoFilter(e.target.value)}><option>All repositories</option>{repoNames.map(repo => <option key={repo}>{repo}</option>)}</select><ChevronDown size={14}/></label><label className="select-wrap sort-select"><ArrowDownUp size={14}/><select value={sort} onChange={e => setSort(e.target.value)}><option>Recently updated</option><option>Oldest first</option><option>Recently merged</option><option>Longest time to merge</option><option>Shortest time to merge</option></select><ChevronDown size={14}/></label></div>

          <div className="list-tabs"><div className="tabs-left"><button className={tab === "All" ? "active" : ""} onClick={() => chooseTab("All")}>All PRs <span>{counts.all}</span></button><button className={tab === "Featured" ? "active" : ""} onClick={() => chooseTab("Featured")}>Featured <span>{counts.featured}</span></button><button className={tab === "Hidden" ? "active" : ""} onClick={() => chooseTab("Hidden")}>Hidden <span>{counts.hidden}</span></button></div><span className="results-count">{visible.length} results</span></div>

          {view === "list" ? <div className="pr-list">
            <div className="list-header"><span>CONTRIBUTION</span><span>STATUS</span><span>LAST ACTIVITY</span><span aria-label="Actions"/></div>
            {visible.map(pr => {
              const isExpanded = expanded === pr.id || pinnedOpen === pr.id;
              return <article className={`pr-entry ${isExpanded ? "expanded" : ""}`} key={pr.id} onMouseEnter={() => { if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setExpanded(pr.id); }} onMouseLeave={() => { if (pinnedOpen !== pr.id) setExpanded(null); }}>
                <div className="pr-row" onClick={() => setExpanded(isExpanded ? null : pr.id)} onFocus={() => setExpanded(pr.id)} tabIndex={0} role="button" aria-expanded={isExpanded} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(isExpanded ? null : pr.id); } }}>
                  <div className={`pr-state ${pr.status.toLowerCase()}`}>{pr.status === "Merged" ? <GitMerge size={16}/> : pr.status === "Open" ? <GitPullRequest size={16}/> : <X size={16}/>}</div>
                  <div className="pr-primary"><div className="repo-path"><span>{pr.owner}</span><b>/ {pr.repo}</b><span className="pr-number">#{pr.number}</span>{pr.featured && !pr.hidden && <span className="featured-mini"><Star size={10} fill="currentColor"/> Featured</span>}</div><div className="pr-title-line">{pr.title}<ExternalLink size={12} className="title-external"/></div><div className="pr-submeta"><Language name={pr.language} color={pr.languageColor}/><span className="meta-divider">·</span><span>Raised {fmtDate(pr.createdAt)}</span></div></div>
                  <div className="pr-status-cell"><StatusBadge status={pr.status}/></div><div className="pr-date-cell"><span>{fmtDate(pr.mergedAt ?? pr.updatedAt)}</span><small>{pr.mergedAt ? "Merged" : pr.status === "Open" ? "Updated" : "Last activity"}</small></div><button className="row-menu" aria-label={`More actions for ${pr.title}`} onClick={e => { e.stopPropagation(); setPinnedOpen(pinnedOpen === pr.id ? null : pr.id); setExpanded(pr.id); }}><MoreHorizontal size={18}/></button>
                </div>
                <div className={`expanded-panel ${isExpanded ? "shown" : ""}`} aria-hidden={!isExpanded}><div className="expanded-inner"><div className="expanded-description">{pr.description}</div><div className="detail-grid"><div className="detail-item"><span><CalendarDays size={13}/> RAISED</span><strong>{fmtDate(pr.createdAt)}</strong></div><div className="detail-item"><span><GitMerge size={13}/> MERGED</span><strong>{fmtDate(pr.mergedAt)}</strong></div><div className="detail-item"><span><Clock3 size={13}/> TIME TO MERGE</span><strong>{daysBetween(pr.createdAt, pr.mergedAt) === null ? "Not merged yet" : `${daysBetween(pr.createdAt, pr.mergedAt)} ${daysBetween(pr.createdAt, pr.mergedAt) === 1 ? "day" : "days"}`}</strong></div><div className="detail-item"><span><Code2 size={13}/> CHANGES</span><strong className="diff-count"><i>+{pr.additions}</i> <b>−{pr.deletions}</b></strong></div></div><div className="expanded-actions"><div className="curation-actions"><button className={`action-button ${pr.featured && !pr.hidden ? "is-featured" : ""}`} onClick={e => { e.stopPropagation(); updatePR(pr.id, { featured: !pr.featured, hidden: false }, pr.featured && !pr.hidden ? "Removed from featured." : "Added to featured."); }}><Star size={14} fill={pr.featured && !pr.hidden ? "currentColor" : "none"}/>{pr.featured && !pr.hidden ? "Featured" : "Feature PR"}</button><button className="action-button" onClick={e => { e.stopPropagation(); updatePR(pr.id, { hidden: !pr.hidden, featured: pr.hidden ? pr.featured : false }, pr.hidden ? "PR restored to visible contributions." : "PR hidden from your public profile."); setExpanded(null); setPinnedOpen(null); }}><EyeOff size={14}/>{pr.hidden ? "Restore visibility" : "Hide from profile"}</button></div><a className="github-link" href={pr.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>View on GitHub <ArrowUpRight size={14}/></a></div></div></div>
              </article>;
            })}
            {visible.length === 0 && <div className="empty-state"><Search size={22}/><strong>No pull requests found</strong><span>Try another search or adjust your filters.</span><button onClick={() => { setQuery(""); setStatusFilter("All statuses"); setRepoFilter("All repositories"); }}>Clear filters</button></div>}
          </div> : <div className="pr-grid">
            {visible.map(pr => <article className="pr-card" key={pr.id}><div className="pr-card-top"><span className={`pr-state ${pr.status.toLowerCase()}`}>{pr.status === "Merged" ? <GitMerge size={16}/> : pr.status === "Open" ? <GitPullRequest size={16}/> : <X size={16}/>}</span><StatusBadge status={pr.status}/><button className="card-more" onClick={() => setPinnedOpen(pinnedOpen === pr.id ? null : pr.id)} aria-label="Toggle PR actions"><MoreHorizontal size={18}/></button></div><div className="card-repo">{pr.owner} / <b>{pr.repo}</b> <span>#{pr.number}</span></div><h3>{pr.title}</h3><p>{pr.description}</p><div className="card-meta"><Language name={pr.language} color={pr.languageColor}/><span>Raised {fmtDate(pr.createdAt)}</span></div><div className="card-dates"><span>Raised <b>{fmtDate(pr.createdAt)}</b></span><span>Merged <b>{fmtDate(pr.mergedAt)}</b></span></div><div className="card-actions"><button onClick={() => updatePR(pr.id, { featured: !pr.featured, hidden: false }, pr.featured ? "Removed from featured." : "Added to featured.")}><Star size={14} fill={pr.featured ? "currentColor" : "none"}/>{pr.featured ? "Featured" : "Feature"}</button><button onClick={() => updatePR(pr.id, { hidden: !pr.hidden, featured: pr.hidden ? pr.featured : false }, pr.hidden ? "PR restored." : "PR hidden from profile.")}><EyeOff size={14}/>{pr.hidden ? "Restore" : "Hide"}</button><a href={pr.url} target="_blank" rel="noreferrer" aria-label="View on GitHub"><ArrowUpRight size={15}/></a></div></article>)}
            {visible.length === 0 && <div className="empty-state"><Search size={22}/><strong>No pull requests found</strong><span>Try another search or adjust your filters.</span><button onClick={() => { setQuery(""); setStatusFilter("All statuses"); setRepoFilter("All repositories"); }}>Clear filters</button></div>}
          </div>}
          <div className="list-footer"><span>Showing <b>{visible.length}</b> sample contributions <span className="footer-dot">·</span> Preview only</span><button onClick={() => setNotice("Connect GitHub to import all of your pull requests.")}>Import all PRs <ArrowUpRight size={13}/></button></div>
        </section>
        <footer className="page-footer"><span><span className="footer-brand"><GitPullRequest size={13}/></span> PRfolio <span className="footer-dot">·</span> Your work, thoughtfully presented.</span><span className="footer-right"><span className="live-dot"/> Dashboard preview <span className="footer-dot">·</span> <button onClick={() => setNotice("GitHub OAuth and persistence are not configured in this UI preview.")}>About this preview</button></span></footer>
      </div>
    </section>
    {notice && <div className="toast" role="status"><CheckCircle2 size={16}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={14}/></button></div>}
  </main>;
}
