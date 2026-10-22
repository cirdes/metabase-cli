import { z } from "zod";

import { ApiKey, type ApiKeyCreateInput, CreatedApiKey } from "../domain/api-key";
import type { RequestOptions, Transport } from "../http/transport";
import type { ListResult } from "../list";

// Every path parameter here is a numeric id, so no fragment needs `encodeURIComponent`.
export function apiKeyResource(transport: Transport) {
  /** List the API keys, each with its masked key and the group it acts as. `GET /api/api-key` answers a bare array. */
  async function list(options: RequestOptions = {}): Promise<ListResult<ApiKey>> {
    const data = await transport.requestParsed(z.array(ApiKey), "/api/api-key", { ...options });
    return { data, total: null };
  }

  /** Create an API key acting as a member of the group; the answer carries the key itself, which no later read returns. */
  async function create(
    params: ApiKeyCreateInput,
    options: RequestOptions = {},
  ): Promise<CreatedApiKey> {
    return transport.requestParsed(CreatedApiKey, "/api/api-key", {
      ...options,
      method: "POST",
      body: params,
    });
  }

  /** Delete an API key by id; requests made with it fail from then on. */
  async function remove(id: number, options: RequestOptions = {}): Promise<void> {
    await transport.requestRaw(`/api/api-key/${id}`, {
      ...options,
      method: "DELETE",
      expectContentType: "binary",
    });
  }

  return {
    list,
    create,
    delete: remove,
  };
}
