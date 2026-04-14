ALTER TABLE public.change_events
  ADD COLUMN change_category text DEFAULT 'semantic',
  ADD COLUMN materiality_level text DEFAULT 'moderate',
  ADD COLUMN intensity_delta real DEFAULT 0;