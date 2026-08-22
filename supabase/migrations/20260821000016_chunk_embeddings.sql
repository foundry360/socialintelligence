-- pgvector embeddings for semantic chunk retrieval (optional; requires OPENAI_API_KEY in app)

alter table public.knowledge_chunks
  add column if not exists embedding vector(1536);

create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create or replace function public.search_knowledge_chunks_vector(
  p_tenant_id uuid,
  p_embedding vector(1536),
  p_limit int default 8
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_title text,
  chunk_index int,
  content text,
  rank real
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_tenant_member(p_tenant_id) then
    raise exception 'not a tenant member';
  end if;

  return query
  select
    c.id as chunk_id,
    c.source_id,
    s.title as source_title,
    c.chunk_index,
    c.content,
    (1 - (c.embedding <=> p_embedding))::real as rank
  from public.knowledge_chunks c
  join public.knowledge_sources s on s.id = c.source_id
  where c.tenant_id = p_tenant_id
    and c.embedding is not null
    and s.deleted_at is null
    and s.evidence_status = 'accepted'
    and s.sensitivity <> 'confidential'
  order by c.embedding <=> p_embedding
  limit greatest(1, least(p_limit, 20));
end;
$$;

revoke all on function public.search_knowledge_chunks_vector(uuid, vector, int) from public;
grant execute on function public.search_knowledge_chunks_vector(uuid, vector, int) to authenticated;
