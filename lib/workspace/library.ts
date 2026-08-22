export const SOURCE_CATALOGS = [
  { id: "evidence", label: "Evidence" },
  { id: "research", label: "Research" },
  { id: "competitive", label: "Competitive" },
  { id: "internal", label: "Internal" },
  { id: "marketing", label: "Marketing" },
  { id: "other", label: "Other" },
] as const;

export type SourceCatalogId = (typeof SOURCE_CATALOGS)[number]["id"];

export const UNCATALOGED_ID = "__uncataloged__";

export type LibraryCatalog = {
  id: string;
  label: string;
  custom?: boolean;
};

export type CustomLibraryCatalog = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

const BUILTIN_CATALOG_IDS = new Set<string>(
  SOURCE_CATALOGS.map((catalog) => catalog.id),
);

export function mergeLibraryCatalogs(
  customCatalogs: CustomLibraryCatalog[],
): LibraryCatalog[] {
  const builtIn: LibraryCatalog[] = SOURCE_CATALOGS.map((catalog) => ({
    id: catalog.id,
    label: catalog.label,
  }));
  const custom: LibraryCatalog[] = customCatalogs.map((catalog) => ({
    id: catalog.slug,
    label: catalog.name,
    custom: true,
  }));
  return [...builtIn, ...custom];
}

export function isReservedCatalogSlug(slug: string): boolean {
  return BUILTIN_CATALOG_IDS.has(slug) || slug === UNCATALOGED_ID;
}

export function catalogLabel(
  catalog: string | null,
  catalogs: LibraryCatalog[] = mergeLibraryCatalogs([]),
): string {
  if (!catalog) return "Uncataloged";
  return catalogs.find((item) => item.id === catalog)?.label ?? catalog;
}

export function formatSourceCatalogs(
  catalogSlugs: string[],
  catalogs: LibraryCatalog[] = mergeLibraryCatalogs([]),
): string {
  if (catalogSlugs.length === 0) return "Uncataloged";
  return catalogSlugs
    .map((slug) => catalogLabel(slug, catalogs))
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

export function sourceInCatalog(
  source: { catalogs: string[] },
  catalogId: string,
): boolean {
  return source.catalogs.includes(catalogId);
}

export function isUncataloged(source: { catalogs: string[] }): boolean {
  return source.catalogs.length === 0;
}

export type SourceTag = {
  id: string;
  name: string;
  slug: string;
};

export type LibraryMissionRef = {
  id: string;
  title: string;
};

export type LibrarySourceRow = {
  id: string;
  title: string;
  source_type: string;
  url: string | null;
  original_filename: string | null;
  sensitivity: string;
  evidence_status: string;
  catalogs: string[];
  summary: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
  created_at: string;
  body?: string;
  tags: SourceTag[];
  missions: LibraryMissionRef[];
  creator_name: string | null;
};

export function catalogLabelFromBuiltIn(catalog: string | null): string {
  if (!catalog) return "Uncataloged";
  return SOURCE_CATALOGS.find((c) => c.id === catalog)?.label ?? catalog;
}

export function displayNameFromEmail(email?: string | null): string {
  if (!email) return "Unknown";
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function creatorDisplayName(
  email: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): string {
  const fullName = metadata?.full_name ?? metadata?.name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  return displayNameFromEmail(email);
}

export function sourceTypeDisplay(sourceType: string): "Doc" | "URL" | "Text" {
  if (sourceType === "url") return "URL";
  if (sourceType === "note") return "Text";
  return "Doc";
}

export function slugifyTag(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildSourceSummary(body: string, max = 200): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function buildSourceMetadata(body: string, extra: Record<string, unknown> = {}) {
  const text = body.trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return {
    word_count: words,
    char_count: text.length,
    ...extra,
  };
}

export function formatMetadataValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
