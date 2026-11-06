/**
 * Local declaration for `@tryghost/content-api`, which ships no types.
 *
 * We deliberately don't use `@types/tryghost__content-api`: it models `include`
 * as a union of single keywords or an array, but the Ghost API expects the
 * comma-joined string form (`"tags,authors"`) — axios would serialize an array
 * as `include[]=tags&include[]=authors`, which the API rejects. This declaration
 * describes the surface `src/lib/posts.ts` actually calls, with the request
 * shape the SDK really accepts.
 *
 * Resource results are typed `unknown`; `src/lib/posts.ts` owns the `Post` /
 * `Tag` / `Author` interfaces it narrows them to.
 */
declare module "@tryghost/content-api" {
  export interface GhostBrowseParams {
    limit?: number | string;
    page?: number;
    order?: string;
    /** Comma-joined resource names, e.g. `"tags,authors"`. */
    include?: string;
    fields?: string;
    formats?: string;
    filter?: string;
  }

  export interface GhostReadParams extends GhostBrowseParams {
    id?: string;
    slug?: string;
  }

  export interface GhostResource {
    browse(params?: GhostBrowseParams): Promise<unknown>;
    read(params: GhostReadParams): Promise<unknown>;
  }

  export interface GhostContentAPIOptions {
    url: string;
    key: string;
    version: string;
  }

  export default class GhostContentAPI {
    constructor(options: GhostContentAPIOptions);
    posts: GhostResource;
    authors: GhostResource;
    tags: GhostResource;
    pages: GhostResource;
  }
}
