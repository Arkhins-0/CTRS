/**
 * Generated placeholder artwork for the mock-data top-up (fill-mock.ts).
 *
 * Pure SVG builders, no database and no S3 — so they can be rendered and
 * eyeballed on their own. CTR holds no driver photography and no artwork for
 * most teams/partners; these stand in for it, drawn from each entity's own
 * colour so a portrait matches the card it sits on. They are honest
 * placeholders, not photographs.
 */

export function shade(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  const v = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw.padEnd(6, "0");
  const n = Number.parseInt(v.slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const target = amount < 0 ? 0 : 255;
  const f = Math.min(1, Math.abs(amount));
  const mix = (c: number) =>
    Math.round(c + (target - c) * f)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export function readableOn(hex: string): string {
  const raw = hex.replace("#", "").padEnd(6, "0");
  const n = Number.parseInt(raw.slice(0, 6), 16);
  const luma = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return luma > 150 ? "#0a0a0a" : "#ffffff";
}

/** Stable 0..n-1 from a string, so a driver's helmet never changes on re-run. */
export function pick(seed: string, n: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

/**
 * Helmet-and-shoulders portrait, cut out on transparency — 2:3 with the
 * helmet in the upper two-thirds, which is the crop driver-card.tsx and the
 * standings podium card both take (`object-cover object-top`).
 */
export function driverPortraitSvg(color: string, seed: string): string {
  const dark = shade(color, -0.55);
  const mid = shade(color, -0.25);
  const light = shade(color, 0.35);
  const accents = ["#ffffff", "#f7d619", "#0a0a0a", light];
  const accent = accents[pick(seed, accents.length)];
  const stripe = pick(`${seed}s`, 3);

  const stripes =
    stripe === 0
      ? `<path d="M300 92 q104 0 152 84 l-38 22 q-46-62-114-62 t-114 62 l-38-22 q48-84 152-84Z" fill="${accent}" opacity="0.95"/>`
      : stripe === 1
        ? `<rect x="272" y="94" width="56" height="196" rx="6" fill="${accent}" opacity="0.95"/>`
        : `<path d="M148 250 q152-84 304 0 l0 30 q-152-80-304 0Z" fill="${accent}" opacity="0.9"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="suit" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="shell" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${light}"/><stop offset="0.45" stop-color="${color}"/><stop offset="1" stop-color="${mid}"/>
    </linearGradient>
    <linearGradient id="visor" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0" stop-color="#1b1f27"/><stop offset="0.55" stop-color="#39414f"/><stop offset="1" stop-color="#12151b"/>
    </linearGradient>
  </defs>

  <!-- neck (behind everything, bridges helmet to shoulders) -->
  <rect x="250" y="382" width="100" height="120" rx="26" fill="${shade(color, -0.72)}"/>

  <!-- shoulders / race suit, running off the bottom edge of the frame -->
  <path d="M300 470 c152 0 250 70 272 156 l28 274 -600 0 28-274 c22-86 120-156 272-156Z" fill="url(#suit)"/>
  <!-- collar -->
  <path d="M300 470 c-52 0-94 10-126 27 l0 44 c36-20 78-30 126-30 s90 10 126 30 l0-44 c-32-17-74-27-126-27Z" fill="${shade(color, -0.68)}"/>
  <rect x="96" y="726" width="408" height="12" rx="6" fill="${accent}" opacity="0.45"/>

  <!-- helmet -->
  <path d="M300 74 c102 0 172 74 172 176 c0 82-34 138-86 164 c-26 13-55 20-86 20 s-60-7-86-20 c-52-26-86-82-86-164 c0-102 70-176 172-176Z" fill="url(#shell)"/>
  ${stripes}
  <!-- visor aperture -->
  <path d="M166 252 c30-40 72-62 134-62 s104 22 134 62 l0 64 c-36 30-80 46-134 46 s-98-16-134-46Z" fill="#0d1015"/>
  <path d="M177 258 c28-35 68-54 123-54 s95 19 123 54 l0 54 c-32 26-74 40-123 40 s-91-14-123-40Z" fill="url(#visor)"/>
  <path d="M192 267 c25-27 57-41 95-43 l-86 86 l-9-9Z" fill="#ffffff" opacity="0.16"/>
  <!-- chin bar + vent -->
  <path d="M200 342 c28 22 62 34 100 34 s72-12 100-34 l0 32 c-28 22-62 34-100 34 s-72-12-100-34Z" fill="${dark}"/>
  <rect x="274" y="386" width="52" height="12" rx="6" fill="${shade(color, -0.7)}"/>
</svg>`;
}

/** Team roundel: initials on the team colour — the mark TeamCard fakes in CSS. */
export function markSvg(label: string, color: string, size = 512): string {
  const fg = readableOn(color);
  const fontSize = label.length > 3 ? 118 : label.length > 2 ? 148 : 190;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${shade(color, 0.18)}"/><stop offset="1" stop-color="${shade(color, -0.3)}"/>
  </linearGradient></defs>
  <circle cx="256" cy="256" r="248" fill="url(#g)"/>
  <circle cx="256" cy="256" r="222" fill="none" stroke="${fg}" stroke-opacity="0.3" stroke-width="6"/>
  <text x="256" y="256" text-anchor="middle" dominant-baseline="central"
        font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900"
        font-size="${fontSize}" fill="${fg}" letter-spacing="4">${label}</text>
</svg>`;
}

/** Partner wordmark plate — the name set on a card, no invented logo device. */
export function wordmarkSvg(name: string): string {
  const words = name.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (`${line} ${w}`.trim().length > 18) {
      if (line.trim()) lines.push(line.trim());
      line = w;
    } else line = `${line} ${w}`;
  }
  if (line.trim()) lines.push(line.trim());
  const fontSize = lines.length > 2 ? 46 : 58;
  const startY = 200 - ((lines.length - 1) * (fontSize + 12)) / 2;
  const text = lines
    .map(
      (l, i) =>
        `<text x="400" y="${startY + i * (fontSize + 12)}" text-anchor="middle" dominant-baseline="central" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="${fontSize}" fill="#15151e" letter-spacing="2">${l}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#ffffff"/>
  <rect x="0" y="0" width="800" height="10" fill="#f7d619"/>
  <rect x="0" y="390" width="800" height="10" fill="#f7d619"/>
  ${text}
</svg>`;
}
