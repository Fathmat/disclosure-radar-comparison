import type { ChangeEvent, MaterialityLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  events: ChangeEvent[];
}

const materialityColors: Record<MaterialityLevel, string> = {
  trivial: 'bg-[hsl(var(--heatmap-0))]',
  moderate: 'bg-[hsl(var(--heatmap-2))]',
  material: 'bg-[hsl(var(--heatmap-4))] text-white',
  critical: 'bg-[hsl(var(--heatmap-5))] text-white',
};

export function ChangeHeatmap({ events }: Props) {
  // Only count semantic events
  const semanticEvents = events.filter(e => e.change_category === 'semantic');
  if (semanticEvents.length === 0) return null;

  // Group by section, then count by materiality
  const sectionData = semanticEvents.reduce<Record<string, { total: number; byMateriality: Record<MaterialityLevel, number> }>>((acc, e) => {
    if (!acc[e.section]) {
      acc[e.section] = { total: 0, byMateriality: { trivial: 0, moderate: 0, material: 0, critical: 0 } };
    }
    acc[e.section].total++;
    acc[e.section].byMateriality[e.materiality_level]++;
    return acc;
  }, {});

  const sections = Object.entries(sectionData).sort((a, b) => b[1].total - a[1].total);

  // Pick color based on highest materiality present
  const getColor = (data: { byMateriality: Record<MaterialityLevel, number> }): string => {
    if (data.byMateriality.critical > 0) return materialityColors.critical;
    if (data.byMateriality.material > 0) return materialityColors.material;
    if (data.byMateriality.moderate > 0) return materialityColors.moderate;
    return materialityColors.trivial;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Materiality Heatmap</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
        {sections.map(([section, data]) => (
          <div
            key={section}
            className={cn(
              'rounded px-3 py-2 text-xs font-mono transition-colors',
              getColor(data)
            )}
          >
            <div className="font-medium truncate">{section}</div>
            <div className="opacity-80">
              {data.total} event{data.total !== 1 ? 's' : ''}
              {data.byMateriality.critical > 0 && ` · ${data.byMateriality.critical} critical`}
              {data.byMateriality.material > 0 && ` · ${data.byMateriality.material} material`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
