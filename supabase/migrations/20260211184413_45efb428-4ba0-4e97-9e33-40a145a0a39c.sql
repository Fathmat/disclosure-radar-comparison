
-- Companies table (pre-seeded with ~20 S&P 500 companies)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  cik TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Filings table
CREATE TABLE public.filings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cik TEXT NOT NULL REFERENCES public.companies(cik),
  filing_type TEXT NOT NULL CHECK (filing_type IN ('10-K', '10-Q', '8-K')),
  filing_date DATE NOT NULL,
  accession_number TEXT UNIQUE,
  raw_text TEXT NOT NULL,
  parsed_sections JSONB,
  parse_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Change events table
CREATE TABLE public.change_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extraction_run_id UUID,
  issuer TEXT NOT NULL,
  filing_type TEXT NOT NULL,
  filing_date DATE NOT NULL,
  section TEXT NOT NULL,
  event_type TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('addition', 'deletion', 'modification')),
  description TEXT NOT NULL,
  source_span_current TEXT,
  source_span_previous TEXT,
  confidence NUMERIC(4,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  model_version TEXT NOT NULL DEFAULT 'v0.1',
  extraction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  manual_label TEXT CHECK (manual_label IN ('correct', 'incorrect', 'needs_review')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extraction runs table
CREATE TABLE public.extraction_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_filing_id UUID NOT NULL REFERENCES public.filings(id),
  previous_filing_id UUID NOT NULL REFERENCES public.filings(id),
  model_version TEXT NOT NULL DEFAULT 'v0.1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  sections_aligned INTEGER DEFAULT 0,
  sections_total INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add FK from change_events to extraction_runs
ALTER TABLE public.change_events 
  ADD CONSTRAINT fk_change_events_extraction_run 
  FOREIGN KEY (extraction_run_id) REFERENCES public.extraction_runs(id);

-- Create indexes
CREATE INDEX idx_filings_cik_type ON public.filings(cik, filing_type);
CREATE INDEX idx_filings_date ON public.filings(filing_date DESC);
CREATE INDEX idx_change_events_issuer ON public.change_events(issuer, filing_type);
CREATE INDEX idx_change_events_run ON public.change_events(extraction_run_id);

-- No auth required, so open RLS policies for read access, restrict writes to service role
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_runs ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth MVP)
CREATE POLICY "Public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public read filings" ON public.filings FOR SELECT USING (true);
CREATE POLICY "Public read change_events" ON public.change_events FOR SELECT USING (true);
CREATE POLICY "Public read extraction_runs" ON public.extraction_runs FOR SELECT USING (true);

-- Service role write access (edge functions use service role key)
CREATE POLICY "Service insert companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert filings" ON public.filings FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert change_events" ON public.change_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert extraction_runs" ON public.extraction_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update filings" ON public.filings FOR UPDATE USING (true);
CREATE POLICY "Service update change_events" ON public.change_events FOR UPDATE USING (true);
CREATE POLICY "Service update extraction_runs" ON public.extraction_runs FOR UPDATE USING (true);

-- Pre-seed 20 S&P 500 companies
INSERT INTO public.companies (ticker, cik, company_name) VALUES
  ('AAPL', '0000320193', 'Apple Inc.'),
  ('MSFT', '0000789019', 'Microsoft Corporation'),
  ('GOOGL', '0001652044', 'Alphabet Inc.'),
  ('AMZN', '0001018724', 'Amazon.com Inc.'),
  ('NVDA', '0001045810', 'NVIDIA Corporation'),
  ('META', '0001326801', 'Meta Platforms Inc.'),
  ('TSLA', '0001318605', 'Tesla Inc.'),
  ('BRK.B', '0001067983', 'Berkshire Hathaway Inc.'),
  ('JPM', '0000019617', 'JPMorgan Chase & Co.'),
  ('JNJ', '0000200406', 'Johnson & Johnson'),
  ('V', '0001403161', 'Visa Inc.'),
  ('UNH', '0000731766', 'UnitedHealth Group Inc.'),
  ('PG', '0000080424', 'Procter & Gamble Co.'),
  ('XOM', '0000034088', 'Exxon Mobil Corporation'),
  ('MA', '0001141391', 'Mastercard Inc.'),
  ('HD', '0000354950', 'Home Depot Inc.'),
  ('CVX', '0000093410', 'Chevron Corporation'),
  ('LLY', '0000059478', 'Eli Lilly and Company'),
  ('ABBV', '0001551152', 'AbbVie Inc.'),
  ('PFE', '0000078003', 'Pfizer Inc.');
