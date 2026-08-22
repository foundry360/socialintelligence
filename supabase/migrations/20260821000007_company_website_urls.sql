-- Multiple company websites (keep website_url as primary for compatibility)

alter table public.company_profiles
  add column if not exists website_urls jsonb not null default '[]'::jsonb;

update public.company_profiles
set website_urls = jsonb_build_array(website_url)
where website_url is not null
  and website_url <> ''
  and (website_urls is null or website_urls = '[]'::jsonb);
