"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  FolderGit2,
  GitPullRequest,
  Globe2,
  Menu,
  MoveUpRight,
  Sparkles,
} from "lucide-react";
import { getCurrentUser, getLoginUrl, type ApiUser } from "../lib/api";
import CuratorDemo from "../components/landing/CuratorDemo";
import HeroGraph from "../components/landing/HeroGraph";
import MergeScene from "../components/landing/MergeScene";

const profilePreviewPath = "/Aakriti0207";

function LandingNav({ user }: { user: ApiUser | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const destination = user ? "/dashboard" : getLoginUrl();
  return (
    <header className="landing-nav">
      <Link className="landing-brand" href="/" aria-label="PRfolio home">
        <span className="landing-brand-mark"><GitPullRequest size={16} /></span>
        <span>PRfolio</span>
      </Link>
      <nav className={`landing-nav-links ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
        <a href="#product" onClick={() => setMenuOpen(false)}>Product</a>
        <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
        <a href={profilePreviewPath} onClick={() => setMenuOpen(false)}>Explore</a>
      </nav>
      <div className="landing-nav-actions">
        {!user && <a className="landing-login" href={getLoginUrl()}>Log in</a>}
        <a className="landing-nav-cta" href={destination}>{user ? "Dashboard" : "Get started"} <ArrowUpRight size={14} /></a>
        <button className="landing-menu-button" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><Menu size={18} /></button>
      </div>
    </header>
  );
}

export default function LandingPage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUser().then((currentUser) => {
      if (active) setUser(currentUser);
    }).catch(() => {
      if (active) setUser(null);
    }).finally(() => {
      if (active) setSessionChecked(true);
    });
    return () => { active = false; };
  }, []);

  const signedIn = sessionChecked && user !== null;
  const ctaHref = signedIn ? "/dashboard" : getLoginUrl();

  return (
    <main className="landing-page">
      <div className="public-grain" aria-hidden="true" />
      <LandingNav user={user} />
      <section className="landing-hero">
        <HeroGraph />
        <div className="landing-hero-streak" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="landing-kicker"><span /> For open-source contributors</p>
          <h1>Every PR you&apos;ve shipped.<br /><em>One link.</em></h1>
          <p className="landing-hero-text">Connect GitHub, choose which pull requests to show, put them in your order, then publish one clean link for your resume.</p>
          <div className="landing-hero-actions">
            <a className="landing-primary-button" href={ctaHref}>{signedIn ? "Open your dashboard" : "Continue with GitHub"} <ArrowUpRight size={16} /></a>
            <a className="landing-secondary-button" href="#how-it-works">See how it works <MoveUpRight size={15} /></a>
          </div>
        </div>
        <div className="landing-hero-note"><ArrowDownRight size={15} /> A public profile built from the work you already do.</div>
      </section>

      <section className="landing-showcase" id="product">
        <div className="landing-section-intro">
          <p className="landing-kicker">The dashboard</p>
          <h2>Choose what to show.<br />Put it in order.</h2>
          <p>Hide what doesn&apos;t belong, feature your best work, and reorder the rest. Your public profile updates as you curate. Try it below.</p>
        </div>
        <CuratorDemo />
      </section>

      <section className="landing-story landing-story-activity">
        <div className="landing-story-index">01</div>
        <div>
          <h2>Your activity,<br /><span>visualized.</span></h2>
          <p>Show the consistency behind the highlights with a contribution graph synced from GitHub.</p>
        </div>
        <div className="landing-mini-graph" aria-label="Contribution activity preview">
          {Array.from({ length: 84 }, (_, index) => <i key={index} style={{ opacity: [0.2, 0.35, 0.55, 0.8, 1][(index * 7) % 5] }} />)}
        </div>
      </section>

      <section className="landing-share-section">
        <div>
          <p className="landing-kicker">A profile that travels</p>
          <h2>One link.<br />Your developer story.</h2>
        </div>
        <div className="landing-share-copy">
          <p>Share a living record of your work on a resume, in an application, or wherever your next opportunity starts.</p>
          <a href={profilePreviewPath}>See a public profile <ArrowUpRight size={15} /></a>
        </div>
      </section>

      <section className="landing-how" id="how-it-works">
        <div className="landing-how-heading">
          <p className="landing-kicker">How it works</p>
          <h2>Three steps from code<br />to a profile worth sharing.</h2>
        </div>
        <MergeScene />
        <div className="landing-steps">
          <div><span>01</span><FolderGit2 size={22} /><h3>Connect GitHub</h3><p>Authorize PRfolio with the GitHub account behind your work.</p></div>
          <div><span>02</span><Sparkles size={22} /><h3>Sync and curate</h3><p>Pull requests sync from GitHub. Show, hide, feature and reorder each one.</p></div>
          <div><span>03</span><Globe2 size={22} /><h3>Publish your profile</h3><p>Share one public link. Unpublish whenever you want.</p></div>
        </div>
      </section>

      <section className="landing-final-cta">
        <p className="landing-kicker">Start with the work</p>
        <h2>Your work speaks.<br /><span>Give it a place.</span></h2>
        <a className="landing-primary-button" href={ctaHref}>Build your PRfolio <ArrowUpRight size={16} /></a>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/" aria-label="PRfolio home"><span className="landing-brand-mark"><GitPullRequest size={14} /></span><span>PRfolio</span></Link>
        <span>Built for open-source contributors - By Aakriti Arya 🫶</span>
      </footer>
    </main>
  );
}