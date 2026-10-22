import { z } from "zod";

const DATA_APP_SLUG_MAX_LENGTH = 100;

// Metabase routes these under `/api/ee/apps/`, so an app with one would be unreachable.
const RESERVED_DATA_APP_SLUGS: ReadonlySet<string> = new Set(["repo-status", "sandbox-host"]);

export const DataAppSlug = z
  .string()
  .max(DATA_APP_SLUG_MAX_LENGTH, `must be at most ${DATA_APP_SLUG_MAX_LENGTH} characters`)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be dash-cased: a-z, 0-9 and single dashes")
  .refine((slug) => !RESERVED_DATA_APP_SLUGS.has(slug), "is reserved by Metabase");

export const DataApp = z
  .object({
    id: z.number().int(),
    name: z.string(),
    display_name: z.string(),
    description: z.string().nullable(),
    version: z.number().int(),
    outdated: z.boolean(),
    bundle_path: z.string(),
    enabled: z.boolean(),
    allowed_hosts: z.array(z.string()),
    resource_collection_id: z.number().int(),
    bundle_hash: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .loose();
export type DataApp = z.infer<typeof DataApp>;

// What a non-admin reads: only the fields that navigate to the app. Strict, so an admin answer
// `DataApp` rejects fails here too instead of passing as a summary.
export const DataAppSummary = z.object({ name: z.string(), display_name: z.string() }).strict();
export type DataAppSummary = z.infer<typeof DataAppSummary>;

export const DataAppEntry = z.union([DataApp, DataAppSummary]);
export type DataAppEntry = z.infer<typeof DataAppEntry>;

// A summary carries only `name` and `display_name`, so the admin-only fields are optional here.
export const DataAppCompact = DataApp.pick({
  name: true,
  display_name: true,
  enabled: true,
  resource_collection_id: true,
  outdated: true,
})
  .strip()
  .partial({ enabled: true, resource_collection_id: true, outdated: true });
export type DataAppCompact = z.infer<typeof DataAppCompact>;

export const DataAppListFilter = z.object({ available: z.boolean().optional() }).strict();
export type DataAppListFilter = z.infer<typeof DataAppListFilter>;

const DataAppFields = {
  display_name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  version: z.number().int().positive().optional(),
  bundle_path: z.string().min(1).optional(),
  allowed_hosts: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
};

export const DataAppCreateInput = z.object({ name: DataAppSlug, ...DataAppFields }).strict();
export type DataAppCreateInput = z.infer<typeof DataAppCreateInput>;

export const DataAppUpdateInput = z.object(DataAppFields).strict();
export type DataAppUpdateInput = z.infer<typeof DataAppUpdateInput>;
