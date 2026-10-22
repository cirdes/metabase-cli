import { describe, expect, it } from "vitest";

import { createClient } from "../client";
import type { ApiKeyCreateInput } from "../domain/api-key";
import type { ClientCredentials } from "../http/transport";
import { captureFetch, jsonResponse, TEST_USER_AGENT } from "../testing/fetch-capture";
import { createServerProfile } from "../version/profile";

const CREDENTIALS: ClientCredentials = {
  url: "https://mb.example.com/metabase",
  credential: { kind: "apiKey", apiKey: "mb_wire_test_key" },
};

const SERVER = createServerProfile({
  edition: "oss",
  version: { kind: "release", tag: "v0.65.0", major: 65, patch: 0 },
  date: null,
  hash: null,
  tokenFeatures: null,
});

const API_KEY = {
  id: 3,
  name: "ci",
  masked_key: "mb_AbCd****",
  group: { id: 2, name: "Administrators" },
  created_at: "2026-01-02T03:04:05.678Z",
  updated_at: "2026-01-02T03:04:05.678Z",
};

const CREATE_BODY: ApiKeyCreateInput = { name: "ci", group_id: 2 };

function clientOver(responses: Array<Response>) {
  const capture = captureFetch(responses);
  const mb = createClient(CREDENTIALS, {
    userAgent: TEST_USER_AGENT,
    fetchImpl: capture.fetch,
    server: SERVER,
  });
  return { mb, capture };
}

describe("api key resource wire requests", () => {
  it("sends the list request", async () => {
    const { mb, capture } = clientOver([jsonResponse([API_KEY])]);

    const result = await mb.apiKey.list();

    expect(result).toEqual({ data: [API_KEY], total: null });
    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/api-key",
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent": TEST_USER_AGENT,
          "x-api-key": "mb_wire_test_key",
        },
        body: null,
      },
    ]);
  });

  it("sends the create request and reads the unmasked key", async () => {
    const created = { ...API_KEY, unmasked_key: "mb_AbCdEfGh" };
    const { mb, capture } = clientOver([jsonResponse(created)]);

    const result = await mb.apiKey.create(CREATE_BODY);

    expect(result).toEqual(created);
    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/api-key",
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": TEST_USER_AGENT,
          "x-api-key": "mb_wire_test_key",
        },
        body: JSON.stringify(CREATE_BODY),
      },
    ]);
  });

  it("sends the delete request", async () => {
    const { mb, capture } = clientOver([new Response(null, { status: 204 })]);

    await mb.apiKey.delete(3);

    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/api-key/3",
        method: "DELETE",
        headers: { accept: "*/*", "user-agent": TEST_USER_AGENT, "x-api-key": "mb_wire_test_key" },
        body: null,
      },
    ]);
  });
});
