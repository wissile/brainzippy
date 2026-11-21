/**
 * Yonder's Postcard Trip — world geography data (pure, no React).
 *
 * Everything here is original, simplified and drawn from public-domain geographic facts (coastline positions in
 * degrees of longitude/latitude, typed by hand, then projected). No map tiles, images or third-party shape files
 * are used. Projection: Equal Earth (Šavrič, Patterson & Jenny 2018; equal-area, so continent sizes aren't
 * misleading — docs/curriculum/geography.md §5).
 *
 * Accuracy policy (docs/worlds/postcard-trip.md §6):
 *   - 7-continent model as taught in US schools; 5 oceans incl. the Southern Ocean.
 *   - No country borders are drawn and no disputed territory is named or used in any question.
 *   - Every direction / ocean / hemisphere answer comes from the authored, reviewed tables below (FLIGHTS, SIDES,
 *     PLACES.hemi); tests check each against the projected map so a table and the drawing can never disagree.
 */

export type ContinentId = "na" | "sa" | "europe" | "africa" | "asia" | "australia" | "antarctica";
export type OceanId = "pacific" | "atlantic" | "indian" | "arctic" | "southern";
export type RegionId = ContinentId | OceanId;
export type Dir = "n" | "e" | "s" | "w";
export type LonLat = readonly [number, number];

export const DIRS: readonly Dir[] = ["n", "e", "s", "w"];
export const DIR_WORD: Record<Dir, string> = { n: "north", e: "east", s: "south", w: "west" };
export const OPPOSITE: Record<Dir, Dir> = { n: "s", s: "n", e: "w", w: "e" };

export const CONTINENTS: readonly ContinentId[] = ["na", "sa", "europe", "africa", "asia", "australia", "antarctica"];
export const OCEANS: readonly OceanId[] = ["pacific", "atlantic", "indian", "arctic", "southern"];
export const CONTINENT_NAME: Record<ContinentId, string> = {
  na: "North America", sa: "South America", europe: "Europe", africa: "Africa", asia: "Asia", australia: "Australia", antarctica: "Antarctica",
};
export const OCEAN_NAME: Record<OceanId, string> = { pacific: "Pacific", atlantic: "Atlantic", indian: "Indian", arctic: "Arctic", southern: "Southern" };
export const regionName = (r: RegionId): string => (r in OCEAN_NAME ? `${OCEAN_NAME[r as OceanId]} Ocean` : CONTINENT_NAME[r as ContinentId]);
export const isOcean = (r: string): r is OceanId => (OCEANS as readonly string[]).includes(r);
export const isContinent = (r: string): r is ContinentId => (CONTINENTS as readonly string[]).includes(r);

// ---------------------------------------------------------------- Equal Earth projection

const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
const M = Math.sqrt(3) / 2;
/** Projected half-width / half-height of the whole world (λ = ±180°, φ = ±90°). */
export const EE_X = 2.7055;
export const EE_Y = 1.3173;
/** SVG units per projected unit. The map viewBox is 0 0 MAP_W MAP_H with north up. */
const S = 100;
export const MAP_W = Math.round(2 * EE_X * S); // 541
export const MAP_H = Math.round(2 * EE_Y * S); // 263

/** Equal Earth: [lon, lat] in degrees → [x, y] in map units (y down, north up). */
export function project([lon, lat]: LonLat): [number, number] {
  const l = (lon * Math.PI) / 180;
  const p = (lat * Math.PI) / 180;
  const t = Math.asin(M * Math.sin(p));
  const t2 = t * t, t6 = t2 * t2 * t2;
  const x = (l * Math.cos(t)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [Math.round((EE_X + x) * S * 10) / 10, Math.round((EE_Y - y) * S * 10) / 10];
}
/** Position as a percentage of the map box (for HTML overlays). */
export function pct(ll: LonLat): { x: number; y: number } {
  const [x, y] = project(ll);
  return { x: (x / MAP_W) * 100, y: (y / MAP_H) * 100 };
}
export function pathOf(ring: readonly LonLat[]): string {
  return ring.map((p, i) => `${i ? "L" : "M"}${project(p).join(",")}`).join("") + "Z";
}
/** The outline of the whole Equal Earth world (the sea). */
export function worldOutline(): string {
  const pts: LonLat[] = [];
  for (let lat = -90; lat <= 90; lat += 5) pts.push([180, lat]);
  for (let lat = 90; lat >= -90; lat -= 5) pts.push([-180, lat]);
  return pathOf(pts);
}
/** A parallel (constant latitude) as a path — straight in Equal Earth. */
export function parallel(lat: number): string {
  const [x0, y] = project([-180, lat]);
  const [x1] = project([180, lat]);
  return `M${x0},${y}L${x1},${y}`;
}

// ---------------------------------------------------------------- continents (hand-typed, simplified coastlines)

/**
 * Coarse outlines in [lon, lat]. Europe and Asia share the conventional boundary (Ural Mountains, Ural River,
 * Caspian Sea, Caucasus, Black Sea, Bosphorus); Africa and Asia meet at the Suez canal; the Americas at the
 * Panama–Colombia isthmus. Small islands are left out; the big ones are separate rings of their continent.
 * New Zealand and New Guinea are drawn with Australia (the "Australia / Oceania" continent of the 7-continent
 * model); no question uses them.
 */
export const LAND: Record<ContinentId, readonly (readonly LonLat[])[]> = {
  na: [
    [
      [-168, 66], [-162, 70], [-156, 71.3], [-141, 69.6], [-128, 70], [-115, 68.5], [-95, 68], [-85, 69.5], [-82, 66], [-90, 63], [-94, 59],
      [-92, 57], [-82, 55], [-79, 52], [-77, 58], [-78, 62], [-73, 62.5], [-65, 60], [-61, 56], [-56, 52], [-60, 47], [-66, 44.5], [-70, 42],
      [-74, 40.5], [-76, 37], [-75.5, 35], [-81, 31.5], [-80, 26], [-81.5, 25.2], [-82.8, 28], [-84, 30], [-89, 30.2], [-94, 29.5], [-97.4, 27.5],
      [-97.5, 22], [-95, 18.6], [-91, 18.5], [-90.5, 21], [-87, 21.5], [-88, 16], [-84, 15.8], [-83.4, 10.5], [-79.5, 9.2], [-77.3, 8.6],
      [-77.4, 7], [-79.8, 7.4], [-81.5, 7.7], [-85.7, 10], [-87.5, 13], [-91.5, 14], [-94.5, 16], [-98, 16.2], [-103, 18.3], [-105.5, 20.5],
      [-110, 23], [-114, 28], [-117, 32.5], [-120.5, 34.5], [-122.5, 37.8], [-124, 40.5], [-124.5, 43], [-124, 46.3], [-124.7, 48.4],
      [-127.5, 50.5], [-130.5, 54], [-134.5, 58], [-140, 59.8], [-146, 60.8], [-152, 59], [-158, 56.5], [-164, 54.8], [-158, 58.5], [-162, 60],
      [-165, 62.5], [-164.5, 64.5],
    ],
    // Greenland
    [[-73, 78], [-60, 82], [-30, 83.5], [-18, 81.5], [-20, 75], [-22, 70], [-32, 68], [-40, 65], [-43, 60], [-48, 61], [-52, 65], [-54, 69], [-58, 75], [-66, 76.5]],
    // Arctic islands (Baffin, Ellesmere, Victoria — one simplified group)
    [[-120, 72], [-100, 76], [-90, 80], [-75, 82], [-65, 81], [-75, 77], [-85, 74], [-80, 73], [-68, 70], [-62, 66.5], [-66, 63], [-73, 64.5], [-80, 69.5], [-100, 72.5], [-115, 70.5]],
    // Cuba
    [[-85, 21.8], [-80, 23.1], [-74.2, 20.2], [-77.7, 19.9], [-81, 21.6]],
  ],
  sa: [
    [
      [-77.3, 8.6], [-75.5, 10.7], [-72, 12], [-71.3, 11], [-68, 10.6], [-62, 10.7], [-60, 8.5], [-57, 6], [-52, 4.8], [-50, 1.8], [-48.5, -1],
      [-44.5, -2.5], [-40, -2.8], [-35, -5.4], [-34.8, -7.5], [-37, -11], [-39, -15], [-39.5, -19.5], [-41, -22], [-44, -23], [-48.5, -26.5],
      [-48.6, -28.5], [-52, -32], [-54, -34.5], [-57.5, -35], [-57, -36.5], [-57.5, -38], [-62, -39], [-62.3, -40.8], [-65, -41], [-64.5, -42.5],
      [-65.5, -45], [-67.5, -46.5], [-66, -47.8], [-68.5, -50], [-69, -52], [-68.5, -54.5], [-66.5, -55], [-70, -55.3], [-74, -52], [-75.5, -48],
      [-74, -44], [-73.5, -40], [-73.5, -37], [-71.5, -33], [-71.5, -28], [-70.3, -23], [-70.2, -18.3], [-75, -15.3], [-77, -12], [-79.5, -7.5],
      [-81.2, -5], [-80, -2.5], [-80.5, -0.5], [-79, 1.5], [-77.5, 4], [-77.4, 7],
    ],
  ],
  europe: [
    [
      [29, 41], [28, 43], [29.7, 45.2], [31, 46.6], [33.5, 44.5], [36.5, 45.3], [38, 47], [39.5, 47], [38.5, 46], [37.8, 44.6], [40, 43.4],
      [44, 42.6], [47.5, 42], [47.5, 44.5], [47.5, 45.6], [49.5, 46.5], [51.8, 47], [51.5, 50], [55, 51.8], [59, 53], [59.2, 57], [59.5, 61],
      [62, 65], [66, 68.5], [67, 69.5], [60, 69.5], [54, 68.3], [48, 67.6], [44, 68.5], [40, 66], [36, 66.6], [41, 67.8], [33, 69.4], [28, 71],
      [24, 71], [19, 70], [14, 68], [11.5, 64.5], [5, 62], [5.5, 59], [7, 58], [10.5, 59.3], [11.7, 58], [12.8, 56.2], [13, 55.4], [16.5, 57],
      [18.8, 59.5], [17.5, 61], [21, 64.5], [25, 65.6], [21.5, 62], [22, 60.2], [29.5, 60], [28, 59.5], [23.5, 59.2], [21.5, 57.5], [21, 55.7],
      [19.5, 54.4], [14.5, 54], [11, 54], [10.6, 57.7], [8.1, 56.6], [8.6, 55], [8.7, 53.9], [5, 53.4], [3.5, 51.4], [1.6, 50.9], [-1.6, 49.6],
      [-4.7, 48.5], [-2, 47], [-1.2, 46], [-1.5, 43.5], [-8, 43.7], [-9.3, 43], [-8.8, 41.5], [-9.5, 38.8], [-8.9, 37], [-6, 36.8], [-5.6, 36],
      [-4.5, 36.7], [-2, 36.7], [-0.5, 38], [-0.3, 39.5], [0.8, 41], [3.2, 42], [3, 43.3], [4.8, 43.4], [7.5, 43.8], [8.8, 44.4], [10.3, 43.5],
      [12.4, 41.7], [15.6, 40], [16, 38], [17, 39], [18.5, 40.2], [17, 41], [15, 42], [13.6, 43.6], [12.3, 44.7], [12.4, 45.4], [13.7, 45.6],
      [15, 44.5], [17.4, 43], [19.4, 41.9], [19.5, 40.4], [21, 38.4], [22.2, 36.5], [23.2, 38], [24, 38.2], [22.9, 39.4], [23.8, 40.4], [26, 40.9],
      [26.5, 40.6],
    ],
    // Great Britain
    [[-5.7, 50.1], [-3, 50.6], [1.4, 51.2], [1.7, 52.7], [0.3, 53.4], [-0.2, 54.5], [-1.6, 55.6], [-2, 57], [-1.8, 57.6], [-3.3, 58.6], [-5, 58.6], [-6.2, 57.5], [-5.6, 56.3], [-4.9, 55], [-3.2, 54.1], [-3, 53.3], [-4.6, 53.3], [-4.3, 52.5], [-5.3, 51.8], [-4.3, 51.2]],
    // Ireland
    [[-6, 52], [-6.2, 53.4], [-5.7, 54.6], [-7, 55.3], [-8.3, 55.2], [-10, 54.2], [-9.8, 53.3], [-10.3, 51.9], [-8.5, 51.6], [-6.4, 52.2]],
    // Iceland
    [[-24, 64.9], [-22, 63.8], [-18, 63.4], [-14, 64.6], [-15, 66.3], [-20, 66.1], [-23.5, 66.2]],
  ],
  africa: [
    [
      [32.3, 31.3], [30, 31.3], [25, 31.7], [20, 32.2], [19, 30.3], [15.5, 31.5], [11.2, 33.2], [11, 37], [9.8, 37.3], [3, 36.9], [-2, 35.1],
      [-5.9, 35.8], [-6.8, 34], [-9.6, 30.4], [-13, 27.7], [-16, 23.8], [-17.1, 21], [-16.5, 16.2], [-17.5, 14.7], [-16.8, 12.4], [-13.3, 9.5],
      [-11.5, 6.9], [-7.5, 4.4], [-4, 5.2], [1, 5.9], [4.5, 6.3], [6, 4.3], [8.5, 4.5], [9.8, 2.3], [9.3, 0], [8.8, -1], [12.2, -6], [13.4, -8.8],
      [12.5, -13.5], [11.8, -17], [14.4, -22.8], [15.3, -27], [16.5, -28.6], [18.2, -31.8], [18.4, -34.2], [20, -34.8], [22.5, -34], [25.6, -33.9],
      [28, -32.8], [30.5, -30.8], [32.4, -28.6], [32.9, -26], [35.5, -24], [35.4, -21.3], [34.8, -19.8], [36.9, -17.6], [40.4, -15.5], [40.6, -11],
      [39.3, -7.2], [39.5, -4.8], [41.6, -1.6], [43.5, 0.8], [46.5, 3], [49, 6.5], [51.2, 10.5], [51.3, 11.8], [48, 11.2], [44.5, 10.4],
      [43.3, 11.5], [42.8, 12.5], [41.5, 14.3], [39.5, 15.8], [38.5, 18], [37.3, 21], [36.8, 22.1], [35.6, 23.9], [34.2, 26.5], [33, 28.5],
      [32.6, 29.9],
    ],
    // Madagascar
    [[49.3, -12], [50.4, -15.4], [49.8, -17], [47.1, -24.9], [45, -25.5], [43.7, -23.4], [43.3, -21.6], [44.4, -20], [44, -17.4], [46.3, -15.8], [47.8, -14.6]],
  ],
  asia: [
    [
      [29, 41], [31, 41.1], [35, 42], [38, 41], [41.6, 41.6], [40, 43.4], [44, 42.6], [47.5, 42], [49.5, 40.3], [49, 38.5], [50.5, 37], [54, 37],
      [53.5, 39.5], [53, 42], [51.3, 44.5], [53.5, 46.8], [51.8, 47], [51.5, 50], [55, 51.8], [59, 53], [59.2, 57], [59.5, 61], [62, 65],
      [66, 68.5], [67, 69.5], [72, 72.5], [80, 73.5], [87, 75], [98, 76], [104, 77.7], [112, 73.7], [127, 73.5], [140, 72.5], [150, 71.6],
      [160, 69.7], [170, 70], [179.9, 68.9], [179.9, 65], [178, 64.5], [173, 61], [166, 60], [163, 59.8], [156.7, 51], [156, 57], [155, 59.4],
      [143, 59.3], [137, 54], [141.4, 52.2], [140, 48], [135, 43.5], [131, 42.6], [129.5, 40.5], [129.5, 36], [126.5, 34.5], [126.1, 37.7],
      [124.5, 39.8], [121.5, 40.9], [117.8, 39], [119, 37.3], [122.5, 37], [120, 35.5], [121, 32], [122, 30], [119.7, 25.5], [117, 23.5],
      [113.5, 22.2], [110, 21], [108.5, 21.6], [106.5, 20], [105.7, 18.8], [108.8, 15.4], [109.3, 12], [107, 10.5], [105, 8.6], [104.8, 10.2],
      [102.5, 12.2], [100.9, 13.4], [99.2, 10.5], [100.3, 7], [103.4, 4], [103.4, 1.4], [101.3, 2.8], [98.3, 7.8], [98.6, 12.5], [97.7, 16.5],
      [94.3, 16], [94.5, 19.5], [92.3, 20.8], [91.8, 22.5], [88, 21.6], [86.9, 20.7], [85, 19.3], [82.3, 16.6], [80.3, 15.5], [80.2, 13],
      [79.8, 10.3], [77.5, 8.1], [76.3, 9.8], [74.8, 12.9], [73.4, 16.5], [72.8, 19], [72.6, 21.4], [70, 22.4], [68.7, 23.5], [66.6, 25.4],
      [61.6, 25.2], [57.3, 25.8], [56.4, 27.1], [54, 26.6], [51, 28], [48.8, 30], [48.5, 28], [50.8, 25], [51.6, 24.2], [54, 24.2], [56.4, 26.3],
      [56.8, 24.5], [58.8, 22.5], [59.8, 22.2], [57.8, 19], [55, 17], [52, 15.6], [48.7, 14], [45, 12.8], [43.4, 12.7], [42.8, 14.8],
      [42.6, 16.8], [40.8, 19.6], [39.1, 21.8], [38, 24], [35.2, 28.1], [34.9, 29.5], [34.3, 27.8], [32.6, 29.9], [32.3, 31.3], [34.2, 31.3],
      [34.9, 32.8], [35.6, 34.6], [35.9, 36], [36.2, 36.6], [34, 36.3], [32, 36.5], [30.5, 36.3], [29, 36.6], [27.3, 37.4], [26.3, 38.5],
      [26.6, 39.6], [26.4, 40.1], [27.5, 40.4],
    ],
    // Japan (Honshu, Kyushu, Shikoku as one shape) and Hokkaido
    [[130, 31.2], [131.5, 31.5], [132, 33.8], [135, 33.5], [136.9, 34.6], [139.8, 35], [140.8, 35.7], [141, 38.3], [142, 39.6], [141.4, 41.4], [140, 40.6], [139.9, 39], [138.6, 37.8], [136.8, 37.1], [135.6, 35.6], [133, 35.5], [131, 34.4], [129.8, 33.1]],
    [[140, 41.5], [141.2, 41.8], [143.3, 42], [145.5, 43.3], [144, 44.1], [141.6, 45.4], [141.4, 43.3], [140, 42.6]],
    // Sumatra, Java, Borneo, Luzon, Mindanao, Taiwan, Sri Lanka (physical outlines only; no labels, no borders)
    [[95.3, 5.6], [97.5, 5.2], [100.4, 2.1], [103.8, -1], [106, -3], [105.8, -5.8], [104.5, -5.9], [102.3, -4], [100.3, -1], [98.7, 1.7]],
    [[105.2, -6.8], [106, -5.9], [108.5, -6.4], [111, -6.4], [114.5, -7.7], [115.7, -8.3], [115.3, -8.9], [114.4, -8.7], [111, -8.2], [108, -7.8]],
    [[109, 1.5], [109.6, -1], [110.2, -2.9], [114.5, -3.5], [116.5, -2], [117.6, 0.8], [119, 4.9], [117.3, 6.9], [116, 6], [113.5, 3.4], [111, 1.7]],
    [[120.6, 18.5], [122.3, 18.4], [122, 16.3], [124, 13], [121, 13.7], [120.3, 16], [120, 17.5]],
    [[122, 7], [124, 6], [126.2, 6.5], [126.5, 9], [125.5, 9.8], [123.5, 8.6]],
    [[120.1, 23], [121, 25.3], [122, 25], [121, 22]],
    [[79.8, 6], [81.8, 7.2], [81.2, 8.6], [80, 9.8]],
  ],
  australia: [
    [
      [113.5, -22], [114, -26.5], [115, -33.6], [117, -35], [120, -33.9], [124, -33], [126, -32.3], [131, -31.5], [134, -32.8], [135.9, -34.8],
      [138, -35.6], [140, -37.9], [143.5, -38.8], [146.3, -39.1], [148, -37.8], [150, -37.5], [151.3, -33.8], [153.1, -30.5], [153.5, -28],
      [153, -25.2], [150.9, -22.6], [149, -20.4], [146.3, -18.9], [145.4, -15], [143.6, -14], [142.5, -10.7], [141.6, -12.9], [141.5, -16.5],
      [140.8, -17.4], [139.3, -17.4], [135.5, -14.7], [136.9, -12.2], [132.6, -11.4], [130.2, -12.7], [129.4, -14.9], [127.3, -13.9],
      [125.1, -14.5], [122.2, -17.5], [121, -19.5], [117, -20.6], [114.2, -21.8],
    ],
    // Tasmania, New Guinea, New Zealand (North and South Island)
    [[144.6, -40.7], [148.3, -40.9], [148, -43.2], [146.8, -43.6], [145.2, -42.2]],
    [[131, -1.4], [134, -0.9], [137.5, -1.5], [141, -2.6], [145.8, -4.8], [147.5, -6.1], [147.8, -8], [150, -10.6], [146, -8.5], [144, -7.6], [142.8, -9.3], [141, -9.1], [138.5, -8.3], [137.8, -5.3], [135, -4.3], [132.6, -4], [131.8, -2.5]],
    [[172.7, -34.5], [174.6, -36], [175.9, -37.4], [178.5, -37.7], [177.9, -39.3], [176.8, -40.1], [175.2, -41.6], [174.6, -41.2], [174.6, -39.8], [173.8, -39.2], [174.6, -37.4], [173, -35.3]],
    [[172.6, -40.5], [174.3, -41.3], [173.9, -42.4], [172.7, -43.7], [171.2, -44.4], [170.7, -45.9], [169.3, -46.6], [166.5, -46], [166.9, -45.2], [168.4, -44], [170.5, -43], [172, -41.5]],
  ],
  antarctica: [
    [
      [-180, -78], [-160, -78.5], [-150, -76.5], [-135, -74.5], [-120, -74], [-100, -73.5], [-80, -73], [-75, -72], [-68, -68], [-64, -65.5],
      [-57, -63.3], [-60, -65.5], [-62, -69], [-61, -73], [-58, -75], [-45, -78], [-30, -77], [-20, -73.5], [-10, -71], [0, -70], [15, -70],
      [30, -69.5], [40, -68.5], [55, -66.5], [70, -68], [80, -67], [90, -66.5], [100, -65.8], [110, -66], [120, -66.8], [135, -66.2],
      [145, -67.5], [160, -70], [170, -71.5], [168, -77], [180, -78], [180, -90], [-180, -90],
    ],
  ],
};

/**
 * Invisible tap / drop areas for the oceans (drawn under the land, so land always wins). Rough, generous shapes
 * whose borders follow the usual conventions: Atlantic / Indian at 20°E (Cape Agulhas), Indian / Pacific at
 * 147°E south of Tasmania, Arctic north of about 66°N, Southern south of 60°S. The Pacific is split by the map
 * edge, so it has two areas.
 */
export const OCEAN_AREAS: Record<OceanId, readonly (readonly LonLat[])[]> = {
  pacific: [
    [[-180, -60], [-67, -60], [-76, -50], [-82, 0], [-82, 8], [-96, 15], [-112, 22], [-126, 40], [-132, 55], [-160, 57], [-168, 66], [-180, 66]],
    [[147, -60], [180, -60], [180, 66], [170, 66], [160, 55], [145, 45], [124, 32], [112, 18], [118, 2], [128, -8], [147, -40]],
  ],
  atlantic: [
    [[-67, -60], [20, -60], [20, -34], [8, 0], [-12, 25], [-8, 45], [6, 62], [-20, 66], [-50, 66], [-60, 55], [-80, 30], [-98, 25], [-98, 18], [-80, 9], [-70, -20], [-67, -56]],
  ],
  indian: [
    [[20, -60], [147, -60], [147, -40], [128, -8], [104, -6], [96, 8], [92, 22], [80, 20], [70, 25], [56, 27], [44, 12], [36, -12], [20, -34]],
  ],
  arctic: [[[-180, 66], [180, 66], [180, 90], [-180, 90]]],
  southern: [[[-180, -60], [180, -60], [180, -90], [-180, -90]]],
};

/** Where a region's drop pin / label sits (and where a postcard lands). Chosen inside the shape, away from coasts. */
export const ANCHOR: Record<RegionId, LonLat> = {
  na: [-102, 47], sa: [-60, -12], europe: [16, 51], africa: [19, 6], asia: [92, 46], australia: [134, -25], antarctica: [40, -80],
  pacific: [-140, 4], atlantic: [-38, 24], indian: [76, -24], arctic: [-10, 85], southern: [-110, -66],
};
/** Second Pacific label (the map edge splits it). */
export const PACIFIC_WEST: LonLat = [168, 12];

// ---------------------------------------------------------------- postcard places

export type SceneKind =
  | "lake" | "canyon" | "steps" | "terraces" | "rainforest" | "glacier" | "tower" | "arena" | "fjord" | "pyramids" | "savanna" | "tablemountain"
  | "lemur" | "fuji" | "wall" | "dome" | "ricefields" | "opera" | "reef" | "penguins";

export interface Place {
  id: string;
  /** Country or place name as said in the lines. */
  name: string;
  continent: ContinentId;
  /** Where the pin goes (the landmark itself). */
  at: LonLat;
  scene: SceneKind;
  /** What the postcard shows (caption + a11y). */
  shows: string;
  /** Hemisphere for equator questions; null = too close to the equator to ask about at this map size (|lat| < 12°). */
  hemi: "n" | "s" | null;
}

/** 20 postcards, 2–4 per continent. Facts and wording flagged for geography-educator review (docs/worlds/postcard-trip.md §7). */
export const PLACES: readonly Place[] = [
  { id: "canada", name: "Canada", continent: "na", at: [-116.2, 51.4], scene: "lake", shows: "a blue lake in the Rocky Mountains", hemi: "n" },
  { id: "usa", name: "the United States", continent: "na", at: [-112.1, 36.1], scene: "canyon", shows: "the Grand Canyon", hemi: "n" },
  { id: "mexico", name: "Mexico", continent: "na", at: [-88.6, 20.7], scene: "steps", shows: "the stepped pyramid at Chichén Itzá", hemi: "n" },
  { id: "peru", name: "Peru", continent: "sa", at: [-72.5, -13.2], scene: "terraces", shows: "Machu Picchu high in the Andes mountains", hemi: "s" },
  { id: "brazil", name: "Brazil", continent: "sa", at: [-60, -3.1], scene: "rainforest", shows: "the Amazon rainforest and river", hemi: null },
  { id: "argentina", name: "Argentina", continent: "sa", at: [-73, -50.5], scene: "glacier", shows: "a huge glacier in Patagonia", hemi: "s" },
  { id: "france", name: "France", continent: "europe", at: [2.3, 48.9], scene: "tower", shows: "the Eiffel Tower in Paris", hemi: "n" },
  { id: "italy", name: "Italy", continent: "europe", at: [12.5, 41.9], scene: "arena", shows: "the Colosseum in Rome", hemi: "n" },
  { id: "norway", name: "Norway", continent: "europe", at: [7.2, 62.1], scene: "fjord", shows: "a deep fjord between steep mountains", hemi: "n" },
  { id: "egypt", name: "Egypt", continent: "africa", at: [31.1, 30], scene: "pyramids", shows: "the Great Pyramids of Giza", hemi: "n" },
  { id: "kenya", name: "Kenya", continent: "africa", at: [35.1, -1.5], scene: "savanna", shows: "giraffes on the grassy savanna", hemi: null },
  { id: "southafrica", name: "South Africa", continent: "africa", at: [18.4, -33.9], scene: "tablemountain", shows: "flat-topped Table Mountain by the sea", hemi: "s" },
  { id: "madagascar", name: "Madagascar", continent: "africa", at: [47.5, -18.9], scene: "lemur", shows: "a ring-tailed lemur in the forest", hemi: "s" },
  { id: "japan", name: "Japan", continent: "asia", at: [138.7, 35.4], scene: "fuji", shows: "snowy Mount Fuji", hemi: "n" },
  { id: "china", name: "China", continent: "asia", at: [116, 40.4], scene: "wall", shows: "the Great Wall winding over the hills", hemi: "n" },
  { id: "india", name: "India", continent: "asia", at: [78, 27.2], scene: "dome", shows: "the Taj Mahal", hemi: "n" },
  { id: "indonesia", name: "Indonesia", continent: "asia", at: [115.2, -8.4], scene: "ricefields", shows: "green rice terraces on the island of Bali", hemi: null },
  { id: "sydney", name: "Sydney", continent: "australia", at: [151.2, -33.9], scene: "opera", shows: "the Sydney Opera House by the harbour", hemi: "s" },
  { id: "reef", name: "the Great Barrier Reef", continent: "australia", at: [147, -18], scene: "reef", shows: "coral and fish on the Great Barrier Reef", hemi: "s" },
  { id: "antarctica", name: "a science station", continent: "antarctica", at: [23, -72], scene: "penguins", shows: "penguins near a science station on the ice", hemi: "s" },
];
export const placeById = (id: string): Place | undefined => PLACES.find((p) => p.id === id);
export const placesOn = (c: ContinentId): Place[] => PLACES.filter((p) => p.continent === c);

// ---------------------------------------------------------------- authored direction facts

/**
 * Balloon flights: "from <continent>, fly <dir> and you reach <continent>". Each flight is a straight line on the
 * map (a parallel for east/west, a meridian for north/south) with hand-picked end points, so the drawing shows
 * exactly the route the answer claims. Only unambiguous pairs are used: a flight that would cross the map edge
 * (e.g. North America → Asia across the Pacific) or could land on two continents (Asia south, Australia north,
 * anything from Antarctica) is left out. (from, to) pairs are unique, so "which way?" has one answer.
 */
export interface Flight { from: ContinentId; dir: Dir; to: ContinentId; via: OceanId | null; a: LonLat; b: LonLat }
export const FLIGHTS: readonly Flight[] = [
  { from: "na", dir: "e", to: "europe", via: "atlantic", a: [-88, 45], b: [2, 45] },
  { from: "na", dir: "s", to: "sa", via: null, a: [-70, 44], b: [-70, 2] },
  { from: "sa", dir: "n", to: "na", via: null, a: [-70, 2], b: [-70, 44] },
  { from: "sa", dir: "e", to: "africa", via: "atlantic", a: [-50, -10], b: [18, -10] },
  { from: "sa", dir: "s", to: "antarctica", via: "southern", a: [-68, -40], b: [-68, -74] },
  { from: "europe", dir: "w", to: "na", via: "atlantic", a: [5, 48], b: [-75, 48] },
  { from: "europe", dir: "s", to: "africa", via: null, a: [15, 50], b: [15, 20] },
  { from: "europe", dir: "e", to: "asia", via: null, a: [30, 55], b: [90, 55] },
  { from: "africa", dir: "n", to: "europe", via: null, a: [22, 10], b: [22, 50] },
  { from: "africa", dir: "w", to: "sa", via: "atlantic", a: [20, -12], b: [-50, -12] },
  { from: "africa", dir: "e", to: "australia", via: "indian", a: [28, -22], b: [124, -22] },
  { from: "africa", dir: "s", to: "antarctica", via: "southern", a: [25, -25], b: [25, -74] },
  { from: "asia", dir: "w", to: "europe", via: null, a: [90, 55], b: [30, 55] },
  { from: "australia", dir: "w", to: "africa", via: "indian", a: [130, -24], b: [30, -24] },
  { from: "australia", dir: "s", to: "antarctica", via: "southern", a: [135, -28], b: [135, -72] },
];
export const flightFrom = (from: ContinentId, dir: Dir): Flight | undefined => FLIGHTS.find((f) => f.from === from && f.dir === dir);
export const flightTo = (from: ContinentId, to: ContinentId): Flight | undefined => FLIGHTS.find((f) => f.from === from && f.to === to);

/** "Sail <dir> from <continent> and the boat is in <ocean>": the ocean along that whole side of the continent. */
export interface Side { continent: ContinentId; dir: Dir; ocean: OceanId; boat: LonLat }
export const SIDES: readonly Side[] = [
  { continent: "na", dir: "e", ocean: "atlantic", boat: [-55, 35] },
  { continent: "na", dir: "w", ocean: "pacific", boat: [-135, 35] },
  { continent: "na", dir: "n", ocean: "arctic", boat: [-140, 76] },
  { continent: "sa", dir: "e", ocean: "atlantic", boat: [-25, -20] },
  { continent: "sa", dir: "w", ocean: "pacific", boat: [-95, -20] },
  { continent: "europe", dir: "w", ocean: "atlantic", boat: [-22, 48] },
  { continent: "europe", dir: "n", ocean: "arctic", boat: [30, 78] },
  { continent: "africa", dir: "w", ocean: "atlantic", boat: [-20, 5] },
  { continent: "africa", dir: "e", ocean: "indian", boat: [60, -10] },
  { continent: "asia", dir: "e", ocean: "pacific", boat: [160, 35] },
  { continent: "asia", dir: "s", ocean: "indian", boat: [80, -5] },
  { continent: "asia", dir: "n", ocean: "arctic", boat: [110, 80] },
  { continent: "australia", dir: "e", ocean: "pacific", boat: [168, -28] },
  { continent: "australia", dir: "w", ocean: "indian", boat: [98, -28] },
  { continent: "antarctica", dir: "n", ocean: "southern", boat: [-40, -63] },
];
export const sideOf = (c: ContinentId, d: Dir): Side | undefined => SIDES.find((s) => s.continent === c && s.dir === d);

// ---------------------------------------------------------------- point-in-region (tests + tap fallback)

export function inRing([lon, lat]: LonLat, ring: readonly LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const onLand = (p: LonLat, c?: ContinentId): boolean =>
  (c ? [c] : CONTINENTS).some((k) => LAND[k].some((ring) => inRing(p, ring)));
export const continentAt = (p: LonLat): ContinentId | null => CONTINENTS.find((k) => LAND[k].some((ring) => inRing(p, ring))) ?? null;
/** Ocean at a sea point (land wins first). Southern/Arctic bands are checked before the big three. */
export function oceanAt(p: LonLat): OceanId | null {
  if (continentAt(p)) return null;
  for (const o of ["southern", "arctic", "atlantic", "indian", "pacific"] as const) if (OCEAN_AREAS[o].some((ring) => inRing(p, ring))) return o;
  return null;
}
