const STATUS_ICON = {
  Placed: '🕐',
  Confirmed: '✅',
  Preparing: '👨‍🍳',
  Ready: '📦',
  'Picked Up': '🛵',
  Cancelled: '✖️',
};

export default function StatusBadge({ status }) {
  const cls = `status-${status.replace(/\s+/g, '-')}`;
  return (
    <span className={`status-badge ${cls}`}>
      {STATUS_ICON[status] || '•'} {status}
    </span>
  );
}

export function PaymentBadge({ status }) {
  return <span className={`status-badge pay-badge-${status}`}>{status === 'Paid' ? '💳 Paid' : status}</span>;
}
