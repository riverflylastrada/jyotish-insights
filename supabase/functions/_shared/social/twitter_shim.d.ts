// Minimal ambient types for twitter-api-v2, applied via `@deno-types` on the
// import in x-client.ts. The library ships Node-flavoured .d.ts that reference
// @types/node; the CI edge-functions job has no node_modules, so `deno check`
// would fail trying to resolve them. This shim makes the client effectively
// untyped (any) for type-checking while the real JS still runs at runtime.
// deno-lint-ignore-file no-explicit-any

export class TwitterApi {
  constructor(credentials: {
    appKey: string;
    appSecret: string;
    accessToken: string;
    accessSecret: string;
  });
  readonly v2: any;
  readonly readWrite: any;
}
