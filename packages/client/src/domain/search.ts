import { z } from "zod";

import { ModerationStatus } from "./moderation-review";

export const SEARCH_MODELS = [
  "card",
  "dataset",
  "metric",
  "dashboard",
  "collection",
  "database",
  "table",
  "segment",
  "measure",
  "document",
  "exploration",
  "action",
  "transform",
  "indexed-entity",
] as const;

export const SearchModel = z.enum(SEARCH_MODELS);
export type SearchModel = z.infer<typeof SearchModel>;

const SearchResultCollection = z
  .object({
    id: z.union([z.number().int(), z.string(), z.null()]),
    name: z.string().nullable(),
    authority_level: z.string().nullable(),
    type: z.string().nullable(),
  })
  .loose();

// The dashboard a dashboard question is saved in.
const SearchResultDashboard = z
  .object({
    id: z.number().int(),
    name: z.string(),
  })
  .loose();

// Some keys hold a value only when the hit's model has one: `database_name` on a table,
// `table_schema` and `table_name` on a table and on a segment or measure (naming its table),
// `dashboard` on a question saved in a dashboard, and `database_id` on the hits that read a
// database. A table hit carries no `moderated_status`.
export const SearchResult = z
  .object({
    id: z.union([z.number().int(), z.string()]),
    name: z.string(),
    model: SearchModel,
    // A model whose search spec carries no description (documents, indexed entities) leaves the key out.
    description: z.string().nullable().optional(),
    archived: z.boolean().nullable(),
    collection: SearchResultCollection.nullable(),
    result_metadata: z.array(z.unknown()).nullable().optional(),
    database_id: z.number().int().nullable().optional(),
    database_name: z.string().nullable().optional(),
    table_schema: z.string().nullable().optional(),
    table_name: z.string().nullable().optional(),
    moderated_status: ModerationStatus.nullable().optional(),
    dashboard: SearchResultDashboard.nullable().optional(),
  })
  .loose();
export type SearchResult = z.infer<typeof SearchResult>;

// A table's qualified name and a dashboard question's dashboard tell apart hits that share a name.
// A hit without them carries them as `null` (the legacy engine pads every row to the union of every
// model's columns) or leaves them out (the app-database engine), as its server answers.
export const SearchResultCompact = SearchResult.pick({
  id: true,
  name: true,
  model: true,
  description: true,
  database_name: true,
  table_schema: true,
  table_name: true,
})
  .strip()
  .extend({
    dashboard: SearchResultDashboard.pick({ id: true, name: true }).strip().nullable().optional(),
  });
export type SearchResultCompact = z.infer<typeof SearchResultCompact>;
