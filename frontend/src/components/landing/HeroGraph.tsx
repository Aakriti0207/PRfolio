const branches = [
  "M1460 -20 C 1300 150, 1180 380, 1020 560",
  "M1460 300 C 1320 360, 1180 480, 1020 560",
  "M700 -20 C 800 200, 940 420, 1020 560",
  "M-20 760 C 300 800, 700 700, 1020 560",
  "M1460 820 C 1300 760, 1160 650, 1020 560",
  "M300 -20 C 420 300, 780 440, 1020 560",
];

const commits: Array<{ x: number; y: number; color: string }> = [
  { x: 1300, y: 140, color: "#8ed7a0" },
  { x: 1330, y: 330, color: "#c5a4ff" },
  { x: 720, y: 10, color: "#8ed7a0" },
  { x: 330, y: 770, color: "#c5a4ff" },
  { x: 1300, y: 790, color: "#8ed7a0" },
  { x: 390, y: 60, color: "#c5a4ff" },
];

export default function HeroGraph() {
  return (
    <svg className="landing-hero-graph" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="#8ed7a0" strokeWidth="1.5" strokeLinecap="round" opacity=".3">
        {branches.map((d) => <path key={d} className="branch" d={d} />)}
      </g>
      <g fill="none" stroke="#8ed7a0" strokeWidth="1" opacity=".1">
        {branches.map((d) => <path key={d} d={d} />)}
      </g>
      {commits.map((commit) => <circle key={`${commit.x}-${commit.y}`} cx={commit.x} cy={commit.y} r="4" fill={commit.color} />)}
      <circle cx="1020" cy="560" r="26" fill="#8ed7a0" opacity=".12" />
      <circle cx="1020" cy="560" r="9" fill="#8ed7a0" />
    </svg>
  );
}