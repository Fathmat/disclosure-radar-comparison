import { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Check, X, AlertTriangle, ExternalLink, ShieldCheck, ShieldAlert, Eye, Filter } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { ChangeEvent, FilingMeta, Filing } from '@/lib/types';
import { buildEdgarUrl, buildEdgarDocUrl, buildEdgarTextFragmentUrl } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MaterialityBadge, IntensityScore } from '@/components/MaterialityBadge';

interface Props {
  events: ChangeEvent[];
  onUpdate: (events: ChangeEvent[]) => void;
  filingMeta: FilingMeta;
}

function EdgarLink({ cik, accession, label }: { cik?: string; accession?: string | null; label: string }) {
  if (!cik || !accession) return null;
  const url = buildEdgarUrl(cik, accession);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
      <ExternalLink className="h-3 w-3" />
      <span className="font-mono text-[10px]">{label}</span>
    </a>
  );
}

function EdgarDocLink({ filing, label }: { filing?: Filing | null; label: string }) {
  if (!filing?.cik || !filing?.accession_number || !filing?.primary_document) return null;
  const url = buildEdgarDocUrl(filing.cik, filing.accession_number, filing.primary_document);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
      <ExternalLink className="h-3 w-3" />
      <span className="font-mono text-[10px]">{label}</span>
    </a>
  );
}

function FindInDocLink({ filing, searchText, label }: { filing?: Filing | null; searchText?: string | null; label: string }) {
  if (!filing?.cik || !filing?.accession_number || !filing?.primary_document || !searchText) return null;
  const url = buildEdgarTextFragmentUrl(filing.cik, filing.accession_number, filing.primary_document, searchText);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
      <Eye className="h-3 w-3" />
      <span className="font-mono text-[10px]">{label}</span>
    </a>
  );
}

function VerificationBadge({ verified }: { verified: boolean | null }) {
  if (verified === null || verified === undefined) return null;
  return verified ? (
    <span className="inline-flex items-center gap-1 text-[hsl(var(--confidence-high))]">
      <ShieldCheck className="h-3 w-3" />
      <span className="font-mono text-[10px] font-semibold">Verified</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[hsl(var(--confidence-mid))]">
      <ShieldAlert className="h-3 w-3" />
      <span className="font-mono text-[10px] font-semibold">Unverified</span>
    </span>
  );
}

function ContextBlock({ context, span }: { context: string | null; span: string | null }) {
  if (!context) return null;

  if (span) {
    const lowerCtx = context.toLowerCase();
    const lowerSpan = span.toLowerCase();
    const idx = lowerCtx.indexOf(lowerSpan);
    if (idx !== -1) {
      const before = context.substring(0, idx);
      const match = context.substring(idx, idx + span.length);
      const after = context.substring(idx + span.length);
      return (
        <div className="mt-2 rounded bg-muted/50 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1">Document Context</span>
          …{before}<mark className="bg-[hsl(var(--confidence-mid)/0.3)] text-foreground rounded px-0.5">{match}</mark>{after}…
        </div>
      );
    }
  }

  return (
    <div className="mt-2 rounded bg-muted/50 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1">Document Context</span>
      …{context}…
    </div>
  );
}

const changeTypeColors: Record<string, string> = {
  addition: 'bg-[hsl(var(--addition))] text-white',
  deletion: 'bg-[hsl(var(--deletion))] text-white',
  modification: 'bg-[hsl(var(--modification))] text-white',
};

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 0.8 ? 'text-[hsl(var(--confidence-high))]' :
    value >= 0.5 ? 'text-[hsl(var(--confidence-mid))]' :
    'text-[hsl(var(--confidence-low))]';
  return <span className={cn('font-mono text-xs font-semibold', color)}>{value.toFixed(2)}</span>;
}

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function EventTable({ events, onUpdate, filingMeta }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (events.length === 0) return null;

  const filteredEvents = showAll
    ? events
    : events.filter(e => e.change_category !== 'structural' && e.materiality_level !== 'trivial');

  const semanticCount = events.filter(e => e.change_category === 'semantic').length;
  const structuralCount = events.filter(e => e.change_category === 'structural').length;

  const handleLabel = async (eventId: string, label: ChangeEvent['manual_label']) => {
    await supabase.from('change_events').update({ manual_label: label }).eq('id', eventId);
    onUpdate(events.map((e) => (e.id === eventId ? { ...e, manual_label: label } : e)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Material Events ({filteredEvents.length})
          {!showAll && structuralCount > 0 && (
            <span className="ml-2 text-muted-foreground/60 normal-case">
              · {structuralCount} structural hidden
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <label htmlFor="show-all" className="text-[10px] font-mono text-muted-foreground cursor-pointer">
            Show All (incl. structural)
          </label>
          <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} className="scale-75" />
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-mono text-xs">Section</TableHead>
              <TableHead className="font-mono text-xs">Change</TableHead>
              <TableHead className="font-mono text-xs">Event Tag</TableHead>
              <TableHead className="font-mono text-xs">Materiality</TableHead>
              <TableHead className="font-mono text-xs">Intensity</TableHead>
              <TableHead className="font-mono text-xs">Confidence</TableHead>
              <TableHead className="font-mono text-xs">Label</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event) => (
              <>
                <TableRow
                  key={event.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    event.change_category === 'structural' && 'opacity-50'
                  )}
                  onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                >
                  <TableCell className="p-2">
                    {expandedId === event.id ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{event.section}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px] font-mono', changeTypeColors[event.change_type])}>
                      {event.change_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatEventType(event.event_type)}</TableCell>
                  <TableCell><MaterialityBadge level={event.materiality_level} /></TableCell>
                  <TableCell><IntensityScore value={event.intensity_delta} /></TableCell>
                  <TableCell><ConfidenceBadge value={event.confidence} /></TableCell>
                  <TableCell>
                    {event.manual_label && (
                      <Badge variant={event.manual_label === 'correct' ? 'default' : event.manual_label === 'incorrect' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {event.manual_label}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                {expandedId === event.id && (
                  <TableRow key={`${event.id}-detail`}>
                    <TableCell colSpan={8} className="bg-muted/30 p-4">
                      <div className="space-y-3 text-xs">
                        <p className="text-sm">{event.description}</p>
                        {event.source_span_current && (
                          <div>
                            <span className="font-mono text-muted-foreground uppercase text-[10px] inline-flex items-center gap-2">
                              Current Filing
                              <VerificationBadge verified={event.source_verified_current} />
                              <FindInDocLink filing={filingMeta.current} searchText={event.source_span_current} label="Find in Document" />
                              <EdgarDocLink filing={filingMeta.current} label="View Document" />
                              <EdgarLink cik={filingMeta.current?.cik} accession={filingMeta.current?.accession_number} label="Filing Index" />
                            </span>
                            <blockquote className="mt-1 border-l-2 border-[hsl(var(--addition))] pl-3 font-mono text-xs leading-relaxed text-foreground/80">
                              {event.source_span_current}
                            </blockquote>
                            {event.source_context_current && (
                              <Collapsible>
                                <CollapsibleTrigger className="mt-1 font-mono text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <ChevronRight className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-90" />
                                  Show Context
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <ContextBlock context={event.source_context_current} span={event.source_span_current} />
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        )}
                        {event.source_span_previous && (
                          <div>
                            <span className="font-mono text-muted-foreground uppercase text-[10px] inline-flex items-center gap-2">
                              Previous Filing
                              <VerificationBadge verified={event.source_verified_previous} />
                              <FindInDocLink filing={filingMeta.previous} searchText={event.source_span_previous} label="Find in Document" />
                              <EdgarDocLink filing={filingMeta.previous} label="View Document" />
                              <EdgarLink cik={filingMeta.previous?.cik} accession={filingMeta.previous?.accession_number} label="Filing Index" />
                            </span>
                            <blockquote className="mt-1 border-l-2 border-[hsl(var(--deletion))] pl-3 font-mono text-xs leading-relaxed text-foreground/80">
                              {event.source_span_previous}
                            </blockquote>
                            {event.source_context_previous && (
                              <Collapsible>
                                <CollapsibleTrigger className="mt-1 font-mono text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <ChevronRight className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-90" />
                                  Show Context
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <ContextBlock context={event.source_context_previous} span={event.source_span_previous} />
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-4 pt-2 border-t border-border">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted-foreground text-[10px]">
                              {event.model_version} · {new Date(event.extraction_timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex gap-1 ml-auto">
                            <Button size="sm" variant={event.manual_label === 'correct' ? 'default' : 'ghost'} className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleLabel(event.id, 'correct'); }}>
                              <Check className="h-3 w-3 mr-1" /> Correct
                            </Button>
                            <Button size="sm" variant={event.manual_label === 'incorrect' ? 'destructive' : 'ghost'} className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleLabel(event.id, 'incorrect'); }}>
                              <X className="h-3 w-3 mr-1" /> Incorrect
                            </Button>
                            <Button size="sm" variant={event.manual_label === 'needs_review' ? 'secondary' : 'ghost'} className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleLabel(event.id, 'needs_review'); }}>
                              <AlertTriangle className="h-3 w-3 mr-1" /> Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
