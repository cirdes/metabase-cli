import { DataApp } from "@metabase/client/domain/data-app";
import { dataAppView } from "../../output/views/data-app";
import { renderSummary } from "../../output/render";
import { DEFAULT_BUNDLE_PATH, readBundle } from "../../runtime/data-app-project";
import { connectionFlags, outputFlags, profileFlag } from "../flags";
import { defineMetabaseCommand } from "../runtime";
import { parseSlug, slugArg } from "./slug";

export default defineMetabaseCommand({
  meta: { name: "set-bundle", description: "Replace a data app's bundle with a built one" },
  details:
    "Reads the built bundle (`npm run build` writes `dist/index.js`) and makes it the bundle Metabase serves at /apps/<slug>, at once. A new app is enabled; viewers reach it once a group is assigned. A disabled app opens only in Data Studio (Data apps → the app → Overview).",
  skills: [{ skill: "data-app", purpose: "build and publish an app" }],
  requires: ["dataApp.replaceBundle"],
  args: {
    ...outputFlags,
    ...profileFlag,
    ...connectionFlags,
    ...slugArg,
    bundle: {
      type: "string",
      description: "Built bundle file",
      default: DEFAULT_BUNDLE_PATH,
    },
  },
  outputSchema: DataApp,
  examples: [
    "mb data-app set-bundle sales-overview",
    "mb data-app set-bundle sales-overview --bundle build/index.js",
  ],
  async run({ args, ctx, getClient }) {
    const slug = parseSlug(args.slug);
    const bundle = await readBundle(args.bundle);
    const client = await getClient();
    const app = await client.dataApp.replaceBundle(slug, bundle);
    const state = app.enabled
      ? `served at /apps/${slug}`
      : "disabled, so it opens only in Data Studio";
    renderSummary(app, dataAppView, `Set the bundle of data app ${slug}; it is ${state}.`, ctx);
  },
});
