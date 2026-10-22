import { z } from "zod";

import {
  DataApp,
  type DataAppCreateInput,
  DataAppEntry,
  type DataAppListFilter,
  type DataAppUpdateInput,
} from "../domain/data-app";
import type { RequestOptions, Transport } from "../http/transport";
import type { ListResult } from "../list";
import { explainer } from "../version/refusal";

const DATA_APPS_PATH = "/api/ee/apps";

function appPath(slug: string): string {
  return `${DATA_APPS_PATH}/${encodeURIComponent(slug)}`;
}

export function dataAppResource(transport: Transport) {
  const { explain } = explainer(transport, "dataApp");

  /** List the data apps; `available` keeps only the enabled ones that aren't outdated. `GET /api/ee/apps` answers a bare array. */
  async function list(
    filter: DataAppListFilter = {},
    options: RequestOptions = {},
  ): Promise<ListResult<DataAppEntry>> {
    const data = await transport.requestParsed(z.array(DataAppEntry), DATA_APPS_PATH, {
      ...options,
      query: { available: filter.available },
    });
    return { data, total: null };
  }

  /** Get one data app by slug; admins read disabled apps too. */
  async function get(slug: string, options: RequestOptions = {}): Promise<DataAppEntry> {
    return transport.requestParsed(DataAppEntry, appPath(slug), { ...options });
  }

  /** Create a data app with its resource collection and an empty bundle; it is disabled unless the body says otherwise. */
  async function create(
    params: DataAppCreateInput,
    options: RequestOptions = {},
  ): Promise<DataApp> {
    return transport.requestParsed(DataApp, DATA_APPS_PATH, {
      ...options,
      method: "POST",
      body: params,
    });
  }

  /** Update a data app's fields, or enable or disable it. */
  async function update(
    slug: string,
    params: DataAppUpdateInput,
    options: RequestOptions = {},
  ): Promise<DataApp> {
    return transport.requestParsed(DataApp, appPath(slug), {
      ...options,
      method: "PUT",
      body: params,
    });
  }

  /** Replace a data app's bundle with the text of a built bundle. */
  async function replaceBundle(
    slug: string,
    bundle: string,
    options: RequestOptions = {},
  ): Promise<DataApp> {
    return transport.requestParsed(DataApp, `${appPath(slug)}/bundle`, {
      ...options,
      method: "PUT",
      body: { bundle },
    });
  }

  /** The TypeScript module of the app's queries and actions: a `defineQuery` or `defineAction` call per question and action in its collection. */
  async function typedSchema(slug: string, options: RequestOptions = {}): Promise<string> {
    const response = await transport.requestRaw(`${appPath(slug)}/typed-schema`, {
      ...options,
      expectContentType: "text",
    });
    return response.text();
  }

  /** Delete a data app with its bundle, its collection and its group assignments. */
  async function remove(slug: string, options: RequestOptions = {}): Promise<void> {
    await transport.requestRaw(appPath(slug), {
      ...options,
      method: "DELETE",
      expectContentType: "binary",
    });
  }

  return {
    list: explain("list", list),
    get: explain("get", get),
    create: explain("create", create),
    update: explain("update", update),
    replaceBundle: explain("replaceBundle", replaceBundle),
    typedSchema: explain("typedSchema", typedSchema),
    delete: explain("delete", remove),
  };
}
