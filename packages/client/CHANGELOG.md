# Changelog

Notable changes to `@metabase/client`.

## Unreleased

- `DashboardCreateInput` holds only the fields `POST /api/dashboard` reads, and is strict. A layout passed to `dashboard.create` no longer compiles, since the server dropped it unread; send it as a `DashboardLayoutInput` through `dashboard.update`.
- `DashboardLayoutInput` and `DatabaseUpdateInput` are on the barrel.
- `@metabase/client/version/input-gates` exports the input gates recorded on feature-gated body fields, with `gateTriggered` and `inputGatesOf`, and `featureAvailability` says which servers hold a feature.
- `dataAction.update` refuses a `collection_id` before the request on a server without `dataActionCollections`, which would drop it unread.

## 0.1.0

The first published release: the whole surface.
