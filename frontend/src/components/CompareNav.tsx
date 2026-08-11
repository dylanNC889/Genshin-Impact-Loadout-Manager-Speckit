import { NavLink } from "react-router-dom";

/** Sub-nav shared across the compare pages so builds / characters / weapons / teams are all
 *  reachable from the Compare tab (#28). */
export function CompareNav() {
  return (
    <nav className="compare-nav" aria-label="Compare">
      <NavLink to="/compare" end>
        Builds
      </NavLink>
      <NavLink to="/character-compare">Characters</NavLink>
      <NavLink to="/weapon-compare">Weapons</NavLink>
      <NavLink to="/team-compare">Teams</NavLink>
    </nav>
  );
}
