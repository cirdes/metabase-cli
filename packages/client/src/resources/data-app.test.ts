import { assert, describe, expect, it } from "vitest";

import { createClient } from "../client";
import type { DataAppCreateInput } from "../domain/data-app";
import { ResponseShapeError } from "../errors";
import type { ClientCredentials } from "../http/transport";
import {
  captureFetch,
  type FetchScript,
  jsonResponse,
  premiumRefusalResponse,
  probeResponse,
  TEST_USER_AGENT,
  thrownBy,
} from "../testing/fetch-capture";
import { CapabilityError } from "../version/capability-error";
import { PROBE_PATH } from "../version/probe";
import { createServerProfile, type ServerProfile } from "../version/profile";

const CREDENTIALS: ClientCredentials = {
  url: "https://mb.example.com/metabase",
  credential: { kind: "apiKey", apiKey: "mb_wire_test_key" },
};

const APP = {
  id: 4,
  name: "sales-overview",
  display_name: "Sales overview",
  description: null,
  version: 1,
  outdated: false,
  bundle_path: "dist/index.js",
  enabled: false,
  allowed_hosts: [],
  resource_collection_id: 12,
  bundle_hash: null,
  created_at: "2026-01-02T03:04:05.678Z",
  updated_at: "2026-01-02T03:04:05.678Z",
};

const SUMMARY = { name: "sales-overview", display_name: "Sales overview" };

const CREATE_BODY: DataAppCreateInput = {
  name: "sales-overview",
  display_name: "Sales overview",
  allowed_hosts: ["https://api.example.com"],
};

const TYPED_SCHEMA = "export const queries = {};\nexport const actions = {};\n";

const SERVER = createServerProfile({
  edition: "ee",
  version: { kind: "release", tag: "v1.65.0", major: 65, patch: 0 },
  date: null,
  hash: null,
  tokenFeatures: { "data-apps": true },
});

const UNLICENSED_SERVER = createServerProfile({
  edition: "ee",
  version: { kind: "release", tag: "v1.65.0", major: 65, patch: 0 },
  date: null,
  hash: null,
  tokenFeatures: { "data-apps": false },
});

const JSON_REQUEST_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "user-agent": TEST_USER_AGENT,
  "x-api-key": "mb_wire_test_key",
};

const JSON_READ_HEADERS = {
  accept: "application/json",
  "user-agent": TEST_USER_AGENT,
  "x-api-key": "mb_wire_test_key",
};

function clientOver(responses: FetchScript, server: ServerProfile = SERVER) {
  const capture = captureFetch(responses);
  const mb = createClient(CREDENTIALS, {
    userAgent: TEST_USER_AGENT,
    fetchImpl: capture.fetch,
    server,
  });
  return { mb, capture };
}

describe("data app resource wire requests", () => {
  it("sends the list request without a query string and reads admin and summary entries", async () => {
    const { mb, capture } = clientOver([jsonResponse([APP, SUMMARY])]);

    const result = await mb.dataApp.list();

    expect(result).toEqual({ data: [APP, SUMMARY], total: null });
    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/ee/apps",
        method: "GET",
        headers: JSON_READ_HEADERS,
        body: null,
      },
    ]);
  });

  it("sends the list request narrowed to available apps", async () => {
    const { mb, capture } = clientOver([jsonResponse([])]);

    await mb.dataApp.list({ available: true });

    expect(capture.calls.map((call) => call.url)).toEqual([
      "https://mb.example.com/metabase/api/ee/apps?available=true",
    ]);
  });

  it("refuses an admin answer that is neither a data app nor a summary", async () => {
    const { mb } = clientOver([jsonResponse({ ...APP, resource_collection_id: null })]);

    const error = await thrownBy(() => mb.dataApp.get("sales-overview"));

    assert(error instanceof ResponseShapeError, "expected ResponseShapeError");
    expect(error.userMessage).toBe(
      "On Metabase v1.65.0 (newer than this client supports, up to v64) the response shape was unexpected:\n  Invalid input",
    );
  });

  it("sends the get request with the slug encoded", async () => {
    const { mb, capture } = clientOver([jsonResponse(SUMMARY)]);

    const result = await mb.dataApp.get("sales/overview");

    expect(result).toEqual(SUMMARY);
    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/ee/apps/sales%2Foverview",
        method: "GET",
        headers: JSON_READ_HEADERS,
        body: null,
      },
    ]);
  });

  it("sends the create request with the full body", async () => {
    const { mb, capture } = clientOver([jsonResponse(APP)]);

    const result = await mb.dataApp.create(CREATE_BODY);

    expect(result).toEqual(APP);
    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/ee/apps",
        method: "POST",
        headers: JSON_REQUEST_HEADERS,
        body: JSON.stringify(CREATE_BODY),
      },
    ]);
  });

  it("sends the update request with only the patched fields", async () => {
    const { mb, capture } = clientOver([jsonResponse({ ...APP, enabled: true })]);

    await mb.dataApp.update("sales-overview", { enabled: true });

    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/ee/apps/sales-overview",
        method: "PUT",
        headers: JSON_REQUEST_HEADERS,
        body: JSON.stringify({ enabled: true }),
      },
    ]);
  });

  it("sends the bundle replacement to the bundle route", async () => {
    const { mb, capture } = clientOver([jsonResponse(APP)]);

    await mb.dataApp.replaceBundle("sales-overview", "export default 1;");

    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/ee/apps/sales-overview/bundle",
        method: "PUT",
        headers: JSON_REQUEST_HEADERS,
        body: JSON.stringify({ bundle: "export default 1;" }),
      },
    ]);
  });

  it("reads the typed schema as text", async () => {
    const { mb, capture } = clientOver([
      new Response(TYPED_SCHEMA, {
        status: 200,
        headers: { "content-type": "text/typescript; charset=utf-8" },
      }),
    ]);

    const result = await mb.dataApp.typedSchema("sales-overview");

    expect(result).toBe(TYPED_SCHEMA);
    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/ee/apps/sales-overview/typed-schema",
        method: "GET",
        headers: {
          accept: "text/*",
          "user-agent": TEST_USER_AGENT,
          "x-api-key": "mb_wire_test_key",
        },
        body: null,
      },
    ]);
  });

  it("sends the delete request", async () => {
    const { mb, capture } = clientOver([new Response(null, { status: 204 })]);

    await mb.dataApp.delete("sales-overview");

    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/ee/apps/sales-overview",
        method: "DELETE",
        headers: { accept: "*/*", "user-agent": TEST_USER_AGENT, "x-api-key": "mb_wire_test_key" },
        body: null,
      },
    ]);
  });

  it("explains a premium refusal as the missing data-apps token", async () => {
    const { mb, capture } = clientOver(
      [premiumRefusalResponse("Data apps"), probeResponse(UNLICENSED_SERVER)],
      UNLICENSED_SERVER,
    );

    const error = await thrownBy(() => mb.dataApp.list());

    assert(error instanceof CapabilityError, "expected CapabilityError");
    expect(error.developerDetail).toEqual({
      reason: "missing-token-feature",
      detail:
        "This operation requires the 'data-apps' premium feature (not enabled on this server).",
      feature: "dataApps",
      since: 65,
      tokenFeature: "data-apps",
      serverVersion: "v1.65.0",
    });
    expect(capture.calls.map((call) => call.url)).toEqual([
      "https://mb.example.com/metabase/api/ee/apps",
      `https://mb.example.com/metabase${PROBE_PATH}`,
    ]);
  });
});
