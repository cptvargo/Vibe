const cache = new Map();

export async function extractColors(imageUrl) {
  if (!imageUrl) return defaultColors();
  if (cache.has(imageUrl)) return cache.get(imageUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Sample larger area for better color detection
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 128, 128);
      const data = ctx.getImageData(0, 0, 128, 128).data;

      // Fine-grained buckets for better color discrimination
      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue;
        // 16-step quantization — finer than 32, catches more distinct colors
        const r = Math.round(data[i]     / 16) * 16;
        const g = Math.round(data[i + 1] / 16) * 16;
        const b = Math.round(data[i + 2] / 16) * 16;
        const key = `${r},${g},${b}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      // Build full palette sorted by frequency
      const palette = Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20) // top 20 colors
        .map(([key, count]) => {
          const [r, g, b] = key.split(',').map(Number);
          const hsl = rgbToHsl(r, g, b);
          return { r, g, b, hex: rgbToHex(r, g, b), hsl, count };
        });

      // Primary = most dominant color (for background)
      const primary = palette[0] || defaultColors().primary;

      // Vibrant = most saturated color that is visible
      // Lower the saturation threshold so dark albums with subtle color still get picked up
      const vibrant = findVibrant(palette) || boostColor(primary);

      const result = {
        primary,
        vibrant,
        isDark: primary.hsl.l < 0.5,
        palette,
      };

      cache.set(imageUrl, result);
      resolve(result);
    };
    img.onerror = () => resolve(defaultColors());
    img.src = imageUrl;
  });
}

// Smart vibrant finder — progressively relaxes constraints until it finds something
function findVibrant(palette) {
  // Pass 1: ideal — saturated, mid-lightness
  let v = palette.find(c => c.hsl.s > 0.4 && c.hsl.l > 0.2 && c.hsl.l < 0.85);
  if (v) return v;

  // Pass 2: relax saturation threshold
  v = palette.find(c => c.hsl.s > 0.2 && c.hsl.l > 0.15 && c.hsl.l < 0.9);
  if (v) return v;

  // Pass 3: any color that isn't pure black/white/gray
  v = palette.find(c => c.hsl.s > 0.08 && c.hsl.l > 0.1);
  if (v) return v;

  // Pass 4: sort by saturation and just take the most saturated
  const bySaturation = [...palette].sort((a, b) => b.hsl.s - a.hsl.s);
  return bySaturation[0] || null;
}

// If album art is truly monochrome/black, boost the primary color slightly
// so the waveform at least has some visible tint vs pure black
function boostColor(color) {
  const { r, g, b, hsl } = color;
  // Shift lightness up so it's at least somewhat visible
  const boosted = hslToRgb(hsl.h, Math.max(hsl.s, 0.5), 0.55);
  return {
    ...boosted,
    hex: rgbToHex(boosted.r, boosted.g, boosted.b),
    hsl: rgbToHsl(boosted.r, boosted.g, boosted.b),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function defaultColors() {
  return {
    primary: { r: 30, g: 30, b: 40, hex: '#1e1e28', hsl: { h: 0.7, s: 0.1, l: 0.1 } },
    vibrant: { r: 124, g: 58, b: 237, hex: '#7c3aed', hsl: { h: 0.7, s: 0.8, l: 0.6 } },
    isDark: true,
    palette: [],
  };
}
