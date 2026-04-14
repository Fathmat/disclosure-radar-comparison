import { CompanySelector } from '@/components/CompanySelector';
import { ChangeHeatmap } from '@/components/ChangeHeatmap';
import { EventTable } from '@/components/EventTable';
import { EvaluationPanel } from '@/components/EvaluationPanel';
import { usePipeline } from '@/hooks/use-pipeline';

const Index = () => {
  const { isRunning, stage, events, run, filingMeta, runPipeline, setEvents } = usePipeline();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Material Disclosure Intelligence Engine</h1>
            <p className="text-xs font-mono text-muted-foreground">Structured SEC filing material change detection</p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">v0.2</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <CompanySelector onRun={runPipeline} isRunning={isRunning} stage={stage} />
        <ChangeHeatmap events={events} />
        <EvaluationPanel run={run} events={events} />
        <EventTable events={events} onUpdate={setEvents} filingMeta={filingMeta} />
      </main>
    </div>
  );
};

export default Index;
