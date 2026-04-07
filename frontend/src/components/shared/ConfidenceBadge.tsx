interface Props { confidence: number; }

export function ConfidenceBadge({ confidence }: Props) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                pct >= 50 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border-red-500/30';
  const emoji = pct >= 80 ? '🟢' : pct >= 50 ? '🟡' : '🔴';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${color}`}>
      {emoji} {pct}%
    </span>
  );
}
