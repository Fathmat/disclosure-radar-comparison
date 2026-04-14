import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExtractionRun, ChangeEvent } from '@/lib/types';

interface Props {
  run: ExtractionRun | null;
  events: ChangeEvent[];
}

export function EvaluationPanel({ run, events }: Props) {
  if (!run) return null;

  const alignmentRate = run.sections_total && run.sections_total > 0
    ? ((run.sections_aligned || 0) / run.sections_total * 100).toFixed(1)
    : '—';

  const semanticEvents = events.filter(e => e.change_category === 'semantic');
  const materialEvents = semanticEvents.filter(e => e.materiality_level === 'material' || e.materiality_level === 'critical');
  const criticalEvents = semanticEvents.filter(e => e.materiality_level === 'critical');
  const avgIntensity = semanticEvents.length > 0
    ? (semanticEvents.reduce((sum, e) => sum + e.intensity_delta, 0) / semanticEvents.length).toFixed(1)
    : '—';

  const labeled = events.filter((e) => e.manual_label);
  const correct = events.filter((e) => e.manual_label === 'correct').length;
  const incorrect = events.filter((e) => e.manual_label === 'incorrect').length;
  const review = events.filter((e) => e.manual_label === 'needs_review').length;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evaluation</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase">Alignment</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-mono font-semibold">{alignmentRate}%</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {run.sections_aligned || 0}/{run.sections_total || 0} sections
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase">Total Events</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-mono font-semibold">{events.length}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{semanticEvents.length} semantic</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase">Material</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-mono font-semibold text-[hsl(var(--materiality-material-foreground))]">{materialEvents.length}</div>
            <div className="text-[10px] font-mono text-muted-foreground">material + critical</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase">Critical</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-mono font-semibold text-[hsl(var(--materiality-critical-foreground))]">{criticalEvents.length}</div>
            <div className="text-[10px] font-mono text-muted-foreground">critical events</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase">Avg Intensity</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-mono font-semibold">{avgIntensity}</div>
            <div className="text-[10px] font-mono text-muted-foreground">-5 to +5 scale</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase">Labels</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-mono font-semibold">{labeled.length}/{events.length}</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              ✓{correct} ✗{incorrect} ?{review}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase">Model</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-sm font-mono font-semibold">{run.model_version}</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {run.status} · {run.completed_at ? new Date(run.completed_at).toLocaleDateString() : '—'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
