export const colors = {
  brand: '#1f7a45',
  brandDark: '#186238',
  brandTint: '#eef7f1',
  ink: '#1c1f1d',
  muted: '#78716c',
  line: '#d6d3d1',
  bg: '#f5f5f4',
  card: '#ffffff',
  danger: '#b42318',
  dangerTint: '#fef3f2',
};

export const statusColors: Record<string, { bg: string; fg: string }> = {
  succeeded: { bg: '#dcfce7', fg: '#166534' },
  pending: { bg: '#fef3c7', fg: '#92400e' },
  failed: { bg: '#fee2e2', fg: '#991b1b' },
  refunded: { bg: '#e7e5e4', fg: '#44403c' },
};
