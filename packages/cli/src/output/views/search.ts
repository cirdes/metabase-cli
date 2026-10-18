import { type SearchResult, SearchResultCompact } from "@metabase/client/domain/search";

import type { ResourceView } from "../view";

// A table hit lives in its database's schema, a segment or measure on its table, and a question
// saved in a dashboard in that dashboard.
function searchLocation(row: SearchResult): string | null {
  const tableName = row.table_name;
  if (tableName !== undefined && tableName !== null) {
    const qualified = row.table_schema ? `${row.table_schema}.${tableName}` : tableName;
    return row.database_name ? `${row.database_name}: ${qualified}` : qualified;
  }
  const dashboard = row.dashboard;
  if (dashboard !== undefined && dashboard !== null) {
    return `dashboard ${dashboard.name}`;
  }
  return null;
}

export const searchResultView: ResourceView<SearchResult> = {
  compactPick: SearchResultCompact,
  tableColumns: [
    { key: "id", label: "ID" },
    { key: "model", label: "Model" },
    { key: "name", label: "Name" },
    { key: "table_name", label: "Location", value: searchLocation },
  ],
};
