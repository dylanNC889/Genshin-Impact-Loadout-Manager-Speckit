import { Routes, Route, Link, NavLink } from "react-router-dom";
import { Roster } from "./pages/Roster";
import { CharacterPage } from "./pages/Character";
import { TeamBuilder } from "./pages/TeamBuilder";
import { SavedPage } from "./pages/Saved";

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
          <NavLink to="/team">Team</NavLink>
          <NavLink to="/saved">Saved</NavLink>
        </nav>
        <span className="tag">slice</span>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Roster />} />
          <Route path="/character/:id" element={<CharacterPage />} />
          <Route path="/team" element={<TeamBuilder />} />
          <Route path="/saved" element={<SavedPage />} />
        </Routes>
      </main>
    </div>
  );
}
