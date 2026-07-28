export const StatusBadge = ({ status }: { status: string }) => {
  const normalized = status.replace('_', ' ');
  return <span className={`status-badge status-${status}`}>{normalized}</span>;
};
