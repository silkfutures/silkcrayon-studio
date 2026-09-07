-- V20.12.4 — explicit audio/video production + post-production pricing
-- Run after v20-12-2-project-sessions.sql.

alter table public.studio_projects
  add column if not exists audio_recording_amount_pence integer not null default 0,
  add column if not exists video_production_amount_pence integer not null default 0,
  add column if not exists audio_post_amount_pence integer not null default 0,
  add column if not exists video_post_amount_pence integer not null default 0;

-- Preserve every existing quote without changing its total. Existing generic recording
-- becomes audio recording and existing generic post-production becomes audio post.
update public.studio_projects
set
  audio_recording_amount_pence = coalesce(recording_amount_pence,0),
  audio_post_amount_pence = coalesce(post_amount_pence,0)
where
  coalesce(audio_recording_amount_pence,0) = 0
  and coalesce(video_production_amount_pence,0) = 0
  and coalesce(audio_post_amount_pence,0) = 0
  and coalesce(video_post_amount_pence,0) = 0
  and (coalesce(recording_amount_pence,0) > 0 or coalesce(post_amount_pence,0) > 0);

-- Keep legacy aggregate columns consistent for older reporting/UI paths.
update public.studio_projects
set
  recording_amount_pence = coalesce(audio_recording_amount_pence,0) + coalesce(video_production_amount_pence,0),
  post_amount_pence = coalesce(audio_post_amount_pence,0) + coalesce(video_post_amount_pence,0),
  quote_amount_pence = coalesce(audio_recording_amount_pence,0) + coalesce(video_production_amount_pence,0) + coalesce(audio_post_amount_pence,0) + coalesce(video_post_amount_pence,0);
