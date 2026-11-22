import { Suspense, lazy, useEffect } from "react";
import { getWorld } from "../content/registry";
import type { World } from "../content/types";
import { AppProvider, useApp } from "./AppContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { MapScreen } from "./MapScreen";
import { loadState } from "../services/storage";
import { GrownUpsScreen } from "./screens";
import { Onboarding } from "../onboarding/Onboarding";
import { startAccountSync } from "../services/accountSync";
import { startFeatures } from "./features";
import { PlayGate } from "../billing/PlayGate";

// Parent area + friend challenges (lazy: never loaded during normal play).
const ParentsApp = lazy(() => import("../account/ParentsApp"));
const ChallengeScreen = lazy(() => import("../account/ChallengeScreen"));
const PlanScreen = lazy(() => import("../billing/PlanScreen"));
// Optional features (accounts, billing, friends, push) from GET /api/config; cached, never blocks the first render.
void startFeatures();
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
  "/grown-ups": "For grown-ups — BrainZippy",
  "/hello": "Welcome — BrainZippy",
  "/map": "Monster Island — BrainZippy",
  "/parents": "Parents — BrainZippy",
  "/explore": "Explore — BrainZippy",
  "/plan": "Keep playing — BrainZippy",
};

function Router() {
  const { path } = useApp();
  useEffect(() => {
    const world = getWorld(path.match(/^\/play\/([a-z0-9-]+)$/)?.[1] ?? "");
    document.title = world ? worldTitle(world) : (TITLES[path] ?? "BrainZippy");
  }, [path]);

  // "/" is the prerendered landing page on a full load; inside the app it means "home" = map or first-run story.
  if (path === "/") return <RootRedirect />;
  // Legacy age/game pickers: Explore (all worlds by subject) and today's trail replaced them.
  if (path === "/play" || /^\/play\/ages-[0-9-]+$/.test(path)) return <ExploreRedirect />;
  if (path === "/grown-ups") return <GrownUpsScreen />;
  if (path === "/hello") return <Onboarding />;
  if (path === "/map") return <MapScreen />;
  if (path === "/parents" || path.startsWith("/parents/"))
    return (
      <Suspense fallback={<Loading />}>
        <ParentsApp />
      </Suspense>
    );
  if (path === "/plan")
    return (
      <Suspense fallback={<Loading />}>
        <PlanScreen />
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
      // Outer: trial/subscription gate (billing). Inner: daily learning (logs rounds, seeds today's content,
      // "come back tomorrow" after the limit). A child never sees prices: PlayGate shows the ask-a-grown-up scene.
      <Suspense fallback={<Loading />}>
        <PlayGate key={game}>
          <DailyGate key={game} worldId={game!}>
            <Game key={game} />
          </DailyGate>
        </PlayGate>
      </Suspense>
    );
  return <RootRedirect />;
}

function ExploreRedirect() {
  const { navigate } = useApp();
  useEffect(() => navigate("/explore", { replace: true }), [navigate]);
  return <Loading />;
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
