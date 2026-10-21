import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { runCommand } from "citty";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { parseJson } from "@metabase/client/json";
import { createServerProfile, type ServerProfile } from "@metabase/client/version/profile";

import { profilesFilePath } from "../core/auth/storage";
import { probeAt, setupTempConfigHome, type TempConfigHome } from "../core/auth/temp-config-home";
import { getQuerySchemaBundle } from "../core/schema/validate";
import main from "../main";
import { getMetabaseAugment } from "../runtime/command-augment";
import { resolveCitty } from "../runtime/citty";
import { buildHelpIndex, resolveCommandPath } from "../runtime/command-help";
import { jsonLine } from "../output/render";
import schemaCommand, { schemaJson } from "./schema";

interface SchemaRun {
  stdout: string;
  stderr: string;
  exitCode: number | string | null | undefined;
}

async function runSchema(rawArgs: readonly string[]): Promise<SchemaRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  process.stdout.isTTY = false;
  process.exitCode = undefined;
  try {
    await runCommand(schemaCommand, { rawArgs: [...rawArgs] });
    return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
  } finally {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  }
}

const NamedDefs = z.object({ $defs: z.record(z.string(), z.unknown()) });

const DescribedProperties = z.object({
  properties: z.object({ dataset_query: z.object({ description: z.string() }) }),
});

const RequiredKeys = z.object({ required: z.array(z.string()) });

const GatedProperty = z.object({
  properties: z.object({ data_sensitivity: z.object({ description: z.string() }) }),
});

describe("schema command", () => {
  let home: TempConfigHome;

  beforeEach(() => {
    home = setupTempConfigHome();
  });

  afterEach(() => {
    home.cleanup();
  });

  it("names the client's shared schemas as $defs", async () => {
    const run = await runSchema(["card", "create"]);

    expect(Object.keys(parseJson(run.stdout, NamedDefs).$defs)).toEqual([
      "__schema0",
      "Parameter",
      "ParameterTarget",
      "__schema1",
      "__schema2",
      "ParameterMapping",
    ]);
  });

  it("keeps the client's description beside an embedded query's pointer", async () => {
    const run = await runSchema(["card", "create"]);

    expect(parseJson(run.stdout, DescribedProperties).properties.dataset_query.description).toBe(
      'MBQL 5, legacy MBQL, or native query; refined: dataset_query must include "lib/type" (MBQL 5) or "type" (legacy MBQL/native); empty `{}` is rejected; MBQL 5 query checked against `mb schema query`',
    );
  });

  it("notes a gated field's feature without judging it when no server was probed", async () => {
    const run = await runSchema(["field", "update"]);

    expect(parseJson(run.stdout, GatedProperty).properties.data_sensitivity.description).toBe(
      "needs fieldDataSensitivity (v64+)",
    );
  });

  it("prints an output's schema without reading the profile cache", async () => {
    mkdirSync(dirname(profilesFilePath()), { recursive: true });
    writeFileSync(profilesFilePath(), "{not json");

    const run = await runSchema(["transform-tag", "create", "--output"]);

    expect(run).toEqual({
      stdout: jsonLine(await schemaJson(["transform-tag", "create"], "output", { server: null })),
      stderr: "",
      exitCode: undefined,
    });
  });

  it("converts the body as input, so a defaulted field is not required", async () => {
    const run = await runSchema(["alert", "create"]);

    expect(parseJson(run.stdout, RequiredKeys).required).toEqual([
      "payload",
      "subscriptions",
      "handlers",
    ]);
  });

  it("prints the MBQL 5 schema bundle as it is for query", async () => {
    const run = await runSchema(["query"]);

    expect(parseJson(run.stdout, z.unknown())).toEqual(getQuerySchemaBundle());
  });

  it("resolves a group by its alias", async () => {
    const byAlias = await runSchema(["database", "list", "--output"]);
    const byName = await runSchema(["db", "list", "--output"]);

    expect(byName.exitCode).toBe(undefined);
    expect(byName.stderr).toBe("");
    expect(byAlias).toEqual(byName);
  });

  it("refuses a group, naming its commands", async () => {
    const run = await runSchema(["card"]);

    expect(run.exitCode).toBe(2);
    expect(errorEnvelopeOf(run)).toEqual(
      configErrorEnvelope(
        "card is a command group; name one of its commands: list, get, query, alerts, create, update, verify, archive",
      ),
    );
  });

  it("refuses a command path that names no command", async () => {
    const run = await runSchema(["card", "creat"]);

    expect(run.exitCode).toBe(2);
    expect(errorEnvelopeOf(run)).toEqual(configErrorEnvelope("unknown command: card creat"));
  });

  it("refuses the input of a command that takes no body, pointing at --output", async () => {
    const run = await runSchema(["card", "get"]);

    expect(run.exitCode).toBe(2);
    expect(errorEnvelopeOf(run)).toEqual(
      configErrorEnvelope(
        "card get takes no JSON body, so it has no input schema; pass --output for the schema of what it prints",
      ),
    );
  });
});

const SENSITIVITY_NOTE = "needs fieldDataSensitivity (v64+)";

const DescribedMembers = z.object({
  properties: z.record(z.string(), z.object({ description: z.string().optional() }).loose()),
});

function serverAt(
  major: number,
  tokenFeatures: Record<string, boolean> | null = null,
): ServerProfile {
  return createServerProfile(probeAt(major, tokenFeatures));
}

async function inputNote(
  segments: readonly string[],
  server: ServerProfile | null,
  member: string,
): Promise<string | undefined> {
  const schema = DescribedMembers.parse(await schemaJson(segments, "input", { server }));
  return schema.properties[member]?.description;
}

describe("gate notes", () => {
  it("keeps the plain note on a field the cached server takes", async () => {
    expect(await inputNote(["field", "update"], null, "data_sensitivity")).toBe(SENSITIVITY_NOTE);
    expect(await inputNote(["field", "update"], serverAt(64), "data_sensitivity")).toBe(
      SENSITIVITY_NOTE,
    );
  });

  it("says the cached server rejects a field it lacks the feature for", async () => {
    expect(await inputNote(["field", "update"], serverAt(63), "data_sensitivity")).toBe(
      `${SENSITIVITY_NOTE}; this server rejects it`,
    );
  });

  it("says the cached server reads a superseded value differently", async () => {
    expect(await inputNote(["table", "update"], serverAt(59), "data_layer")).toBe(
      'needs tableDataLayerTiers (v59+) for "final", "internal", "hidden"; read differently under tableDataLayerTiers (v59+) for "gold", "silver", "bronze", "copper"; this server reads it differently',
    );
  });

  it("says the cached server ignores a field it drops", async () => {
    expect(await inputNote(["measure", "create"], serverAt(64), "table_id")).toBe(
      "dropped by tableFromDefinition (v64+); this server ignores it",
    );
  });

  it("says the cached server rejects a field its token does not grant", async () => {
    expect(await inputNote(["subscription", "create"], serverAt(64), "parameters")).toBe(
      "needs dashboardSubscriptionFilters (token dashboard_subscription_filters) when non-empty; this server rejects it",
    );
  });

  it("keeps the plain note where the cached server's token grants the feature", async () => {
    const granted = serverAt(64, { dashboard_subscription_filters: true });

    expect(await inputNote(["subscription", "create"], granted, "parameters")).toBe(
      "needs dashboardSubscriptionFilters (token dashboard_subscription_filters) when non-empty",
    );
  });
});

function errorEnvelopeOf(run: SchemaRun): unknown {
  return parseJson(run.stderr, z.unknown(), { source: "stderr" });
}

function configErrorEnvelope(message: string): unknown {
  return { ok: false, error: { category: "config", message, exitCode: 2 } };
}

const LEAVES = (await buildHelpIndex(main, [])).commands.map((entry) => entry.command);

describe("checked documents", () => {
  it("names the documents a body is checked against on exactly the commands taking --skip-validate", async () => {
    const checking: string[] = [];
    const skippable: string[] = [];
    for (const command of LEAVES) {
      const leaf = await resolveCommandPath(main, command.split(" "));
      const input = getMetabaseAugment(leaf)?.input ?? null;
      if (input !== null && (input.kind === "documents" || input.embedded.length > 0)) {
        checking.push(command);
      }
      const args = await resolveCitty(leaf.args);
      if (args !== undefined && "skip-validate" in args) {
        skippable.push(command);
      }
    }

    expect(checking).toEqual(skippable);
  });
});
