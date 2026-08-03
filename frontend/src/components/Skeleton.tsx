/** Shimmer placeholders shown while data loads, to avoid the "Loading…" text + layout jump (J). */

export function Skeleton({
  width,
  height,
  radius = 6,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}) {
  return (
    <span
      className={`skeleton${className ? ` ${className}` : ""}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** A grid of card-shaped skeletons, matching the roster / weapon / food list card layout. */
export function CardGridSkeleton({ count = 12, wide = false }: { count?: number; wide?: boolean }) {
  return (
    <div className={`grid${wide ? " wide" : ""}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <Skeleton width={56} height={56} radius={12} />
          <Skeleton width="70%" height={12} />
          <Skeleton width="45%" height={10} />
        </div>
      ))}
    </div>
  );
}

/** A hero banner + a couple of card blocks, for detail pages. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton width="100%" height={140} radius={10} className="skeleton-block" />
      <div className="detail-masonry">
        <Skeleton width="100%" height={220} radius={10} className="skeleton-block" />
        <Skeleton width="100%" height={220} radius={10} className="skeleton-block" />
      </div>
    </div>
  );
}
