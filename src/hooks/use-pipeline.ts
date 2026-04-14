import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChangeEvent, ExtractionRun, Filing, FilingMeta } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function usePipeline() {
  const [isRunning, setIsRunning] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [run, setRun] = useState<ExtractionRun | null>(null);
  const [filingMeta, setFilingMeta] = useState<FilingMeta>({ current: null, previous: null });
  const { toast } = useToast();

  const runPipeline = async (cik: string, ticker: string, filingType: string) => {
    setIsRunning(true);
    setEvents([]);
    setRun(null);
    setFilingMeta({ current: null, previous: null });

    try {
      // Stage 1: Fetch filings
      setStage('Fetching filings from SEC EDGAR...');
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke('fetch-filing', {
        body: { cik, filing_type: filingType },
      });
      if (fetchError) throw new Error(fetchError.message || 'Failed to fetch filings');
      if (fetchData?.error) throw new Error(fetchData.error);

      const { current_filing_id, previous_filing_id } = fetchData;
      if (!current_filing_id || !previous_filing_id) {
        throw new Error('Could not find two comparable filings for this company.');
      }

      // Stage 2: Parse sections
      setStage('Parsing filing sections...');
      for (const filingId of [current_filing_id, previous_filing_id]) {
        const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-sections', {
          body: { filing_id: filingId },
        });
        if (parseError) throw new Error(parseError.message || 'Failed to parse sections');
        if (parseData?.error) throw new Error(parseData.error);
      }

      // Stage 3: Extract changes
      setStage('Extracting changes with AI...');
      const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-changes', {
        body: { current_filing_id, previous_filing_id, ticker },
      });
      if (extractError) throw new Error(extractError.message || 'Failed to extract changes');
      if (extractData?.error) throw new Error(extractData.error);

      // Load results
      setStage('Loading results...');
      const runId = extractData.extraction_run_id;

      const { data: runData } = await supabase
        .from('extraction_runs')
        .select('*')
        .eq('id', runId)
        .maybeSingle();
      if (runData) {
        setRun(runData as unknown as ExtractionRun);

        // Fetch filing metadata for EDGAR links
        const { data: filingsData } = await supabase
          .from('filings')
          .select('id, cik, accession_number, filing_date, filing_type, primary_document')
          .in('id', [runData.current_filing_id, runData.previous_filing_id]);

        if (filingsData) {
          setFilingMeta({
            current: (filingsData.find((f: any) => f.id === runData.current_filing_id) as unknown as Filing) || null,
            previous: (filingsData.find((f: any) => f.id === runData.previous_filing_id) as unknown as Filing) || null,
          });
        }
      }

      const { data: eventsData } = await supabase
        .from('change_events')
        .select('*')
        .eq('extraction_run_id', runId)
        .order('section', { ascending: true });
      if (eventsData) setEvents(eventsData as unknown as ChangeEvent[]);

      setStage('Complete');
      toast({ title: 'Extraction complete', description: `Found ${eventsData?.length || 0} change events.` });
    } catch (err: any) {
      console.error('Pipeline error:', err);
      setStage('Failed');
      toast({ title: 'Pipeline error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  return { isRunning, stage, events, run, filingMeta, runPipeline, setEvents };
}
