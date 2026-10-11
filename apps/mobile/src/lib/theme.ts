// Same colours as the web app (apps/web/src/styles.css) so the two look related.
export const colors = {
  brand: '#1d5e6e',
  brandDark: '#164a57',
  brandTint: '#e6eff1',
  ink: '#1f2933',
  muted: '#6b7785',
  line: '#dde2e8',
  bg: '#f3f5f7',
  card: '#ffffff',
  danger: '#b3261e',
  dangerTint: '#fdf0ef',
};

const good = { bg: '#dff1e6', fg: '#17603a' };
const waiting = { bg: '#fbefd2', fg: '#7a5a06' };
const moving = { bg: '#dcebf0', fg: '#164a57' };
const bad = { bg: '#f8e1df', fg: '#8e1d17' };
const neutral = { bg: '#e6eaee', fg: '#44505c' };

// Badge colours for every status the app shows.
export const statusColors: Record<string, { bg: string; fg: string }> = {
  succeeded: good,
  completed: good,
  approved: good,
  pending: waiting,
  requested: waiting,
  assigned: waiting,
  no_provider: waiting,
  accepted: moving,
  en_route: moving,
  arrived: moving,
  in_progress: moving,
  failed: bad,
  cancelled: bad,
  rejected: bad,
  refunded: neutral,
};
