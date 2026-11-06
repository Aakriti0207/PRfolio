"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Star } from "lucide-react";
import { samplePrs, stateClass, stateLabel, type SamplePr } from "./sample-prs";

type Flags = Record<number, boolean>;

const prById = new Map(samplePrs.map((pr) => [pr.id, pr]));
const pad = (value: number) => String(value).padStart(2, "0");

export default function CuratorDemo() {
  const [order, setOrder] = useState<number[]>(() => samplePrs.map((pr) => pr.id));
  const [hidden, setHidden] = useState<Flags>({});
  const [featured, setFeatured] = useState<Flags>({ 1: true, 2: true, 3: true });

  function move(id: number, direction: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggle(setter: Dispatch<SetStateAction<Flags>>, id: number) {
    setter((current) => ({ ...current, [id]: !current[id] }));
  }

  const rows = order.flatMap((id) => {
    const pr = prById.get(id);
    return pr ? [pr] : [];
  });
  const visible = rows.filter((pr) => !hidden[pr.id]);
  const published = [...visible.filter((pr) => featured[pr.id]), ...visible.filter((pr) => !featured[pr.id])];
  const orgs = new Set(published.map((pr) => pr.repo.split("/")[0])).size;

  return (
    <div className="landing-demo">
      <div className="landing-demo-bar">
        <span>Workspace <i>/</i> <strong>Overview</strong></span>
        <span className="landing-live"><i /> SAMPLE DATA</span>
      </div>

      <div className="landing-demo-body">
        <div className="landing-demo-main">
          <p className="landing-kicker"><span /> Your contribution workspace</p>
          <h3 className="landing-demo-title">Your contributions<span>.</span></h3>
          <p className="landing-demo-sub">Every contribution, ready to be curated for your public profile.</p>

          <div className="landing-demo-stats">
            <div className="landing-demo-stat"><small>VISIBLE PRS</small><b>{pad(visible.length)}</b><span>On your profile</span></div>
            <div className="landing-demo-stat"><small>FEATURED</small><b>{pad(visible.filter((pr) => featured[pr.id]).length)}</b><span>Shown first</span></div>
            <div className="landing-demo-stat"><small>MERGED</small><b>{pad(visible.filter((pr) => pr.state === "MERGED").length)}</b><span>Successfully merged</span></div>
          </div>

          <div className="landing-demo-list">
            {rows.map((pr: SamplePr, index) => {
              const isHidden = Boolean(hidden[pr.id]);
              const isFeatured = Boolean(featured[pr.id]);
              return (
                <div key={pr.id} className={`landing-demo-row${isHidden ? " is-hidden" : ""}`}>
                  <span className={`landing-badge ${stateClass[pr.state]}`}>{stateLabel[pr.state]}</span>
                  <div className="landing-demo-row-copy">
                    <strong>{pr.title}</strong>
                    <span>{pr.repo} · {pr.language} · #{pr.number}</span>
                  </div>
                  <div className="landing-demo-controls">
                    <button type="button" className="landing-icon-button" aria-label={`Move PR #${pr.number} up`} disabled={index === 0} onClick={() => move(pr.id, -1)}><ChevronUp size={16} /></button>
                    <button type="button" className="landing-icon-button" aria-label={`Move PR #${pr.number} down`} disabled={index === rows.length - 1} onClick={() => move(pr.id, 1)}><ChevronDown size={16} /></button>
                    <button type="button" className={`landing-icon-button${isFeatured ? " is-on" : ""}`} aria-label={`${isFeatured ? "Unfeature" : "Feature"} PR #${pr.number}`} aria-pressed={isFeatured} onClick={() => toggle(setFeatured, pr.id)}><Star size={16} fill={isFeatured ? "currentColor" : "none"} /></button>
                    <button type="button" className="landing-icon-button" aria-label={`${isHidden ? "Show" : "Hide"} PR #${pr.number}`} aria-pressed={isHidden} onClick={() => toggle(setHidden, pr.id)}>{isHidden ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="landing-demo-note">Sample data. Connect GitHub to curate your own pull requests.</p>
        </div>

        <div className="landing-demo-side">
          <p className="landing-demo-label">PUBLIC PROFILE · LIVE PREVIEW</p>
          <div className="landing-demo-profile">
            <div className="landing-demo-profile-url">prfolio.app/aakriti0207</div>
            <div className="landing-demo-profile-body">
              <div className="landing-demo-profile-head">
                <span className="landing-demo-avatar">A</span>
                <div><strong>Aakriti0207</strong><span>{published.length} pull requests · {orgs} {orgs === 1 ? "org" : "orgs"}</span></div>
              </div>
              <div className="landing-demo-public-list">
                {published.map((pr) => (
                  <div key={pr.id} className="landing-demo-public-item">
                    <div className="landing-demo-public-top">
                      <strong>{featured[pr.id] && <Star size={13} aria-label="Featured" />}{pr.title}</strong>
                      <span className={`landing-badge ${stateClass[pr.state]}`}>{stateLabel[pr.state]}</span>
                    </div>
                    <span>{pr.repo} · {pr.language} · #{pr.number}</span>
                  </div>
                ))}
                {published.length === 0 && <div className="landing-demo-empty">Nothing visible yet. Show a PR to add it here.</div>}
              </div>
            </div>
          </div>
          <p className="landing-demo-note">Featured PRs go first. Hidden PRs never appear on your public page.</p>
        </div>
      </div>
    </div>
  );
}