// The three role names. They MUST match the role strings in your backend (see config/authority.config.js).
export const ROLE = {
  CITIZEN: "citizen",
  AUTHORITY: "authority", // can review and verify reports
  ADMIN: "admin",     // authority powers plus delete reports and change roles
};

// Offered in the Admin "Change a role" dropdown.
export const ROLES = Object.values(ROLE);

// Who may open each area. Edit this one table to change visibility everywhere (routes, nav links, redirects).
export const ACCESS = {
  report: [ROLE.CITIZEN],
  myreports: [ROLE.CITIZEN],
  review: [ROLE.AUTHORITY, ROLE.ADMIN],
  admin: [ROLE.ADMIN],
  incidents: ROLES, // View incidents: any signed-in role. Narrow this list if it should be restricted.
};

// Where each role lands after login, and when they open a page that isn't theirs.
const HOME = {
  [ROLE.CITIZEN]: "/report",
  [ROLE.AUTHORITY]: "/authority",
  [ROLE.ADMIN]: "/authority",
};

const AREA_BY_PATH = { "/report": "report", "/my-reports": "myreports", "/authority": "review", "/admin": "admin", "/view-incidents": "incidents" };

export const canAccess = (role, area) => !!role && ACCESS[area]?.includes(role);
export const homeFor = (role) => HOME[role] || "/login";
export const pathAllowed = (role, path) => canAccess(role, AREA_BY_PATH[path]);

// True only for a role string we recognise. Guards against a login response that has no role.
export const isKnownRole = (role) => ROLES.includes(role);