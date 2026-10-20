-- Immutable document snapshots, accessed exclusively through authenticated server routes.
create table if not exists public.studio_documents (
 id bigint generated always as identity primary key,
 source_type text not null check (source_type in ('booking','project')),
 source_id uuid not null,
 fingerprint text not null unique,
 kind text not null check (kind in ('quote','invoice','receipt','statement')),
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists studio_documents_source on public.studio_documents(source_type,source_id,id);
alter table public.studio_documents enable row level security;
revoke all on public.studio_documents from anon, authenticated;
grant select, insert on public.studio_documents to service_role;
grant usage, select on sequence public.studio_documents_id_seq to service_role;

alter table public.project_quote_emails add column if not exists pdf_document_id bigint references public.studio_documents(id);
