import { z } from "zod";

import { Card } from "./card";
import { EmbeddingParams } from "./embedding";
import { Parameter, ParameterMapping } from "./parameter";
import { NonBlankText } from "./text";

const DashboardWidth = z.enum(["fixed", "full"]);

// The server-side presets `GET /api/dashboard`'s `f` parameter accepts.
export const DashboardListFilter = z.enum(["all", "mine", "archived"]);
export type DashboardListFilter = z.infer<typeof DashboardListFilter>;

export const Dashcard = z
  .object({
    id: z.number().int(),
    dashboard_id: z.number().int(),
    card_id: z.number().int().nullable(),
    dashboard_tab_id: z.number().int().nullable(),
    row: z.number().int(),
    col: z.number().int(),
    size_x: z.number().int(),
    size_y: z.number().int(),
    entity_id: z.string().nullable(),
    visualization_settings: z.unknown(),
    parameter_mappings: z.array(ParameterMapping).nullable(),
    inline_parameters: z.array(z.string()).nullable(),
  })
  .loose();
export type Dashcard = z.infer<typeof Dashcard>;

export const DashcardCompact = Dashcard.pick({
  id: true,
  dashboard_id: true,
  card_id: true,
  dashboard_tab_id: true,
  row: true,
  col: true,
  size_x: true,
  size_y: true,
  parameter_mappings: true,
}).strip();
export type DashcardCompact = z.infer<typeof DashcardCompact>;

/**
 * What a dashcard that is not a chart of a card shows. `display` names it: `text`, `heading`,
 * `link`, `iframe`, `placeholder`, or `action` for an action button. The server stores the
 * settings without checking them, so `display` is an open string another client may leave out.
 */
export const DashcardVirtualCard = z
  .object({
    display: z.string().optional(),
  })
  .loose();
export type DashcardVirtualCard = z.infer<typeof DashcardVirtualCard>;

/**
 * A dashcard's visualization settings. Every key is free-form except the two that say what a
 * dashcard is when it is not a chart: `virtual_card`, and `text`, the Markdown a text or heading
 * dashcard shows.
 */
export const DashcardVisualizationSettings = z
  .object({
    virtual_card: DashcardVirtualCard.nullable().optional(),
    text: z.string().nullable().optional(),
  })
  .loose();
export type DashcardVisualizationSettings = z.infer<typeof DashcardVisualizationSettings>;

/**
 * A card the caller cannot read. The server cuts it down to its `id` before answering, so a
 * dashboard the caller can read still lists it; a readable card always carries its `name`, which is
 * what tells the two apart.
 */
export const UnreadableCard = z
  .object({ id: z.number().int(), name: z.never().optional() })
  .loose();
export type UnreadableCard = z.infer<typeof UnreadableCard>;

/**
 * A dashcard as a dashboard read or write returns it, with its card whole in `card`. An action
 * button bound to a model carries the model there and the action in `action_id`. A dashcard bound to
 * no card (a text, heading, link, iframe or placeholder dashcard, or an action button bound to no
 * model, which `visualization_settings.virtual_card` names) has `card_id` `null`, and its `card` reads as `null`.
 */
export const DashcardDetail = Dashcard.extend({
  action_id: z.number().int().nullable(),
  visualization_settings: DashcardVisualizationSettings,
  card: z.union([Card, UnreadableCard]).nullable(),
});
export type DashcardDetail = z.infer<typeof DashcardDetail>;

export const DashboardTab = z
  .object({
    id: z.number().int(),
    dashboard_id: z.number().int(),
    name: z.string(),
    position: z.number().int().optional(),
    entity_id: z.string().nullable().optional(),
  })
  .loose();
export type DashboardTab = z.infer<typeof DashboardTab>;

export const DashboardTabCompact = DashboardTab.pick({
  id: true,
  dashboard_id: true,
  name: true,
  position: true,
}).strip();
export type DashboardTabCompact = z.infer<typeof DashboardTabCompact>;

export const Dashboard = z
  .object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    archived: z.boolean(),
    collection_id: z.number().int().nullable(),
    creator_id: z.number().int(),
    entity_id: z.string().nullable(),
    width: DashboardWidth,
    auto_apply_filters: z.boolean(),
    enable_embedding: z.boolean(),
    public_uuid: z.string().nullable(),
    cache_ttl: z.number().int().nullable(),
    collection_position: z.number().int().nullable(),
    parameters: z.array(Parameter).nullable(),
    dashcards: z.array(Dashcard).optional(),
    tabs: z.array(DashboardTab).optional(),
  })
  .loose();
export type Dashboard = z.infer<typeof Dashboard>;

export const DashboardDetail = Dashboard.extend({
  parameters: z.array(Parameter),
  dashcards: z.array(DashcardDetail),
  tabs: z.array(DashboardTab),
});
export type DashboardDetail = z.infer<typeof DashboardDetail>;

// The server hydrates a query duration and download permissions onto a dashcard's card even when it
// has none, so a dashcard bound to no card answers a stub such as
// `{ query_average_duration: null, download_perms: "none" }` rather than `null`.
const NoCardStub = z
  .object({ id: z.never().optional(), name: z.never().optional() })
  .loose()
  .transform(() => null);

const DashcardDetailWire = DashcardDetail.extend({
  card: z.union([Card, UnreadableCard, NoCardStub]).nullable(),
});

/**
 * The dashboard `GET` and `PUT /api/dashboard/{id}` answer, read as `DashboardDetail`: the stub card
 * of a dashcard bound to no card reads as `null`.
 */
export const dashboardDetailSchema: z.ZodType<DashboardDetail> = DashboardDetail.extend({
  dashcards: z.array(DashcardDetailWire),
});

export const DashboardCompact = Dashboard.pick({
  id: true,
  name: true,
  description: true,
  archived: true,
  collection_id: true,
})
  .strip()
  .extend({
    dashcards: z.array(DashcardCompact).optional(),
    tabs: z.array(DashboardTabCompact).optional(),
  });
export type DashboardCompact = z.infer<typeof DashboardCompact>;

const DashcardWrite = z
  .object({
    id: z.number().int().describe("existing dashcard id; negative to create a new dashcard"),
    card_id: z
      .number()
      .int()
      .positive()
      .nullable()
      .describe(
        "card the dashcard renders; null for a virtual (text, heading, link) or action dashcard",
      ),
    size_x: z.number().int().positive(),
    size_y: z.number().int().positive(),
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
    parameter_mappings: z.array(ParameterMapping).nullable().optional(),
    inline_parameters: z.array(z.string().min(1)).nullable().optional(),
    series: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  })
  .loose();

const DashboardTabWrite = z
  .object({
    id: z.number().int().describe("existing tab id; negative to create a new tab"),
    name: z.string().min(1),
  })
  .loose();

// The six keys every supported server reads. Any other key is dropped before the request, as the
// server drops it, so a body read back from a dashboard still creates one; a layout goes through an
// update instead.
export const DashboardCreateInput = z
  .object({
    name: NonBlankText,
    description: z.string().nullable().optional(),
    parameters: z.array(Parameter).nullable().optional(),
    cache_ttl: z.number().int().positive().nullable().optional(),
    collection_id: z.number().int().positive().nullable().optional(),
    collection_position: z.number().int().positive().nullable().optional(),
  })
  .strip();
export type DashboardCreateInput = z.infer<typeof DashboardCreateInput>;

export const DashboardLayoutInput = z
  .object({
    dashcards: z.array(DashcardWrite).optional(),
    tabs: z.array(DashboardTabWrite).optional(),
  })
  .loose();
export type DashboardLayoutInput = z.infer<typeof DashboardLayoutInput>;

export const DashboardUpdateInput = z
  .object({
    name: z.string().min(1).nullable().optional(),
    description: z.string().nullable().optional(),
    caveats: z.string().nullable().optional(),
    points_of_interest: z.string().nullable().optional(),
    show_in_getting_started: z.boolean().nullable().optional(),
    archived: z.boolean().nullable().optional(),
    position: z.number().int().positive().nullable().optional(),
    width: DashboardWidth.optional(),
    enable_embedding: z.boolean().nullable().optional(),
    embedding_type: z.string().nullable().optional(),
    embedding_params: EmbeddingParams.nullable().optional(),
    parameters: z.array(Parameter).nullable().optional(),
    cache_ttl: z.number().int().positive().nullable().optional(),
    collection_id: z.number().int().positive().nullable().optional(),
    collection_position: z.number().int().positive().nullable().optional(),
    dashcards: z.array(DashcardWrite).nullable().optional(),
    tabs: z.array(DashboardTabWrite).nullable().optional(),
  })
  .loose();
export type DashboardUpdateInput = z.infer<typeof DashboardUpdateInput>;

export const DashcardPatchInput = z
  .object({
    row: z.number().int().nonnegative().optional(),
    col: z.number().int().nonnegative().optional(),
    size_x: z.number().int().positive().optional(),
    size_y: z.number().int().positive().optional(),
    dashboard_tab_id: z.number().int().nullable().optional(),
    parameter_mappings: z.array(ParameterMapping).nullable().optional(),
    inline_parameters: z.array(z.string().min(1)).nullable().optional(),
    visualization_settings: z.unknown().optional(),
    series: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "patch must contain at least one field",
  });
export type DashcardPatchInput = z.infer<typeof DashcardPatchInput>;

// The newest server closes the body map, so the input names exactly the keys it takes.
export const DashboardCopyInput = z
  .object({
    name: z.string().min(1).nullable().optional(),
    description: z.string().nullable().optional(),
    collection_id: z.number().int().positive().nullable().optional(),
    collection_position: z.number().int().positive().nullable().optional(),
    is_deep_copy: z.boolean().nullable().optional(),
  })
  .strict();
export type DashboardCopyInput = z.infer<typeof DashboardCopyInput>;

// A card the copy left out: one the caller cannot read arrives cut down to its id, any other
// arrives whole, which the loose object carries through.
export const DashboardUncopiedCard = z.object({ id: z.number().int() }).loose();
export type DashboardUncopiedCard = z.infer<typeof DashboardUncopiedCard>;

// `uncopied` is present only when the copy left a card behind.
export const DashboardCopy = Dashboard.extend({
  uncopied: z.array(DashboardUncopiedCard).optional(),
});
export type DashboardCopy = z.infer<typeof DashboardCopy>;

export const DashboardCopyCompact = DashboardCompact.extend({
  uncopied: z.array(DashboardUncopiedCard.pick({ id: true }).strip()).optional(),
});
export type DashboardCopyCompact = z.infer<typeof DashboardCopyCompact>;

const ParameterConstraintValue = z.union([z.string(), z.number(), z.boolean()]);

/**
 * Values of other parameters on a dashboard, by parameter id, that narrow the values a linked
 * parameter offers. An array sets several values for one parameter.
 */
export const DashboardParameterConstraints = z.record(
  z.string().min(1),
  z.union([ParameterConstraintValue, z.array(ParameterConstraintValue)]),
);
export type DashboardParameterConstraints = z.infer<typeof DashboardParameterConstraints>;
