import { z } from "zod";

const ApiKeyGroup = z.object({ id: z.number().int(), name: z.string() }).loose();

export const ApiKey = z
  .object({
    id: z.number().int(),
    name: z.string(),
    masked_key: z.string(),
    group: ApiKeyGroup,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .loose();
export type ApiKey = z.infer<typeof ApiKey>;

export const ApiKeyCompact = ApiKey.pick({ id: true, name: true, masked_key: true }).strip();
export type ApiKeyCompact = z.infer<typeof ApiKeyCompact>;

// The key itself is answered once, when it is created.
export const CreatedApiKey = ApiKey.extend({ unmasked_key: z.string() });
export type CreatedApiKey = z.infer<typeof CreatedApiKey>;

// The key itself is the point of creating one, so the compact answer keeps it.
export const CreatedApiKeyCompact = CreatedApiKey.pick({
  id: true,
  name: true,
  unmasked_key: true,
}).strip();
export type CreatedApiKeyCompact = z.infer<typeof CreatedApiKeyCompact>;

export const ApiKeyCreateInput = z
  .object({ name: z.string().min(1), group_id: z.number().int().positive() })
  .strict();
export type ApiKeyCreateInput = z.infer<typeof ApiKeyCreateInput>;
