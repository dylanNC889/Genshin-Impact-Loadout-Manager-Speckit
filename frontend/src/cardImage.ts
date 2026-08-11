/**
 * Render a shareable build/team card to a PNG via canvas and trigger a download (K). CDN images
 * (enka / Project Amber) send `access-control-allow-origin: *`, so drawing them with
 * crossOrigin="anonymous" keeps the canvas untainted and exportable.
 */

const ELEMENT_COLORS: Record<string, string> = {
  Pyro: "#ec6a4b",
  Hydro: "#4bb7ec",
  Electro: "#b57ee0",
  Cryo: "#7fd5e6",
  Anemo: "#58c0a5",
  Geo: "#e0aa3e",
  Dendro: "#8bc34a",
};

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function download(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/** object-fit: cover for an image into a target rect. `alignY` 0 = top, 0.5 = centre. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  alignY = 0.5,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * alignY, dw, dh);
}

const S = 2; // render at 2× for crispness

export async function downloadCharacterCard(opts: {
  name: string;
  element: string;
  level: number;
  splashUrl: string;
  stats: { label: string; value: string }[];
  weapon?: string;
  set?: string;
}): Promise<void> {
  const W = 600;
  const H = 340;
  const canvas = document.createElement("canvas");
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(S, S);
  const accent = ELEMENT_COLORS[opts.element] ?? "#ffd66b";

  // background
  ctx.fillStyle = "#12131a";
  ctx.fillRect(0, 0, W, H);
  const splash = await loadImage(opts.splashUrl);
  if (splash) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(W * 0.42, 0, W * 0.58, H);
    ctx.clip();
    drawCover(ctx, splash, W * 0.42, 0, W * 0.58, H);
    ctx.restore();
    // left-to-right fade so the text side stays readable
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "#12131a");
    grad.addColorStop(0.5, "rgba(18,19,26,0.55)");
    grad.addColorStop(0.8, "rgba(18,19,26,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  // accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 6, H);

  // name + subtitle
  ctx.fillStyle = "#f2f4fa";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(opts.name, 26, 52);
  ctx.fillStyle = accent;
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillText(`Lv ${opts.level} · ${opts.element}`, 26, 76);

  // stats grid
  ctx.font = "14px system-ui, sans-serif";
  let y = 116;
  for (const s of opts.stats) {
    ctx.fillStyle = "#9aa3ba";
    ctx.fillText(s.label, 26, y);
    ctx.fillStyle = "#f2f4fa";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillText(s.value, 210, y);
    ctx.font = "14px system-ui, sans-serif";
    y += 26;
  }

  // weapon + set
  ctx.fillStyle = "#cfd5e6";
  ctx.font = "13px system-ui, sans-serif";
  if (opts.weapon) ctx.fillText(`⚔ ${opts.weapon}`, 26, H - 40);
  if (opts.set) ctx.fillText(`❖ ${opts.set}`, 26, H - 20);

  // watermark
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Genshin Loadout Manager", W - 178, H - 14);

  download(canvas, `${opts.name.replace(/\s+/g, "-").toLowerCase()}-build.png`);
}

export async function downloadTeamCard(opts: {
  name: string;
  grade: string;
  damage?: number;
  members: { name: string; imageUrl: string }[];
}): Promise<void> {
  const W = 640;
  const H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(S, S);

  ctx.fillStyle = "#12131a";
  ctx.fillRect(0, 0, W, H);

  // title + grade
  ctx.fillStyle = "#f2f4fa";
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillText(opts.name || "Team", 24, 42);
  ctx.fillStyle = "#ffd66b";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillText(`Synergy ${opts.grade}`, 24, 70);
  if (opts.damage) {
    ctx.fillStyle = "#9aa3ba";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(`~${Math.round(opts.damage).toLocaleString()} est. damage`, 180, 70);
  }

  // 4 portraits
  const imgs = await Promise.all(opts.members.slice(0, 4).map((m) => loadImage(m.imageUrl)));
  const slotW = 150;
  const slotH = 195;
  const gap = 8;
  const startX = 24;
  const yTop = 92;
  imgs.forEach((img, i) => {
    const x = startX + i * (slotW + gap);
    ctx.fillStyle = "#1a1c26";
    ctx.fillRect(x, yTop, slotW, slotH);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, yTop, slotW, slotH);
      ctx.clip();
      // Bias toward the top so the face/upper body shows (a little below the very top, which is
      // usually hair/decoration), not the midsection.
      drawCover(ctx, img, x, yTop, slotW, slotH, 0.12);
      ctx.restore();
    }
    // name plate
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, yTop + slotH - 22, slotW, 22);
    ctx.fillStyle = "#f2f4fa";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(opts.members[i]?.name ?? "", x + 8, yTop + slotH - 7);
  });

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Genshin Loadout Manager", W - 178, H - 12);

  download(canvas, `${(opts.name || "team").replace(/\s+/g, "-").toLowerCase()}-team.png`);
}
