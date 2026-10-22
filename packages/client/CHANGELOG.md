# Changelog

Notable changes to `@metabase/client`.

## 0.1.1

- `DashboardCreateInput` holds only the fields `POST /api/dashboard` reads, so a layout passed to `dashboard.create` fails to compile; send it as a `DashboardLayoutInput` through `dashboard.update`. At run time `dashboard.create` drops any other key before the request, as the server does, and refuses a blank `name`, as the server does.
- `DashboardLayoutInput` and `DatabaseUpdateInput` are on the barrel.
- `@metabase/client/json-pointer` exports `unescapeJsonPointerSegment`, the inverse of `escapeJsonPointerSegment`.
- `@metabase/client/version/input-gates` exports the input gates recorded on feature-gated body fields, with `gateTriggered` and `inputGatesOf`, and `featureAvailability` says which servers hold a feature.
- `dataAction.update` refuses a `collection_id` before the request on a server without `dataActionCollections`, which would drop it unread.
- `dashboard.get` and `dashboard.update` read a dashboard holding a text, heading or other dashcard bound to no card. The server answers a stub `card` such as `{ query_average_duration: null, download_perms: "none" }` for such a dashcard, which 0.1.0 refused; it reads as `null`, and `dashboardDetailSchema` on the dashboard subpath is the reader.
- A transform's Python `source-tables` entry reads without `database_id` or `schema`, as the server stores an entry whose table or database is gone. `TransformSourceTableEntry` is the stored entry, and `TransformSourceTableEntryInput`, on the barrel, is the entry the create, update and Python test-run bodies take, as strict as before.
- Every transform read on Metabase 59 accepts a Python transform, whose `source-tables` that server keys by alias. `transformRowSchema` and `transformDetailSchema` read it as the list later servers answer, taking each alias from its key; an entry naming its table by id alone reads `database_id`, `schema` and `table` as `null`, and one whose table that server could not find reads `table_id` as `null` too. `transformSourceTablesAsList` is the feature.
- The dependency readers accept the action nodes Metabase 65 adds: `DependencyType` and `DependencyUsageType` take `"action"`, and `DependencyEntityData.type` takes an action's `"implicit"` or `"query"`. `dependency.graph`, `dependency.dependents` and `dependency.broken` explain an older server's refusal of an action as the entity through `actionDependencyGraph`.
- `notification.get`, and the `update`, `archive` and `send` that read through it, refuse a dashboard subscription with the "not a question alert" `ConfigError` instead of a shape error on its payload. `AnyNotification` is the reader: a question alert in full, any other type read no further than `id` and `payload_type`. `CARD_PAYLOAD_TYPE` has the literal type `"notification/card"`.
- `CurrentUser.email` is any string, so `user.current` reads an account whose address Metabase accepts and a stricter email check refuses, such as one with `!` or `/` in the local part or a digit or one-letter top-level domain.
- `transform.create`, `transform.update` and `transformPython.testRun` send a Python source's tables keyed by alias to Metabase 58 and 59, which read no list: a transform entry as its reference less `alias`, which 59 reads and 58, taking only table ids, refuses, or as the bare table id when it names its table by id alone, and a test-run entry as its table id. `TransformSourceTableEntryInput` also takes that id-only entry, `{ alias, table_id }` with `database_id`, `schema` and `table` absent or `null`, so a transform read from 59 updates back unchanged. `pythonTestRun` holds from 58 on a server licensed for Python transforms.
- `SetupInput.user.email` is any string, so `setup.create` hands Metabase an address it accepts and a stricter email check refuses, and the server judges it.
- `collection.itemPages` walks the `trash` alias on every server. No Metabase routes `/api/collection/trash/items`, so the walk reads the trash collection's id from `GET /api/collection/trash` first and pages its items by that id.
- `search.query` and `collection.itemPages` explain an older server's 400 for a `models` value it does not take as the feature it lacks: `measure` in search through `measures`, `transform` through `transforms`, `exploration` through the new `explorations`, and among collection items `measure` through the new `collectionItemMeasures`.
- `collection.itemPages` applies `pinned_state` on Metabase 64 and later, which read it as `pinned-state` and drop the spelling 58 through 63 read.
- `TransformJobUpdateInput.active` records that it needs `transformJobActivation`; a server before 61 drops it unread and still answers the job as active.

## 0.1.0

The first published release: the whole surface.
