import "./StatusBadge.css";

// What each verification status means, in words a citizen will understand.
export const STATUS_INFO = {
  Pending: {
    label: "Pending",
    explain: "An authority hasn’t reviewed this yet. They may contact you by phone or email on your account.",
  },
  Verified: {
    label: "Verified",
    explain: "An authority confirmed this report. It now appears on the public map, without your name.",
  },
  Rejected: {
    label: "Rejected",
    explain: "An authority reviewed this report and didn’t accept it. It isn’t shown on the public map.",
  },
};

const GLYPH = {
  Pending: <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.6 2" />,
  Verified: <path d="M3.5 8.4l3 3 6-6.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  Rejected: <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
};

// The text and the icon shape both carry the status, so it never depends on colour alone.
export default function StatusBadge({ status }) {
  const known = STATUS_INFO[status] ? status : "Pending";
  return (
    <span className={`sb sb-${known.toLowerCase()}`}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">{GLYPH[known]}</svg>
      {STATUS_INFO[known].label}
    </span>
  );
}