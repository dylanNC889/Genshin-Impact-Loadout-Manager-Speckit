import type { ReactNode } from "react";

const ELEMENT_COLORS: Record<string, string> = {
  Pyro: "#ef7a35",
  Hydro: "#4cc2f1",
  Electro: "#b97ce4",
  Cryo: "#7ad6e6",
  Anemo: "#74c2a8",
  Geo: "#f8b53a",
  Dendro: "#a5c83b",
};

/** A titled surface — part of the shared component library / design tokens (Principle III). */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <h2 className="card-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export function ElementBadge({ element }: { element: string }) {
  return (
    <span className="badge" style={{ backgroundColor: ELEMENT_COLORS[element] ?? "#888" }}>
      {element}
    </span>
  );
}

export function RarityStars({ rarity }: { rarity: number }) {
  return (
    <span className="stars" role="img" aria-label={`${rarity}-star rarity`}>
      {"★".repeat(rarity)}
    </span>
  );
}

/** Game asset icon (mihoyo CDN); hides itself if the image fails to load. */
export function Icon({
  src,
  alt,
  size = 40,
  className,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`icon-img${className ? ` ${className}` : ""}`}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
