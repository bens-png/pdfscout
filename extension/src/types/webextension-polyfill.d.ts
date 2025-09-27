/* Minimal, local typings for what we use */
declare module "webextension-polyfill" {
  interface StorageArea {
    get(
      keys?: string | string[] | Record<string, unknown>
    ): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
  }
  interface Browser {
    storage: { local: StorageArea };
  }
  const browser: Browser;
  export default browser;
}
