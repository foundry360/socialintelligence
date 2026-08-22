"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import {
  isReservedCatalogSlug,
  slugifyTag,
  SOURCE_CATALOGS,
} from "@/lib/workspace/library";

const BUILTIN_CATALOG_IDS = new Set<string>(
  SOURCE_CATALOGS.map((catalog) => catalog.id),
);

async function isValidCatalogSlug(tenantId: string, slug: string) {
  if (BUILTIN_CATALOG_IDS.has(slug)) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("library_catalogs")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();
  return Boolean(data);
}

async function assertSourceOwned(tenantId: string, sourceId: string) {
  const supabase = await createClient();
  const { data: source } = await supabase
    .from("knowledge_sources")
    .select("id")
    .eq("id", sourceId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!source) throw new Error("Source not found.");
}

export async function createLibraryCatalog(name: string) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const trimmed = name.trim();
  const slug = slugifyTag(trimmed);

  if (!trimmed) throw new Error("Catalog name is required.");
  if (!slug) throw new Error("Catalog name is required.");
  if (isReservedCatalogSlug(slug)) {
    throw new Error("That catalog name is reserved. Choose another name.");
  }

  const { data: existing } = await supabase
    .from("library_catalogs")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) throw new Error("A catalog with that name already exists.");

  const { data: last } = await supabase
    .from("library_catalogs")
    .select("sort_order")
    .eq("tenant_id", ctx.tenantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("library_catalogs").insert({
    tenant_id: ctx.tenantId,
    name: trimmed,
    slug,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  if (error) throw new Error(error.message);

  revalidateLibrary();
  return slug;
}

export async function addCatalogToSource(sourceId: string, catalogSlug: string) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const slug = catalogSlug.trim();
  if (!slug) throw new Error("Catalog is required.");

  const valid = await isValidCatalogSlug(ctx.tenantId, slug);
  if (!valid) throw new Error("Invalid catalog.");

  await assertSourceOwned(ctx.tenantId, sourceId);

  const { error } = await supabase.from("knowledge_source_catalogs").insert({
    tenant_id: ctx.tenantId,
    source_id: sourceId,
    catalog_slug: slug,
  });
  if (error && error.code !== "23505") throw new Error(error.message);

  revalidateLibrary(sourceId);
}

export async function removeCatalogFromSource(
  sourceId: string,
  catalogSlug: string,
) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("knowledge_source_catalogs")
    .delete()
    .eq("source_id", sourceId)
    .eq("catalog_slug", catalogSlug)
    .eq("tenant_id", ctx.tenantId);

  if (error) throw new Error(error.message);

  revalidateLibrary(sourceId);
}

export async function clearSourceCatalogs(sourceId: string) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("knowledge_source_catalogs")
    .delete()
    .eq("source_id", sourceId)
    .eq("tenant_id", ctx.tenantId);

  if (error) throw new Error(error.message);

  revalidateLibrary(sourceId);
}

export async function addTagToSource(sourceId: string, tagName: string) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const name = tagName.trim();
  const slug = slugifyTag(name);
  if (!slug) throw new Error("Tag name is required.");

  const { data: source } = await supabase
    .from("knowledge_sources")
    .select("id")
    .eq("id", sourceId)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!source) throw new Error("Source not found.");

  let tagId: string;
  const { data: existing } = await supabase
    .from("source_tags")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    tagId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("source_tags")
      .insert({
        tenant_id: ctx.tenantId,
        name,
        slug,
      })
      .select("id")
      .single();
    if (createError || !created) {
      throw new Error(createError?.message ?? "Failed to create tag.");
    }
    tagId = created.id;
  }

  const { error: linkError } = await supabase.from("knowledge_source_tags").insert({
    tenant_id: ctx.tenantId,
    source_id: sourceId,
    tag_id: tagId,
  });
  if (linkError && linkError.code !== "23505") throw new Error(linkError.message);

  revalidateLibrary(sourceId);
}

export async function removeTagFromSource(sourceId: string, tagId: string) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("knowledge_source_tags")
    .delete()
    .eq("source_id", sourceId)
    .eq("tag_id", tagId)
    .eq("tenant_id", ctx.tenantId);

  if (error) throw new Error(error.message);

  revalidateLibrary(sourceId);
}

function revalidateLibrary(sourceId?: string) {
  revalidatePath("/workspace/library");
  if (sourceId) revalidatePath(`/workspace/library/${sourceId}`);
}