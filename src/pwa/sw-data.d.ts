/** Build data inlined into sw.js by scripts/pwa-plugin.ts (precache list, world bundles, media revisions). */
declare module "virtual:bz-sw-data" {
  const data: {
    version: string;
    precache: string[];
    assets: string[];
    worlds: Record<string, { entry: string; assets: string[]; music: string[]; voice: string[] }>;
    shared: { voice: string[]; music: string[] };
    revs: Record<string, string>;
  };
  export default data;
}
