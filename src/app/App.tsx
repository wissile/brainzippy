import { Suspense, lazy, useEffect } from "react";
import { getWorld } from "../content/registry";
import type { World } from "../content/types";
import { AppProvider, useApp } from "./AppContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { MapScreen } from "./MapScreen";
import { loadState } from "../services/storage";
import { AgeScreen, GamesScreen, GrownUpsScreen } from "./screens";
import { Onboarding } from "../onboarding/Onboarding";
import { startAccountSync } from "../services/accountSync";

// Parent area + friend challenges (lazy: never loaded during normal play).
const ParentsApp = lazy(() => import("../account/ParentsApp"));
const ChallengeScreen = lazy(() => import("../account/ChallengeScreen"));
startAccountSync();
import { DailyGate } from "../daily/DailyGate";

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
  "/parents": "Parents — BrainZippy",
  "/explore": "Explore — BrainZippy",
};

function Router() {
  const { path } = useApp();
  useEffect(() => {
    const world = getWorld(path.match(/^\/play\/([a-z0-9-]+)$/)?.[1] ?? "");
    document.title = world ? worldTitle(world) : (TITLES[path] ?? "BrainZippy");
  }, [path]);

  // "/" is the prerendered landing page on a full load; inside the app it means "home" = map or first-run story.
  if (path === "/") return <RootRedirect />;
  if (path === "/play") return <AgeScreen />;
  if (path === "/grown-ups") return <GrownUpsScreen />;
  if (path === "/hello") return <Onboarding />;
  if (path === "/map") return <MapScreen />;
  if (path === "/parents" || path.startsWith("/parents/"))
    return (
      <Suspense fallback={<Loading />}>
        <ParentsApp />
      </Suspense>
    );
  const challenge = path.match(/^\/challenge\/([0-9a-f]{32})$/)?.[1];
  if (challenge)
    return (
      <Suspense fallback={<Loading />}>
        <ChallengeScreen token={challenge} />
      </Suspense>
    );
  if (path === "/explore") return <MapScreen view="explore" />;
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
      // daily learning: logs rounds, seeds today's content, and shows "come back tomorrow" after the limit
      <DailyGate key={game} worldId={game!}>
        <Suspense fallback={<Loading />}>
          <Game key={game} />
        </Suspense>
      </DailyGate>
    );
  const m = path.match(/^\/play\/(ages-[0-9-]+)$/);
  if (m?.[1]) return <GamesScreen bandId={m[1]} />;
  return <RootRedirect />;
}

/** In-app "/" and unknown paths: returning players go to Monster Island, new players to the first-run story. */
function RootRedirect() {
  const { navigate } = useApp();
  useEffect(() => navigate(loadState().profile.step === "done" ? "/map" : "/hello", { replace: true }), [navigate]);
  return <Loading />;
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
