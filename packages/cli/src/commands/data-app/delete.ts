import { confirmAndDelete, DeleteBySlugResult } from "../delete-runtime";
import { connectionFlags, outputFlags, profileFlag } from "../flags";
import { defineMetabaseCommand } from "../runtime";
import { parseSlug, slugArg } from "./slug";

export default defineMetabaseCommand({
  meta: {
    name: "delete",
    description: "Delete a data app with its bundle, its collection and what the collection holds",
  },
  requires: ["dataApp.delete"],
  args: {
    ...outputFlags,
    ...profileFlag,
    ...connectionFlags,
    yes: { type: "boolean", description: "Skip confirmation", default: false },
    ...slugArg,
  },
  outputSchema: DeleteBySlugResult,
  examples: ["mb data-app delete sales-overview --yes", "mb data-app delete sales-overview"],
  async run({ args, ctx, getClient }) {
    const slug = parseSlug(args.slug);
    const client = await getClient();
    await confirmAndDelete({
      slug,
      yes: args.yes,
      promptMessage: `Delete data app ${slug}, its collection and the questions and actions in it?`,
      successMessage: `Deleted data app ${slug}.`,
      abortMessage: `Aborted; data app ${slug} was not deleted.`,
      deleteResource: () => client.dataApp.delete(slug),
      ctx,
    });
  },
});
