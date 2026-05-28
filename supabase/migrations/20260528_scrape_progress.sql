-- Archer Atlas — live scrape progress
-- Adds columns to scrape_runs so the admin UI can poll for the currently
-- processed item and an overall completion ratio.

alter table public.scrape_runs add column if not exists items_total integer;
alter table public.scrape_runs add column if not exists current_item text;
alter table public.scrape_runs add column if not exists current_item_index integer;
alter table public.scrape_runs add column if not exists progress_updated_at timestamptz;

create index if not exists scrape_runs_status_started_idx
  on public.scrape_runs(status, started_at desc);
