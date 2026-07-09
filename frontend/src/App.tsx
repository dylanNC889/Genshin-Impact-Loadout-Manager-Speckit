import { lazy, Suspense } from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";

// Route-level code splitting: each page (and the data it pulls in, e.g. the build
// recommendations behind the loadout editor) loads on demand, trimming the initial bundle.
const Roster = lazy(() => import("./pages/Roster").then((m) => ({ default: m.Roster })));
const CharacterPage = lazy(() => import("./pages/Character").then((m) => ({ default: m.CharacterPage })));
const Weapons = lazy(() => import("./pages/Weapons").then((m) => ({ default: m.Weapons })));
const WeaponPage = lazy(() => import("./pages/Weapon").then((m) => ({ default: m.WeaponPage })));
const Artifacts = lazy(() => import("./pages/Artifacts").then((m) => ({ default: m.Artifacts })));
const ArtifactPage = lazy(() => import("./pages/Artifact").then((m) => ({ default: m.ArtifactPage })));
const TeamBuilder = lazy(() => import("./pages/TeamBuilder").then((m) => ({ default: m.TeamBuilder })));
const SavedPage = lazy(() => import("./pages/Saved").then((m) => ({ default: m.SavedPage })));

export function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          ⚔️ Genshin Loadout Manager
        </Link>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end>
            Roster
          </NavLink>
          <NavLink to="/weapons">Weapons</NavLink>
          <NavLink to="/artifacts">Artifacts</NavLink>
          <NavLink to="/team">Team</NavLink>
          <NavLink to="/saved">Saved</NavLink>
        </nav>
        <span className="tag">slice</span>
      </header>
      <main className="main">
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Roster />} />
            <Route path="/weapons" element={<Weapons />} />
            <Route path="/weapon/:id" element={<WeaponPage />} />
            <Route path="/artifacts" element={<Artifacts />} />
            <Route path="/artifact/:id" element={<ArtifactPage />} />
            <Route path="/character/:id" element={<CharacterPage />} />
            <Route path="/team" element={<TeamBuilder />} />
            <Route path="/saved" element={<SavedPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
