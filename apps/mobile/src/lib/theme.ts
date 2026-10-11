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

export const statusColors: Record<string, { bg: string; fg: string }> = {
  succeeded: { bg: '#dff1e6', fg: '#17603a' },
  pending: { bg: '#fbefd2', fg: '#7a5a06' },
  failed: { bg: '#f8e1df', fg: '#8e1d17' },
  refunded: { bg: '#e6eaee', fg: '#44505c' },
};
