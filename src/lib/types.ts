export interface Company {
  id: string;
  ticker: string;
  cik: string;
  company_name: string;
}

export interface Filing {
  id: string;
  cik: string;
  filing_type: string;
  filing_date: string;
  accession_number: string | null;
  primary_document: string | null;
  parsed_sections: Record<string, string> | null;
  parse_version: string | null;
  created_at: string;
}

export type ChangeCategory = 'structural' | 'semantic';
export type MaterialityLevel = 'trivial' | 'moderate' | 'material' | 'critical';
export type EconomicEventType =
  | 'risk_new_category_added'
  | 'risk_intensity_increased'
  | 'liquidity_warning_added'
  | 'litigation_exposure_added'
  | 'revenue_dependency_change'
  | 'segment_reporting_change'
  | 'guidance_language_weakened'
  | 'macro_exposure_increased'
  | 'supply_chain_risk_added'
  | 'credit_risk_language_added'
  | 'structural_noise';

export interface ChangeEvent {
  id: string;
  extraction_run_id: string | null;
  issuer: string;
  filing_type: string;
  filing_date: string;
  section: string;
  event_type: string;
  change_type: 'addition' | 'deletion' | 'modification';
  change_category: ChangeCategory;
  materiality_level: MaterialityLevel;
  intensity_delta: number;
  description: string;
  source_span_current: string | null;
  source_span_previous: string | null;
  confidence: number;
  model_version: string;
  extraction_timestamp: string;
  manual_label: 'correct' | 'incorrect' | 'needs_review' | null;
  source_verified_current: boolean | null;
  source_verified_previous: boolean | null;
  source_offset_current: number | null;
  source_offset_previous: number | null;
  source_context_current: string | null;
  source_context_previous: string | null;
}

export interface ExtractionRun {
  id: string;
  current_filing_id: string;
  previous_filing_id: string;
  model_version: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  sections_aligned: number | null;
  sections_total: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export type FilingType = '10-K' | '10-Q' | '8-K';

export interface FilingMeta {
  current: Filing | null;
  previous: Filing | null;
}

export function buildEdgarUrl(cik: string, accessionNumber: string): string {
  const cleanCik = cik.replace(/^0+/, '');
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionNoDashes}/`;
}

export function buildEdgarDocUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const cleanCik = cik.replace(/^0+/, '');
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionNoDashes}/${primaryDocument}`;
}

export function buildEdgarTextFragmentUrl(cik: string, accessionNumber: string, primaryDocument: string, searchText: string): string {
  const baseUrl = buildEdgarDocUrl(cik, accessionNumber, primaryDocument);
  const truncated = searchText.substring(0, 100).trim();
  const encoded = encodeURIComponent(truncated);
  return `${baseUrl}#:~:text=${encoded}`;
}
