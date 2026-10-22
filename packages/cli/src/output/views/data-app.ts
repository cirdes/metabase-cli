import { DataAppCompact } from "@metabase/client/domain/data-app";

import type { ResourceView } from "../view";

export const dataAppView: ResourceView<DataAppCompact> = {
  compactPick: DataAppCompact,
  tableColumns: [
    { key: "name", label: "Slug" },
    { key: "display_name", label: "Name" },
    { key: "enabled", label: "Enabled" },
    { key: "resource_collection_id", label: "Collection" },
    { key: "outdated", label: "Outdated" },
  ],
};
