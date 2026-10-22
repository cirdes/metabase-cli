import { DataAppSlug } from "@metabase/client/domain/data-app";
import { ConfigError } from "@metabase/client/errors";

export const slugArg = {
  slug: { type: "positional", description: "Data app slug (its /apps/<slug> URL)", required: true },
} as const;

export function parseSlug(raw: string): string {
  const result = DataAppSlug.safeParse(raw);
  if (!result.success) {
    const reasons = result.error.issues.map((issue) => issue.message).join("; ");
    throw new ConfigError(`slug "${raw}" ${reasons}`);
  }
  return result.data;
}
