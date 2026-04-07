const cache = new Map();

export async function extractColors(imageUrl) {
  if (!imageUrl) return defaultColors();
  if (cache.has(imageUrl)) return cache.get(imageUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 64, 64);
      const data    = ctx.getImageData(0, 0, 64, 64).data;
      const buckets = {};

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const r   = Math.round(data[i] / 32) * 32;
        const g   = Math.round(data[i+1] / 32) * 32;
        const b   = Math.round(data[i+2] / 32) * 32;
        const key = `${r},${g},${b}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      const sorted = Object.entries(buckets)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number);
          return { r, g, b, hex: rgbToHex(r, g, b), hsl: rgbToHsl(r, g, b) };
        });

      const primary = sorted[0] || defaultColors().primary;
      const vibrant = sorted.filter(c => c.hsl.s > 0.3 && c.hsl.l > 0.15 && c.hsl.l < 0.85)
        .sort((a, b) => b.hsl.s - a.hsl.s)[0] || primary;

      const result = { primary, vibrant, isDark: primary.hsl.l < 0.5, palette: sorted };
      cache.set(imageUrl, result);
      resolve(result);
    };
    img.onerror = () => resolve(defaultColors());
    img.src = imageUrl;
  });
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
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

function defaultColors() {
  return {
    primary: { r: 30, g: 30, b: 40, hex: '#1e1e28', hsl: { h: 0.7, s: 0.1, l: 0.1 } },
    vibrant: { r: 124, g: 58, b: 237, hex: '#7c3aed', hsl: { h: 0.7, s: 0.8, l: 0.6 } },
    isDark: true, palette: [],
  };
}
