import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';
import type { Company, FilingType } from '@/lib/types';

interface Props {
  onRun: (cik: string, ticker: string, filingType: string) => void;
  isRunning: boolean;
  stage: string;
}

const FILING_TYPES: FilingType[] = ['10-K', '10-Q', '8-K'];

export function CompanySelector({ onRun, isRunning, stage }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [filingType, setFilingType] = useState<string>('10-K');

  useEffect(() => {
    supabase.from('companies').select('*').order('ticker').then(({ data }) => {
      if (data) setCompanies(data as unknown as Company[]);
    });
  }, []);

  const selected = companies.find((c) => c.ticker === selectedTicker);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</label>
        <Select value={selectedTicker} onValueChange={setSelectedTicker}>
          <SelectTrigger className="w-[240px] font-mono text-sm">
            <SelectValue placeholder="Select issuer" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.ticker} value={c.ticker} className="font-mono text-sm">
                {c.ticker} — {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filing Type</label>
        <Select value={filingType} onValueChange={setFilingType}>
          <SelectTrigger className="w-[120px] font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILING_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="font-mono text-sm">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={() => selected && onRun(selected.cik, selected.ticker, filingType)}
        disabled={!selectedTicker || isRunning}
        className="gap-2"
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isRunning ? 'Running...' : 'Run Extraction'}
      </Button>

      {isRunning && stage && (
        <span className="text-xs font-mono text-muted-foreground animate-pulse">{stage}</span>
      )}
    </div>
  );
}
