import { Suspense, lazy, useEffect } from "react";
import { AppProvider, useApp } from "./AppContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { MapScreen } from "./MapScreen";
import { AgeScreen, GamesScreen, GrownUpsScreen, HomeScreen } from "./screens";
import { Onboarding } from "../onboarding/Onboarding";

// Game code + art is lazy-loaded so the home screen stays light.
const CountingAdventure = lazy(() => import("../games/counting-adventure/CountingAdventure"));
const SkyBalloonRace = lazy(() => import("../games/sky-balloon-race/SkyBalloonRace"));
const GlowCaveHops = lazy(() => import("../games/glow-cave-hops/GlowCaveHops"));
const CookieKitchen = lazy(() => import("../games/cookie-kitchen/CookieKitchen"));
const GAMES: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  "counting-adventure": CountingAdventure,
  "sky-balloon-race": SkyBalloonRace,
  "glow-cave-hops": GlowCaveHops,
  "cookie-kitchen": CookieKitchen,
};
// Voice studio: development-only tool for recording human voice takes (never shipped in production builds).
const Studio = import.meta.env.DEV ? lazy(() => import("../studio/Studio")) : null;

const TITLES: Record<string, string> = {
  "/": "BrainZippy — Learning games for kids",
  "/play": "Choose your age — BrainZippy",
  "/play/counting-adventure": "Bobbo's Breakfast — counting game (ages 4–6) — BrainZippy",
  "/play/sky-balloon-race": "Sky Balloon Race — addition game — BrainZippy",
  "/play/glow-cave-hops": "Glow Cave Hops — number line game — BrainZippy",
  "/play/cookie-kitchen": "Cookie Kitchen — sharing game — BrainZippy",
  "/grown-ups": "For grown-ups — BrainZippy",
  "/hello": "Welcome — BrainZippy",
  "/map": "Monster Island — BrainZippy",
};

function Router() {
  const { path } = useApp();
  useEffect(() => {
    document.title = TITLES[path] ?? "BrainZippy";
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
  const game = path.match(/^\/play\/([a-z-]+)$/)?.[1];
  const Game = game ? GAMES[game] : undefined;
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
