import { cn } from '@/lib/utils';
import type { MaterialityLevel } from '@/lib/types';

const materialityStyles: Record<MaterialityLevel, string> = {
  trivial: 'bg-[hsl(var(--materiality-trivial))] text-[hsl(var(--materiality-trivial-foreground))]',
  moderate: 'bg-[hsl(var(--materiality-moderate))] text-[hsl(var(--materiality-moderate-foreground))]',
  material: 'bg-[hsl(var(--materiality-material))] text-[hsl(var(--materiality-material-foreground))]',
  critical: 'bg-[hsl(var(--materiality-critical))] text-[hsl(var(--materiality-critical-foreground))]',
};

export function MaterialityBadge({ level }: { level: MaterialityLevel }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold', materialityStyles[level])}>
      {level}
    </span>
  );
}

export function IntensityScore({ value }: { value: number }) {
  const color =
    value >= 3 ? 'text-[hsl(var(--materiality-critical))]' :
    value >= 1 ? 'text-[hsl(var(--materiality-material))]' :
    value <= -3 ? 'text-[hsl(var(--confidence-high))]' :
    value <= -1 ? 'text-[hsl(var(--confidence-mid))]' :
    'text-muted-foreground';

  const prefix = value > 0 ? '+' : '';
  return <span className={cn('font-mono text-xs font-semibold', color)}>{prefix}{value.toFixed(1)}</span>;
}
