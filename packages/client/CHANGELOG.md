# Changelog

Notable changes to `@metabase/client`.

## 0.1.1

- `DashboardCreateInput` holds only the fields `POST /api/dashboard` reads, and is strict, and `dashboard.create` parses its body against it. A layout or any other key passed to `dashboard.create` is refused before the request rather than dropped unread by the server; send a layout as a `DashboardLayoutInput` through `dashboard.update`. A blank `name` is refused too, as the server does.
- `DashboardLayoutInput` and `DatabaseUpdateInput` are on the barrel.
- `@metabase/client/json-pointer` exports `unescapeJsonPointerSegment`, the inverse of `escapeJsonPointerSegment`.
- `@metabase/client/version/input-gates` exports the input gates recorded on feature-gated body fields, with `gateTriggered` and `inputGatesOf`, and `featureAvailability` says which servers hold a feature.
- `dataAction.update` refuses a `collection_id` before the request on a server without `dataActionCollections`, which would drop it unread.
- `dashboard.get` and `dashboard.update` read a dashboard holding a text, heading or other dashcard bound to no card. The server answers a stub `card` such as `{ query_average_duration: null, download_perms: "none" }` for such a dashcard, which 0.1.0 refused; it reads as `null`, and `dashboardDetailSchema` on the dashboard subpath is the reader.

## 0.1.0

The first published release: the whole surface.
