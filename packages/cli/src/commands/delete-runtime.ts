import { z } from "zod";

import { ConfigError } from "@metabase/client/errors";
import type { ResourceView } from "../output/view";
import { promptConfirm } from "../output/prompt";
import { renderSummary } from "../output/render";

import type { CommonContext } from "./context";

const DeleteOutcome = z.object({ deleted: z.boolean(), aborted: z.boolean() });

export const DeleteResult = DeleteOutcome.extend({ id: z.number().int() });
type DeleteResult = z.infer<typeof DeleteResult>;

export const DeleteBySlugResult = DeleteOutcome.extend({ slug: z.string() });
type DeleteBySlugResult = z.infer<typeof DeleteBySlugResult>;

const outcomeColumns = [
  { key: "deleted", label: "Deleted" },
  { key: "aborted", label: "Aborted" },
] as const;

const deleteResultView: ResourceView<DeleteResult> = {
  compactPick: DeleteResult,
  tableColumns: [{ key: "id", label: "ID" }, ...outcomeColumns],
};

const deleteBySlugResultView: ResourceView<DeleteBySlugResult> = {
  compactPick: DeleteBySlugResult,
  tableColumns: [{ key: "slug", label: "Slug" }, ...outcomeColumns],
};

interface DeleteById {
  id: number;
}

interface DeleteBySlug {
  slug: string;
}

interface ConfirmAndDeleteOptions {
  yes: boolean;
  promptMessage: string;
  successMessage: string;
  abortMessage: string;
  deleteResource: () => Promise<void>;
  ctx: CommonContext;
}

type ConfirmAndDeleteArgs = ConfirmAndDeleteOptions & (DeleteById | DeleteBySlug);

interface ConfirmArgs {
  yes: boolean;
  /** What the refusal names, e.g. `delete 42`. */
  action: string;
  promptMessage: string;
}

// `true` to go ahead. Without `--yes` a terminal is asked; anything else is refused, because a
// script that forgot `--yes` must not destroy what it never saw a prompt for.
export async function confirmDestructive(args: ConfirmArgs): Promise<boolean> {
  if (args.yes) {
    return true;
  }
  if (process.stdin.isTTY !== true) {
    throw new ConfigError(
      `refusing to ${args.action} without confirmation — pass --yes to proceed non-interactively`,
    );
  }
  return promptConfirm({ message: args.promptMessage, initialValue: false });
}

function renderDeleteResult(
  args: ConfirmAndDeleteArgs,
  outcome: z.infer<typeof DeleteOutcome>,
  message: string,
): void {
  if ("slug" in args) {
    renderSummary({ ...outcome, slug: args.slug }, deleteBySlugResultView, message, args.ctx);
    return;
  }
  renderSummary({ ...outcome, id: args.id }, deleteResultView, message, args.ctx);
}

export async function confirmAndDelete(args: ConfirmAndDeleteArgs): Promise<void> {
  const target = "slug" in args ? args.slug : String(args.id);
  const confirmed = await confirmDestructive({
    yes: args.yes,
    action: `delete ${target}`,
    promptMessage: args.promptMessage,
  });
  if (!confirmed) {
    renderDeleteResult(args, { deleted: false, aborted: true }, args.abortMessage);
    return;
  }
  await args.deleteResource();
  renderDeleteResult(args, { deleted: true, aborted: false }, args.successMessage);
}
