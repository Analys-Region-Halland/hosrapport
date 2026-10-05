// kontrast.ts: kontrastförhållande enligt WCAG 2.2 (relativ luminans).
// Används av kontrast.test.ts och den levande stilguiden (WP7). Ägare: WP0.

/** Relativ luminans för en färg som "#RRGGBB". */
export function relativLuminans(hex: string): number {
  const h = hex.replace("#", "");
  const kanal = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(0) + 0.7152 * kanal(2) + 0.0722 * kanal(4);
}

/** Kontrastförhållande mellan två färger, 1–21. */
export function kontrast(a: string, b: string): number {
  const [l1, l2] = [relativLuminans(a), relativLuminans(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
