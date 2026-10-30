alter table public.page_views add column if not exists utm_source text;
alter table public.page_views add column if not exists utm_medium text;
alter table public.page_views add column if not exists utm_campaign text;
create index if not exists page_views_campaign_time_idx on public.page_views (utm_campaign,created_at);
