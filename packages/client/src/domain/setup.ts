import { z } from "zod";

const SetupUserInput = z
  .object({
    first_name: z.string().min(1).nullable().optional(),
    last_name: z.string().min(1).nullable().optional(),
    // The server checks the address with its own pattern, which admits some a stricter check refuses.
    email: z.string(),
    password: z
      .string()
      .min(1)
      .describe("must satisfy the server's password complexity requirements"),
  })
  .loose();

const SetupPrefsInput = z
  .object({
    site_name: z.string().min(1),
    site_locale: z.string().min(1).nullable().optional(),
  })
  .loose();

export const SetupInput = z
  .object({
    token: z.string().min(1),
    user: SetupUserInput,
    prefs: SetupPrefsInput,
  })
  .loose();
export type SetupInput = z.infer<typeof SetupInput>;

export const SetupResult = z
  .object({
    id: z.string(),
  })
  .loose();
export type SetupResult = z.infer<typeof SetupResult>;

export const SetupResultCompact = SetupResult.pick({
  id: true,
}).strip();
export type SetupResultCompact = z.infer<typeof SetupResultCompact>;
