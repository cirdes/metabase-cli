import { z } from "zod";

export const CurrentUser = z
  .object({
    id: z.number().int(),
    // Metabase's own check admits addresses a stricter one refuses, such as `a!b@host.1`.
    email: z.string(),
    common_name: z.string(),
    is_superuser: z.boolean(),
  })
  .loose();
export type CurrentUser = z.infer<typeof CurrentUser>;

export const CurrentUserCompact = CurrentUser.pick({
  id: true,
  email: true,
  common_name: true,
  is_superuser: true,
}).strip();
export type CurrentUserCompact = z.infer<typeof CurrentUserCompact>;
