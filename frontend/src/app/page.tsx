"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp, ArrowUpRight, CalendarDays, CheckCircle2, ChevronDown, CircleDot,
  CircleHelp, Clock3, Code2, ExternalLink, EyeOff, FolderGit2, GitMerge,
  GitPullRequest, Globe, Grid2X2, LayoutList, Menu, MoreHorizontal, RefreshCw, Search, Settings2,
  Star, X,
} from "lucide-react";
import {
  getAllPullRequests, getCurrentUser, getLoginUrl, getStats, logout,
  syncPullRequests, updatePullRequest, updatePublication, type ApiPullRequest, type ApiStats, type ApiUser,
} from "../lib/api";

type PRStatus = "Merged" | "Open" | "Closed";
type PR = {
  id: string; owner: string; repo: string; title: string; number: number;
  status: PRStatus; language: string; languageColor: string; createdAt: string;
  mergedAt?: string; updatedAt: string; description: string; url: string;
  featured: boolean; hidden: boolean;
};

const languageColors: Record<string, string> = { Rust: "#dea584", Dart: "#00b4ab", TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8" };
const toPr = (item: ApiPullRequest): PR => ({
  id: item.id, owner: item.ownerName, repo: item.repositoryName, title: item.title, number: item.number,
  status: item.state === "MERGED" ? "Merged" : item.state === "OPEN" ? "Open" : "Closed",
  language: item.language ?? "Unknown", languageColor: languageColors[item.language ?? ""] ?? "#94a3b8",
  createdAt: item.createdAtGitHub, mergedAt: item.mergedAt ?? undefined, updatedAt: item.updatedAtGitHub,
  description: item.body ?? "No description provided.", url: item.htmlUrl, featured: item.featured, hidden: item.hidden,
});
const fmtDate = (date?: string) => date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const daysBetween = (start: string, end?: string) => end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)) : null;

function StatusBadge({ status }: { status: PRStatus }) {
  const Icon = status === "Merged" ? GitMerge : status === "Open" ? CircleDot : X;
  return <span className={`status-badge ${status.toLowerCase()}`}><Icon size={13} strokeWidth={2.2} />{status}</span>;
}
function Language({ name, color }: { name: string; color: string }) {
  return <span className="language"><i style={{ background: color }} />{name}</span>;
}

export default function Home() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<"All" | "Featured" | "Hidden">("All");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [repoFilter, setRepoFilter] = useState("All repositories");
  const [sort, setSort] = useState("Recently updated");
  const [view, setView] = useState<"list" | "grid">("list");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState<{ message: string; isError?: boolean } | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setAuthError("");
    try {
      const [currentUser, items, currentStats] = await Promise.all([getCurrentUser(), getAllPullRequests(), getStats()]);
      setUser(currentUser);
      setPrs(items.map(toPr));
      setStats(currentStats);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const repoNames = Array.from(new Set(prs.map(pr => `${pr.owner}/${pr.repo}`))).sort();
  const counts = {
    all: stats?.total ? stats.total - stats.hidden : prs.filter(pr => !pr.hidden).length,
    featured: stats?.featured ? stats.featured - prs.filter(pr => pr.featured && pr.hidden).length : prs.filter(pr => pr.featured && !pr.hidden).length,
    hidden: stats?.hidden ?? prs.filter(pr => pr.hidden).length,
    merged: stats?.merged ?? prs.filter(pr => pr.status === "Merged").length,
  };
  const visible = useMemo(() => {
    const list = prs.filter(pr => {
      if (tab === "Featured" && (!pr.featured || pr.hidden)) return false;
      if (tab === "Hidden" && !pr.hidden) return false;
      if (tab === "All" && pr.hidden) return false;
      if (statusFilter !== "All statuses" && pr.status !== statusFilter) return false;
      if (repoFilter !== "All repositories" && `${pr.owner}/${pr.repo}` !== repoFilter) return false;
      return `${pr.title} ${pr.repo} ${pr.owner} ${pr.number} ${pr.language}`.toLowerCase().includes(query.toLowerCase().trim());
    });
    return list.sort((a, b) => {
      if (sort === "Oldest first") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "Recently merged") return (b.mergedAt ?? "").localeCompare(a.mergedAt ?? "");
      if (sort === "Longest time to merge") return (daysBetween(b.createdAt, b.mergedAt) ?? -1) - (daysBetween(a.createdAt, a.mergedAt) ?? -1);
      if (sort === "Shortest time to merge") return (daysBetween(a.createdAt, a.mergedAt) ?? 99999) - (daysBetween(b.createdAt, b.mergedAt) ?? 99999);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [prs, tab, statusFilter, repoFilter, query, sort]);

  function showNotice(message: string, isError = false) {
    setNotice({ message, isError });
    window.setTimeout(() => setNotice(null), 3000);
  }
  async function curatePR(id: string, patch: { featured?: boolean; hidden?: boolean }, message: string) {
    setLoadingAction(true);
    try {
      const updated = await updatePullRequest(id, patch);
      setPrs(current => current.map(pr => pr.id === id ? toPr(updated) : pr));
      showNotice(message);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update this pull request.", true);
    } finally {
      setLoadingAction(false);
    }
  }
  async function sync() {
    setLoadingAction(true);
    try {
      const result = await syncPullRequests();
      await loadDashboard();
      showNotice(`Synced ${result.fetched} pull requests.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to sync pull requests.", true);
    } finally {
      setLoadingAction(false);
    }
  }
  async function signOut() {
    try { await logout(); window.location.reload(); } catch (error) { showNotice(error instanceof Error ? error.message : "Unable to sign out.", true); }
  }
  async function togglePublication() {
    if (!user || isPublishing) return;
    setIsPublishing(true);
    try {
      const updated = await updatePublication(!user.isPublished);
      setUser(current => current ? { ...current, isPublished: updated.isPublished } : current);
      showNotice(updated.isPublished ? "Your public profile is now live." : "Your public profile is unpublished.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update publication.", true);
    } finally {
      setIsPublishing(false);
    }
  }
  async function copyProfileUrl() {
    if (!user) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${user.profileSlug}`);
    showNotice("Public profile URL copied.");
  }
  function chooseTab(next: "All" | "Featured" | "Hidden") { setTab(next); setExpanded(null); setPinnedOpen(null); }

  const sidebar = <>
    <a className="brand" href="#top" aria-label="PRfolio home"><span className="brand-mark"><GitPullRequest size={17}/></span><span>PRfolio</span></a>
    <div className="sidebar-workspace"><div className="workspace-avatar">{user?.displayName?.slice(0, 2).toUpperCase() ?? "—"}</div><div className="workspace-copy"><strong>{user?.displayName ?? user?.githubUsername ?? "Workspace"}</strong><span>Personal workspace</span></div><ChevronDown size={14} className="workspace-chevron"/></div>
    <div className="nav-caption">WORKSPACE</div>
    <nav className="nav-list"><button className="nav-item active" onClick={() => chooseTab("All")}><LayoutList size={17}/>Overview</button><button className={`nav-item ${tab === "All" ? "subtle-active" : ""}`} onClick={() => chooseTab("All")}><GitPullRequest size={17}/>All PRs<span className="nav-count">{counts.all}</span></button><button className={`nav-item ${tab === "Featured" ? "subtle-active" : ""}`} onClick={() => chooseTab("Featured")}><Star size={17}/>Featured<span className="nav-count">{counts.featured}</span></button><button className={`nav-item ${tab === "Hidden" ? "subtle-active" : ""}`} onClick={() => chooseTab("Hidden")}><EyeOff size={17}/>Hidden<span className="nav-count">{counts.hidden}</span></button></nav>
    <div className="nav-caption profile-caption">PROFILE</div>
    <nav className="nav-list"><a className="nav-item" href={user ? `/${user.profileSlug}` : "#"} onClick={e => { if (!user) e.preventDefault(); }}><ExternalLink size={17}/>Public profile<ArrowUpRight size={13} className="nav-external"/></a><button className="nav-item" onClick={signOut}><Settings2 size={17}/>Log out</button></nav>
    <div className="sidebar-bottom"><div className="github-connected"><span className="github-icon"><FolderGit2 size={17}/></span><span><strong>GitHub connected</strong><small>@{user?.githubUsername}</small></span><span className="connected-dot"/></div><div className="sidebar-footnote"><span className="green-dot"/> Live data <span className="foot-sep">·</span> Synced from GitHub</div></div>
  </>;

  if (!loading && !user) return <main className="app-shell" id="top"><section className="main-panel"><div className="content"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"/>YOUR CONTRIBUTION WORKSPACE</div><h1>Connect GitHub<span className="heading-period">.</span></h1><p>{authError || "Sign in to load your real pull requests and manage your public portfolio."}</p></div><button className="primary-button" onClick={() => { window.location.href = getLoginUrl(); }}><FolderGit2 size={16}/> Sign in with GitHub <ArrowUpRight size={14}/></button></div></div></section></main>;
  if (loading) return <main className="app-shell" id="top"><section className="main-panel"><div className="content"><div className="empty-state"><strong>Loading your contributions…</strong><span>Checking your PRfolio session.</span></div></div></section></main>;

  return <main className="app-shell" id="top">
    {mobileNav && <div className="mobile-backdrop" onClick={() => setMobileNav(false)}><aside className="sidebar mobile-sidebar" onClick={e => e.stopPropagation()}><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18}/></button>{sidebar}</aside></div>}
    <aside className="sidebar desktop-sidebar">{sidebar}</aside>
    <section className="main-panel">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{tab === "All" ? "Overview" : tab}</strong></div><div className="topbar-actions"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19}/></button><span className="preview-pill"><span/> LIVE DATA</span><button className="help-button" aria-label="Help" onClick={() => showNotice("Your pull requests are loaded from the connected GitHub account.")}><CircleHelp size={17}/></button>{user?.avatarUrl ? <img className="user-avatar" src={user.avatarUrl} alt={user.githubUsername}/> : <span className="user-avatar">{user?.githubUsername.slice(0, 2).toUpperCase()}</span>}</div></header>
      <div className="content">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-mark"/>YOUR CONTRIBUTION WORKSPACE</div>
            <h1>{tab === "All" ? "Your contributions" : tab === "Featured" ? "Featured PRs" : "Hidden PRs"}<span className="heading-period">.</span></h1>
            <p>{tab === "All" ? "Every contribution, ready to be curated for your public profile." : tab === "Featured" ? "Put your strongest open-source work front and center." : "These PRs stay in your workspace, out of your public profile."}</p>
          </div>
          <div className="heading-actions" role="toolbar" aria-label="Profile controls">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void copyProfileUrl()}
              aria-label="Copy public profile URL"
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span>Copy URL</span>
            </button>
            <button
              type="button"
              id="publish-profile-btn"
              className={`publish-button ${user?.isPublished ? "published" : "unpublished"}`}
              onClick={() => void togglePublication()}
              disabled={isPublishing}
              aria-label={user?.isPublished ? "Unpublish public profile" : "Publish public profile"}
              aria-pressed={user?.isPublished ?? false}
              aria-busy={isPublishing}
            >
              <Globe size={14} aria-hidden="true" />
              <span>
                {isPublishing
                  ? (user?.isPublished ? "Unpublishing…" : "Publishing…")
                  : (user?.isPublished ? "Unpublish profile" : "Publish profile")}
              </span>
            </button>
            <button
              type="button"
              id="sync-github-btn"
              className="sync-button"
              disabled={loadingAction}
              onClick={() => void sync()}
              aria-label="Synchronize pull requests from GitHub"
            >
              <RefreshCw size={14} className={loadingAction ? "animate-spin" : ""} aria-hidden="true" />
              <span>{loadingAction ? "Syncing…" : "Sync GitHub"}</span>
              <ArrowUpRight size={13} className="sync-arrow" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="stats-row"><div className="stat-card"><div className="stat-label">VISIBLE PRs <span className="stat-icon"><GitPullRequest size={15}/></span></div><div className="stat-number">{counts.all.toString().padStart(2, "0")}</div><div className="stat-description">Available for your profile</div></div><div className="stat-card"><div className="stat-label">FEATURED <span className="stat-icon star-icon"><Star size={15}/></span></div><div className="stat-number">{counts.featured.toString().padStart(2, "0")}</div><div className="stat-description">Prioritized for visitors</div></div><div className="stat-card"><div className="stat-label">MERGED <span className="stat-icon merge-icon"><GitMerge size={15}/></span></div><div className="stat-number">{counts.merged.toString().padStart(2, "0")}</div><div className="stat-description">Successfully merged</div></div></div>
        <section className="contributions-section" aria-label="Manage pull requests"><div className="section-title-row"><div><h2>Manage pull requests</h2><p>Search, sort, and decide what belongs on your profile.</p></div><div className="view-toggle" role="group" aria-label="View mode"><button className={view === "list" ? "selected" : ""} onClick={() => setView("list")} aria-label="Compact list view"><LayoutList size={16}/><span>List</span></button><button className={view === "grid" ? "selected" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={15}/><span>Grid</span></button></div></div>
          <div className="toolbar"><label className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search PRs, repositories, languages..."/><kbd>⌘ K</kbd>{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={13}/></button>}</label><label className="select-wrap"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All statuses</option><option>Merged</option><option>Open</option><option>Closed</option></select><ChevronDown size={14}/></label><label className="select-wrap repo-select"><span className="sr-only">Filter by repository</span><select value={repoFilter} onChange={e => setRepoFilter(e.target.value)}><option>All repositories</option>{repoNames.map(repo => <option key={repo}>{repo}</option>)}</select><ChevronDown size={14}/></label><label className="select-wrap sort-select"><ArrowDownUp size={14}/><select value={sort} onChange={e => setSort(e.target.value)}><option>Recently updated</option><option>Oldest first</option><option>Recently merged</option><option>Longest time to merge</option><option>Shortest time to merge</option></select><ChevronDown size={14}/></label></div>
          <div className="list-tabs"><div className="tabs-left"><button className={tab === "All" ? "active" : ""} onClick={() => chooseTab("All")}>All PRs <span>{counts.all}</span></button><button className={tab === "Featured" ? "active" : ""} onClick={() => chooseTab("Featured")}>Featured <span>{counts.featured}</span></button><button className={tab === "Hidden" ? "active" : ""} onClick={() => chooseTab("Hidden")}>Hidden <span>{counts.hidden}</span></button></div><span className="results-count">{visible.length} results</span></div>
          {view === "list" ? <div className="pr-list"><div className="list-header"><span>CONTRIBUTION</span><span>STATUS</span><span>LAST ACTIVITY</span><span aria-label="Actions"/></div>{visible.map(pr => { const isExpanded = expanded === pr.id || pinnedOpen === pr.id; return <article className={`pr-entry ${isExpanded ? "expanded" : ""}`} key={pr.id} onMouseEnter={() => { if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setExpanded(pr.id); }} onMouseLeave={() => { if (pinnedOpen !== pr.id) setExpanded(null); }}><div className="pr-row" onClick={() => setExpanded(isExpanded ? null : pr.id)} onFocus={() => setExpanded(pr.id)} tabIndex={0} role="button" aria-expanded={isExpanded} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(isExpanded ? null : pr.id); } }}><div className={`pr-state ${pr.status.toLowerCase()}`}>{pr.status === "Merged" ? <GitMerge size={16}/> : pr.status === "Open" ? <GitPullRequest size={16}/> : <X size={16}/>}</div><div className="pr-primary"><div className="repo-path"><span>{pr.owner}</span><b>/ {pr.repo}</b><span className="pr-number">#{pr.number}</span>{pr.featured && !pr.hidden && <span className="featured-mini"><Star size={10} fill="currentColor"/> Featured</span>}</div><div className="pr-title-line">{pr.title}<ExternalLink size={12} className="title-external"/></div><div className="pr-submeta"><Language name={pr.language} color={pr.languageColor}/><span className="meta-divider">·</span><span>Raised {fmtDate(pr.createdAt)}</span></div></div><div className="pr-status-cell"><StatusBadge status={pr.status}/></div><div className="pr-date-cell"><span>{fmtDate(pr.mergedAt ?? pr.updatedAt)}</span><small>{pr.mergedAt ? "Merged" : pr.status === "Open" ? "Updated" : "Last activity"}</small></div><button className="row-menu" aria-label={`More actions for ${pr.title}`} onClick={e => { e.stopPropagation(); setPinnedOpen(pinnedOpen === pr.id ? null : pr.id); setExpanded(pr.id); }}><MoreHorizontal size={18}/></button></div><div className={`expanded-panel ${isExpanded ? "shown" : ""}`} aria-hidden={!isExpanded}><div className="expanded-inner"><div className="expanded-description">{pr.description}</div><div className="detail-grid"><div className="detail-item"><span><CalendarDays size={13}/> RAISED</span><strong>{fmtDate(pr.createdAt)}</strong></div><div className="detail-item"><span><GitMerge size={13}/> MERGED</span><strong>{fmtDate(pr.mergedAt)}</strong></div><div className="detail-item"><span><Clock3 size={13}/> TIME TO MERGE</span><strong>{daysBetween(pr.createdAt, pr.mergedAt) === null ? "Not merged yet" : `${daysBetween(pr.createdAt, pr.mergedAt)} ${daysBetween(pr.createdAt, pr.mergedAt) === 1 ? "day" : "days"}`}</strong></div><div className="detail-item"><span><Code2 size={13}/> CHANGES</span><strong>Not provided</strong></div></div><div className="expanded-actions"><div className="curation-actions"><button disabled={loadingAction} className={`action-button ${pr.featured && !pr.hidden ? "is-featured" : ""}`} onClick={e => { e.stopPropagation(); void curatePR(pr.id, { featured: !pr.featured, hidden: false }, pr.featured && !pr.hidden ? "Removed from featured." : "Added to featured."); }}><Star size={14} fill={pr.featured && !pr.hidden ? "currentColor" : "none"}/>{pr.featured && !pr.hidden ? "Featured" : "Feature PR"}</button><button disabled={loadingAction} className="action-button" onClick={e => { e.stopPropagation(); void curatePR(pr.id, { hidden: !pr.hidden, featured: pr.hidden ? pr.featured : false }, pr.hidden ? "PR restored to visible contributions." : "PR hidden from your public profile."); setExpanded(null); setPinnedOpen(null); }}><EyeOff size={14}/>{pr.hidden ? "Restore visibility" : "Hide from profile"}</button></div><a className="github-link" href={pr.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>View on GitHub <ArrowUpRight size={14}/></a></div></div></div></article>; })}{visible.length === 0 && <div className="empty-state"><Search size={22}/><strong>No pull requests found</strong><span>{prs.length === 0 ? "No synchronized pull requests yet." : "Try another search or adjust your filters."}</span>{prs.length === 0 ? <button onClick={() => void sync()}>Sync GitHub</button> : <button onClick={() => { setQuery(""); setStatusFilter("All statuses"); setRepoFilter("All repositories"); }}>Clear filters</button>}</div>}</div> : <div className="pr-grid">{visible.map(pr => <article className="pr-card" key={pr.id}><div className="pr-card-top"><span className={`pr-state ${pr.status.toLowerCase()}`}>{pr.status === "Merged" ? <GitMerge size={16}/> : pr.status === "Open" ? <GitPullRequest size={16}/> : <X size={16}/>}</span><StatusBadge status={pr.status}/><button className="card-more" onClick={() => setPinnedOpen(pinnedOpen === pr.id ? null : pr.id)} aria-label="Toggle PR actions"><MoreHorizontal size={18}/></button></div><div className="card-repo">{pr.owner} / <b>{pr.repo}</b> <span>#{pr.number}</span></div><h3>{pr.title}</h3><p>{pr.description}</p><div className="card-meta"><Language name={pr.language} color={pr.languageColor}/><span>Raised {fmtDate(pr.createdAt)}</span></div><div className="card-dates"><span>Raised <b>{fmtDate(pr.createdAt)}</b></span><span>Merged <b>{fmtDate(pr.mergedAt)}</b></span></div><div className="card-actions"><button disabled={loadingAction} onClick={() => void curatePR(pr.id, { featured: !pr.featured, hidden: false }, pr.featured ? "Removed from featured." : "Added to featured.")}><Star size={14} fill={pr.featured ? "currentColor" : "none"}/>{pr.featured ? "Featured" : "Feature"}</button><button disabled={loadingAction} onClick={() => void curatePR(pr.id, { hidden: !pr.hidden, featured: pr.hidden ? pr.featured : false }, pr.hidden ? "PR restored." : "PR hidden from profile.")}><EyeOff size={14}/>{pr.hidden ? "Restore" : "Hide"}</button><a href={pr.url} target="_blank" rel="noreferrer" aria-label="View on GitHub"><ArrowUpRight size={15}/></a></div></article>)}{visible.length === 0 && <div className="empty-state"><Search size={22}/><strong>No pull requests found</strong><span>Try another search or adjust your filters.</span><button onClick={() => { setQuery(""); setStatusFilter("All statuses"); setRepoFilter("All repositories"); }}>Clear filters</button></div>}</div>}
          <div className="list-footer"><span>Showing <b>{visible.length}</b> contributions <span className="footer-dot">·</span> Live from GitHub</span><button disabled={loadingAction} onClick={() => void sync()}>Sync all PRs <ArrowUpRight size={13}/></button></div>
        </section>
        <footer className="page-footer"><span><span className="footer-brand"><GitPullRequest size={13}/></span> PRfolio <span className="footer-dot">·</span> Your work, thoughtfully presented.</span><span className="footer-right"><span className="live-dot"/> Connected <span className="footer-dot">·</span> <button onClick={signOut}>Log out</button></span></footer>
      </div>
    </section>
    {notice && (
      <div className={`toast ${notice.isError ? "toast-error" : ""}`} role="status">
        {notice.isError ? <X size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
        <span>{notice.message}</span>
        <button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={14}/></button>
      </div>
    )}
  </main>;
}
