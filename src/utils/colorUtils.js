function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Desaturate ~30% and clamp lightness so album colors never go harsh on player controls
export function controlledAccent(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (Math.max(r, g, b) / 255) {
      case r / 255: h = ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6; break;
      case g / 255: h = ((b - r) / 255 / d + 2) / 6; break;
      default:      h = ((r - g) / 255 / d + 4) / 6;
    }
  }
  const ns = Math.max(0, s * 0.7);
  const nl = Math.min(0.6, Math.max(0.45, l));
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let nr, ng, nb;
  if (ns === 0) { nr = ng = nb = nl; }
  else {
    const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns, p = 2 * nl - q;
    nr = hue2rgb(p, q, h + 1/3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1/3);
  }
  return '#' + [nr, ng, nb].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
