import {
  type ApiKey,
  ApiKeyCompact,
  type CreatedApiKey,
  CreatedApiKeyCompact,
} from "@metabase/client/domain/api-key";

import type { ResourceView } from "../view";

export const apiKeyView: ResourceView<ApiKey> = {
  compactPick: ApiKeyCompact,
  tableColumns: [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "masked_key", label: "Key" },
  ],
};

export const createdApiKeyView: ResourceView<CreatedApiKey> = {
  compactPick: CreatedApiKeyCompact,
  tableColumns: [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "unmasked_key", label: "Key" },
  ],
};
