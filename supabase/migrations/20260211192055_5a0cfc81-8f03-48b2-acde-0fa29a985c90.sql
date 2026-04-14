
ALTER TABLE public.change_events
  ADD COLUMN source_verified_current boolean,
  ADD COLUMN source_verified_previous boolean,
  ADD COLUMN source_offset_current integer,
  ADD COLUMN source_offset_previous integer,
  ADD COLUMN source_context_current text,
  ADD COLUMN source_context_previous text;
