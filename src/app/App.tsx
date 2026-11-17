import { Suspense, lazy, useEffect } from "react";
import { AppProvider, useApp } from "./AppContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { AgeScreen, GamesScreen, GrownUpsScreen, HomeScreen } from "./screens";

// Game code + art is lazy-loaded so the home screen stays light.
const CountingAdventure = lazy(() => import("../games/counting-adventure/CountingAdventure"));

const TITLES: Record<string, string> = {
  "/": "BrainZippy — Learning games for kids",
  "/play": "Choose your age — BrainZippy",
  "/play/counting-adventure": "Counting Adventure (ages 4–6) — BrainZippy",
  "/grown-ups": "For grown-ups — BrainZippy",
};

function Router() {
  const { path } = useApp();
  useEffect(() => {
    document.title = TITLES[path] ?? "BrainZippy";
  }, [path]);

  if (path === "/") return <HomeScreen />;
  if (path === "/play") return <AgeScreen />;
  if (path === "/grown-ups") return <GrownUpsScreen />;
  if (path === "/play/counting-adventure")
    return (
      <Suspense fallback={<Loading />}>
        <CountingAdventure />
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
