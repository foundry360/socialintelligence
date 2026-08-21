-- Phase 2b: document uploads for knowledge sources

alter table public.knowledge_sources
  add column if not exists storage_path text,
  add column if not exists original_filename text,
  add column if not exists mime_type text;

create index if not exists knowledge_sources_storage_path_idx
  on public.knowledge_sources (tenant_id, storage_path)
  where storage_path is not null and deleted_at is null;

-- Private bucket for tenant evidence uploads (max 10MB; MIME allowlist)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-uploads',
  'knowledge-uploads',
  false,
  10485760,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {tenant_id}/{source_id}/{filename}
-- App uploads via service role after AuthZ; policies allow member read for future signed URLs.

drop policy if exists knowledge_uploads_select_member on storage.objects;
create policy knowledge_uploads_select_member
  on storage.objects for select to authenticated
  using (
    bucket_id = 'knowledge-uploads'
    and public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists knowledge_uploads_insert_editor on storage.objects;
create policy knowledge_uploads_insert_editor
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'knowledge-uploads'
    and public.is_tenant_editor(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists knowledge_uploads_update_editor on storage.objects;
create policy knowledge_uploads_update_editor
  on storage.objects for update to authenticated
  using (
    bucket_id = 'knowledge-uploads'
    and public.is_tenant_editor(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'knowledge-uploads'
    and public.is_tenant_editor(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists knowledge_uploads_delete_editor on storage.objects;
create policy knowledge_uploads_delete_editor
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'knowledge-uploads'
    and public.is_tenant_editor(((storage.foldername(name))[1])::uuid)
  );
