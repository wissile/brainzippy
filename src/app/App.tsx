import { Suspense, lazy, useEffect } from "react";
import { getWorld } from "../content/registry";
import type { World } from "../content/types";
import { AppProvider, useApp } from "./AppContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { MapScreen } from "./MapScreen";
import { AgeScreen, GamesScreen, GrownUpsScreen, HomeScreen } from "./screens";
import { Onboarding } from "../onboarding/Onboarding";

// Worlds come from the content registry (src/content/packs/*); game code + art is lazy-loaded so the home screen stays light.
const lazyGames = new Map<string, React.LazyExoticComponent<React.ComponentType>>();
function gameComponent(world: World) {
  let C = lazyGames.get(world.id);
  if (!C) {
    C = lazy(world.load);
    lazyGames.set(world.id, C);
  }
  return C;
}
const worldTitle = (w: World) => `${w.title} — ${w.gameType} (ages ${w.ages[0]}–${w.ages[1]}) — BrainZippy`;
// Voice studio: development-only tool for recording human voice takes (never shipped in production builds).
const Studio = import.meta.env.DEV ? lazy(() => import("../studio/Studio")) : null;

const TITLES: Record<string, string> = {
  "/": "BrainZippy — Learning games for kids",
  "/play": "Choose your age — BrainZippy",
  "/grown-ups": "For grown-ups — BrainZippy",
  "/hello": "Welcome — BrainZippy",
  "/map": "Monster Island — BrainZippy",
};

function Router() {
  const { path } = useApp();
  useEffect(() => {
    const world = getWorld(path.match(/^\/play\/([a-z0-9-]+)$/)?.[1] ?? "");
    document.title = world ? worldTitle(world) : (TITLES[path] ?? "BrainZippy");
  }, [path]);

  if (path === "/") return <HomeScreen />;
  if (path === "/play") return <AgeScreen />;
  if (path === "/grown-ups") return <GrownUpsScreen />;
  if (path === "/hello") return <Onboarding />;
  if (path === "/map") return <MapScreen />;
  if (path === "/studio" && Studio)
    return (
      <Suspense fallback={<Loading />}>
        <Studio />
      </Suspense>
    );
  const game = path.match(/^\/play\/([a-z0-9-]+)$/)?.[1];
  const world = game ? getWorld(game) : undefined;
  const Game = world ? gameComponent(world) : undefined;
  if (Game)
    return (
      <Suspense fallback={<Loading />}>
        <Game key={game} />
      </Suspense>
    );
  const m = path.match(/^\/play\/(ages-[0-9-]+)$/);
  if (m?.[1]) return <GamesScreen bandId={m[1]} />;
  return <HomeScreen />;
}

function Loading() {
  return (
    <main className="screen loading" aria-busy="true">
      <div className="loader" aria-label="Loading"><i /><i /><i /></div>
    </main>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router />
      </AppProvider>
    </ErrorBoundary>
  );
}
