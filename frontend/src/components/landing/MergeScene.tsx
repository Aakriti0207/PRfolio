import { samplePrs, stateClass, stateLabel } from "./sample-prs";

// Order the cards appear around the stage (index into samplePrs).
const sceneOrder = [4, 1, 3, 0, 5, 2];

export default function MergeScene() {
  return (
    <div className="landing-scene" role="img" aria-label="Animation: scattered pull requests gather into one public profile">
      <div className="landing-scene-glow" aria-hidden="true" />

      {sceneOrder.map((index, position) => {
        const pr = samplePrs[index];
        return (
          <div key={pr.id} className={`landing-scene-card landing-scene-card-${position + 1}`} aria-hidden="true">
            <div className="landing-scene-card-top">
              <strong>{pr.title}</strong>
              <span className={`landing-badge ${stateClass[pr.state]}`}>{stateLabel[pr.state]}</span>
            </div>
            <span className="landing-scene-card-meta">{pr.repo} · {pr.language} · #{pr.number}</span>
          </div>
        );
      })}

      <div className="landing-scene-reveal" aria-hidden="true">
        <div className="landing-scene-profile">
          <div className="landing-demo-profile-url">prfolio.app/aakriti0207</div>
          <div className="landing-demo-profile-body">
            <div className="landing-demo-profile-head">
              <span className="landing-demo-avatar">A</span>
              <strong>Aakriti0207</strong>
            </div>
            <div className="landing-demo-public-list">
              {samplePrs.map((pr) => (
                <div key={pr.id} className="landing-scene-profile-row">
                  <span>{pr.title}</span>
                  <span className={`landing-badge ${stateClass[pr.state]}`}>{stateLabel[pr.state]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}