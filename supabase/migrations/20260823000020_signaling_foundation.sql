-- Signaling foundation: watch profiles + three-tier signal model (Phase 1)

-- ---------------------------------------------------------------------------
-- watch_profiles
-- ---------------------------------------------------------------------------

create table if not exists public.watch_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  name text not null,
  description text not null default '',
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists watch_profiles_tenant_mission_idx
  on public.watch_profiles (tenant_id, mission_id)
  where deleted_at is null;

create trigger watch_profiles_set_updated_at
before update on public.watch_profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- watch_criteria
-- ---------------------------------------------------------------------------

create table if not exists public.watch_criteria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  watch_profile_id uuid not null references public.watch_profiles (id) on delete cascade,
  criterion_type text not null check (
    criterion_type in (
      'topic', 'keyword', 'entity', 'company', 'competitor', 'technology',
      'product', 'industry', 'regulatory_body', 'organization',
      'market_category', 'geography', 'domain', 'exclusion'
    )
  ),
  value text not null,
  value_normalized text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (watch_profile_id, criterion_type, value_normalized)
);

create index if not exists watch_criteria_profile_type_idx
  on public.watch_criteria (watch_profile_id, criterion_type);

create trigger watch_criteria_set_updated_at
before update on public.watch_criteria
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- watch_feeds
-- ---------------------------------------------------------------------------

create table if not exists public.watch_feeds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  watch_profile_id uuid not null references public.watch_profiles (id) on delete cascade,
  feed_type text not null default 'rss' check (feed_type in ('rss', 'news_api', 'atom')),
  feed_url text not null,
  label text,
  enabled boolean not null default true,
  last_fetched_at timestamptz,
  last_etag text,
  last_modified text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists watch_feeds_profile_url_idx
  on public.watch_feeds (watch_profile_id, feed_url)
  where deleted_at is null;

create trigger watch_feeds_set_updated_at
before update on public.watch_feeds
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- signal_sources (Tier 1)
-- ---------------------------------------------------------------------------

create table if not exists public.signal_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  watch_profile_id uuid not null references public.watch_profiles (id) on delete cascade,
  watch_feed_id uuid references public.watch_feeds (id) on delete set null,
  title text not null,
  description text not null default '',
  url text not null,
  canonical_url text not null,
  publisher text not null default '',
  author text,
  published_at timestamptz,
  ingested_at timestamptz not null default now(),
  source_type text not null check (source_type in ('rss', 'news_api', 'web', 'other')),
  domain text not null default '',
  authority_level text not null default 'unknown' check (
    authority_level in ('unknown', 'low', 'medium', 'high', 'primary')
  ),
  content_hash text not null,
  url_fingerprint text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending' check (
    processing_status in ('pending', 'clustered', 'ignored', 'failed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, url_fingerprint)
);

create index if not exists signal_sources_mission_ingested_idx
  on public.signal_sources (mission_id, ingested_at desc);

create index if not exists signal_sources_profile_ingested_idx
  on public.signal_sources (watch_profile_id, ingested_at desc);

create trigger signal_sources_set_updated_at
before update on public.signal_sources
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- candidate_signals (Tier 2)
-- ---------------------------------------------------------------------------

create table if not exists public.candidate_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  watch_profile_id uuid references public.watch_profiles (id) on delete set null,
  title text not null,
  event_fingerprint text not null,
  canonical_event_key text,
  status text not null default 'pending' check (
    status in ('pending', 'qualifying', 'qualified', 'rejected', 'expired', 'merged')
  ),
  source_count int not null default 0,
  cluster_confidence numeric(4, 3),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, mission_id, event_fingerprint)
);

create index if not exists candidate_signals_mission_status_idx
  on public.candidate_signals (mission_id, status, last_seen_at desc);

create index if not exists candidate_signals_profile_status_idx
  on public.candidate_signals (watch_profile_id, status);

create trigger candidate_signals_set_updated_at
before update on public.candidate_signals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- candidate_signal_sources
-- ---------------------------------------------------------------------------

create table if not exists public.candidate_signal_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  candidate_signal_id uuid not null references public.candidate_signals (id) on delete cascade,
  signal_source_id uuid not null references public.signal_sources (id) on delete cascade,
  link_reason text not null default 'initial' check (
    link_reason in ('initial', 'same_url', 'near_duplicate', 'same_event', 'corroboration')
  ),
  linked_at timestamptz not null default now(),
  unique (candidate_signal_id, signal_source_id)
);

create index if not exists candidate_signal_sources_source_idx
  on public.candidate_signal_sources (signal_source_id);

-- ---------------------------------------------------------------------------
-- qualified_signals (Tier 3)
-- ---------------------------------------------------------------------------

create table if not exists public.qualified_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  candidate_signal_id uuid not null references public.candidate_signals (id),
  watch_profile_id uuid references public.watch_profiles (id) on delete set null,
  title text not null,
  summary text not null default '',
  signal_type text not null default 'event' check (
    signal_type in (
      'event', 'announcement', 'trend', 'regulatory', 'competitive',
      'technology', 'market', 'conversation', 'other'
    )
  ),
  status text not null default 'active' check (
    status in ('active', 'archived', 'superseded')
  ),
  workflow_state text not null default 'signal.analyzed',
  latest_qualification_id uuid,
  qualified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists qualified_signals_one_active_per_candidate_idx
  on public.qualified_signals (candidate_signal_id)
  where deleted_at is null;

create index if not exists qualified_signals_mission_qualified_idx
  on public.qualified_signals (mission_id, qualified_at desc)
  where deleted_at is null;

create trigger qualified_signals_set_updated_at
before update on public.qualified_signals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- signal_qualifications
-- ---------------------------------------------------------------------------

create table if not exists public.signal_qualifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  candidate_signal_id uuid not null references public.candidate_signals (id) on delete cascade,
  qualified_signal_id uuid references public.qualified_signals (id) on delete set null,
  version int not null,
  is_meaningful boolean not null default false,
  what_happened text not null default '',
  why_it_matters text not null default '',
  who_is_affected jsonb not null default '[]'::jsonb,
  is_new_development boolean,
  relevance_rationale text not null default '',
  authority_rationale text not null default '',
  differentiation_rationale text not null default '',
  timeliness_rationale text not null default '',
  recommended_action text not null default '',
  disposition text not null default 'ignore' check (
    disposition in (
      'ignore', 'monitor', 'research', 'discuss', 'develop_pov', 'opportunity'
    )
  ),
  confidence numeric(4, 3),
  scores jsonb not null default '{}'::jsonb,
  overall_score int check (overall_score is null or (overall_score >= 0 and overall_score <= 100)),
  persona_ids uuid[] not null default '{}',
  capability_ids uuid[] not null default '{}',
  pov_ids uuid[] not null default '{}',
  structured_result jsonb not null default '{}'::jsonb,
  model_provider text,
  model_name text,
  prompt_name text,
  prompt_version text,
  qualified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (candidate_signal_id, version)
);

create index if not exists signal_qualifications_qualified_signal_idx
  on public.signal_qualifications (qualified_signal_id)
  where qualified_signal_id is not null;

alter table public.qualified_signals
  add constraint qualified_signals_latest_qualification_fk
  foreign key (latest_qualification_id)
  references public.signal_qualifications (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- signal_inbox_entries
-- ---------------------------------------------------------------------------

create table if not exists public.signal_inbox_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  qualified_signal_id uuid not null references public.qualified_signals (id) on delete cascade,
  read_at timestamptz,
  archived_at timestamptz,
  followed boolean not null default false,
  user_disposition text check (
    user_disposition is null or user_disposition in (
      'ignore', 'monitor', 'research', 'discuss', 'develop_pov', 'opportunity'
    )
  ),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, qualified_signal_id)
);

create trigger signal_inbox_entries_set_updated_at
before update on public.signal_inbox_entries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.watch_profiles enable row level security;
alter table public.watch_criteria enable row level security;
alter table public.watch_feeds enable row level security;
alter table public.signal_sources enable row level security;
alter table public.candidate_signals enable row level security;
alter table public.candidate_signal_sources enable row level security;
alter table public.qualified_signals enable row level security;
alter table public.signal_qualifications enable row level security;
alter table public.signal_inbox_entries enable row level security;

-- watch_profiles
create policy watch_profiles_select_member
  on public.watch_profiles for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy watch_profiles_insert_editors
  on public.watch_profiles for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = watch_profiles.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
    and exists (
      select 1 from public.missions ms
      where ms.id = watch_profiles.mission_id
        and ms.tenant_id = watch_profiles.tenant_id
        and ms.deleted_at is null
    )
  );

create policy watch_profiles_update_editors
  on public.watch_profiles for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and deleted_at is null
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = watch_profiles.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

-- watch_criteria
create policy watch_criteria_select_member
  on public.watch_criteria for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy watch_criteria_insert_editors
  on public.watch_criteria for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = watch_criteria.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
    and exists (
      select 1 from public.watch_profiles wp
      where wp.id = watch_criteria.watch_profile_id
        and wp.tenant_id = watch_criteria.tenant_id
        and wp.deleted_at is null
    )
  );

create policy watch_criteria_update_editors
  on public.watch_criteria for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = watch_criteria.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy watch_criteria_delete_editors
  on public.watch_criteria for delete to authenticated
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = watch_criteria.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

-- watch_feeds
create policy watch_feeds_select_member
  on public.watch_feeds for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy watch_feeds_insert_editors
  on public.watch_feeds for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = watch_feeds.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
    and exists (
      select 1 from public.watch_profiles wp
      where wp.id = watch_feeds.watch_profile_id
        and wp.tenant_id = watch_feeds.tenant_id
        and wp.deleted_at is null
    )
  );

create policy watch_feeds_update_editors
  on public.watch_feeds for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and deleted_at is null
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = watch_feeds.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

-- signal_sources (read-only for members in Phase 1; writes via service role in Phase 2)
create policy signal_sources_select_member
  on public.signal_sources for select to authenticated
  using (public.is_tenant_member(tenant_id));

-- candidate_signals
create policy candidate_signals_select_member
  on public.candidate_signals for select to authenticated
  using (public.is_tenant_member(tenant_id));

-- candidate_signal_sources
create policy candidate_signal_sources_select_member
  on public.candidate_signal_sources for select to authenticated
  using (public.is_tenant_member(tenant_id));

-- qualified_signals
create policy qualified_signals_select_member
  on public.qualified_signals for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy qualified_signals_update_editors
  on public.qualified_signals for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and deleted_at is null
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = qualified_signals.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

-- signal_qualifications
create policy signal_qualifications_select_member
  on public.signal_qualifications for select to authenticated
  using (public.is_tenant_member(tenant_id));

-- signal_inbox_entries
create policy signal_inbox_entries_select_member
  on public.signal_inbox_entries for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy signal_inbox_entries_insert_editors
  on public.signal_inbox_entries for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = signal_inbox_entries.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy signal_inbox_entries_update_editors
  on public.signal_inbox_entries for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = signal_inbox_entries.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );
