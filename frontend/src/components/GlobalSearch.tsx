import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCharacters, fetchWeapons, fetchArtifactSets } from "../api";
import { Icon } from "./ui";

interface Hit {
  id: string;
  name: string;
  icon?: string;
}

/** Top-bar search across characters, weapons, and artifact sets (B7). Press "/" to focus. */
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const charsQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: fetchArtifactSets });

  const needle = q.trim().toLowerCase();
  const match = (name: string) => name.toLowerCase().includes(needle);
  const chars: Hit[] = needle ? (charsQ.data ?? []).filter((c) => match(c.name)).slice(0, 6) : [];
  const weapons: Hit[] = needle ? (weaponsQ.data ?? []).filter((w) => match(w.name)).slice(0, 6) : [];
  const sets: Hit[] = needle ? (setsQ.data ?? []).filter((s) => match(s.name)).slice(0, 6) : [];
  const empty = Boolean(needle) && !chars.length && !weapons.length && !sets.length;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (path: string) => {
    setQ("");
    setOpen(false);
    navigate(path);
  };

  const group = (title: string, items: Hit[], to: (id: string) => string) =>
    items.length ? (
      <div className="search-group">
        <div className="search-group-title">{title}</div>
        {items.map((it) => (
          <button key={it.id} className="search-item" onClick={() => go(to(it.id))}>
            <Icon src={it.icon} alt="" size={24} />
            <span>{it.name}</span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="global-search" ref={rootRef}>
      <input
        ref={inputRef}
        className="search"
        value={q}
        placeholder="Search… ( / )"
        aria-label="Global search"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && needle ? (
        <div className="search-results">
          {group("Characters", chars, (id) => `/character/${id}`)}
          {group("Weapons", weapons, (id) => `/weapon/${id}`)}
          {group("Artifacts", sets, (id) => `/artifact/${id}`)}
          {empty ? <div className="muted small search-empty">No matches.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
