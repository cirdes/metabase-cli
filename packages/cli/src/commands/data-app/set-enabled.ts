import { z } from "zod";

import { DataApp } from "@metabase/client/domain/data-app";
import { dataAppView } from "../../output/views/data-app";
import { renderSummary } from "../../output/render";
import { connectionFlags, outputFlags, profileFlag } from "../flags";
import { parseEnumFlag } from "../parse-enum";
import { defineMetabaseCommand } from "../runtime";
import { parseSlug, slugArg } from "./slug";

const EnabledWord = z.enum(["true", "false"]);

export default defineMetabaseCommand({
  meta: { name: "set-enabled", description: "Enable or disable a data app" },
  details:
    "A new app is disabled. A disabled app is served only to admins; once enabled, it is served to the groups assigned to it.",
  skills: [{ skill: "data-app", purpose: "publish an app" }],
  requires: ["dataApp.update"],
  args: {
    ...outputFlags,
    ...profileFlag,
    ...connectionFlags,
    ...slugArg,
    enabled: {
      type: "positional",
      description: "true to enable the app, false to disable it",
      required: true,
    },
  },
  outputSchema: DataApp,
  examples: [
    "mb data-app set-enabled sales-overview true",
    "mb data-app set-enabled sales-overview false",
  ],
  async run({ args, ctx, getClient }) {
    const slug = parseSlug(args.slug);
    const enabled = parseEnumFlag(args.enabled, EnabledWord, "enabled") === "true";
    const client = await getClient();
    const app = await client.dataApp.update(slug, { enabled });
    renderSummary(app, dataAppView, `${enabled ? "Enabled" : "Disabled"} data app ${slug}.`, ctx);
  },
});
