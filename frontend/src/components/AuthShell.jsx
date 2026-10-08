import "./AuthShell.css";

// Shared frame for Register and Login: dark map panel on the left, light form panel on the right.
export default function AuthShell({ headline, text, children }) {
  return (
    <div className="shell">
      <section className="map">
        <svg className="streets" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="#2b4150" strokeWidth="2">
            <path d="M-20 140 L240 200 L620 120" /><path d="M-20 420 L200 380 L430 450 L620 400" />
            <path d="M-20 660 L260 600 L620 690" /><path d="M120 -20 L160 300 L100 820" />
            <path d="M340 -20 L300 330 L380 820" /><path d="M520 -20 L480 400 L560 820" />
          </g>
          <g fill="none" stroke="#223645" strokeWidth="1">
            <path d="M-20 280 L620 250" /><path d="M-20 540 L620 560" /><path d="M230 -20 L250 820" /><path d="M430 -20 L420 820" />
          </g>
          <g transform="translate(300 330)">
            <circle className="ring" r="14" fill="none" stroke="#e5522b" strokeWidth="2" />
            <g className="pin">
              <path d="M0 0 C-14 -20 -18 -28 -18 -36 a18 18 0 1 1 36 0 c0 8 -4 16 -18 36z" fill="#e5522b" />
              <circle cy="-36" r="6" fill="#13222c" />
            </g>
          </g>
        </svg>
        <div className="brand">TRACE<i>.</i></div>
        <div className="pitch">
          <h1>{headline}</h1>
          <p>{text}</p>
        </div>
      </section>
      <main className="side"><div className="card">{children}</div></main>
    </div>
  );
}