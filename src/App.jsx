import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { VIBE_CONFIG } from "./config/vibeConfig";
import {
  getRecentlyPlayed,
  getRecentlyAdded,
  getRecentPlaylists,
  getTopAlbums,
  getRecentAlbums,
  getMostPlayedThisMonth,
  getPlayHistory,
  getAllGenres,
  getByGenre,
  getVibeRadio,
  getInstantMix,
  getAlbums,
  getAllTracks,
  getAlbumTracks,
  search,
  getImageUrl,
  getAlbumImageUrl,
  getArtistAlbums,
  getArtistTracks,
  getArtistImageUrl,
} from "./api/jellyfin";
import { useVibePlayer } from "./hooks/useVibePlayer";
import { extractColors } from "./utils/colorExtract";

// ─── Shared Color Context ─────────────────────────────────────────────────────
const ColorCtx = createContext({ accent: "#7c3aed", primary: "#0a0a14" });

const VIBE_PURPLE = "#7c3aed";

function ColorProvider({ track, isPlaying, children }) {
  const [lockedAccent, setLockedAccent] = useState(null);
  const [primary, setPrimary] = useState("#0a0a14");
  const pendingId = useRef(null);
  const extractedRef = useRef({ accent: VIBE_PURPLE, primary: "#0a0a14" });

  useEffect(() => {
    if (!track) return;
    const id = track.Id;
    pendingId.current = id;
    extractColors(getAlbumImageUrl(track, 200)).then((c) => {
      if (pendingId.current !== id) return;
      extractedRef.current = {
        accent: c.vibrant?.hex || VIBE_PURPLE,
        primary: c.primary?.hex || "#0a0a14",
      };
      setPrimary(extractedRef.current.primary);
      // Only apply accent when actually playing — no flash on tap
      setLockedAccent(extractedRef.current.accent);
    });
  }, [track?.Id]);

  // Once playing starts, lock in the extracted accent
  useEffect(() => {
    if (isPlaying && extractedRef.current.accent !== VIBE_PURPLE) {
      setLockedAccent(extractedRef.current.accent);
    }
  }, [isPlaying]);

  return (
    <ColorCtx.Provider value={{ accent: lockedAccent || VIBE_PURPLE, primary }}>
      {children}
    </ColorCtx.Provider>
  );
}
const useColors = () => useContext(ColorCtx);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60),
    sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};
const fmtTicks = (t) => fmtTime((t || 0) / 10000000);

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  home: (c) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  ),
  search: (c) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  library: (c) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  prev: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
      <polygon points="19,20 9,12 19,4" />
      <line
        x1="5"
        y1="4"
        x2="5"
        y2="20"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  next: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
      <polygon points="5,4 15,12 5,20" />
      <line
        x1="19"
        y1="4"
        x2="19"
        y2="20"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  play: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={c}>
      <polygon points="6,3 20,12 6,21" />
    </svg>
  ),
  pause: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={c}>
      <rect x="5" y="3" width="4" height="18" rx="1.5" />
      <rect x="15" y="3" width="4" height="18" rx="1.5" />
    </svg>
  ),
  shuffle: (c) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16,3 21,3 21,8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21,16 21,21 16,21" />
      <line x1="15" y1="15" x2="21" y2="21" />
    </svg>
  ),
  repeat: (c) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17,1 21,5 17,9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7,23 3,19 7,15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  volLow: (c) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  ),
  volHigh: (c) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  ),
  chevronDown: (c) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  ),
};

// ─── Album Art ────────────────────────────────────────────────────────────────
function AlbumArt({ track, album, size = 56, radius = 8, style = {} }) {
  const imgUrl = track
    ? getAlbumImageUrl(track, Math.min(size * 2, 800))
    : album
      ? getImageUrl(album.Id, "Primary", size * 2)
      : null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        overflow: "hidden",
        background: "#1a1a2e",
        ...style,
      }}
    >
      {imgUrl && (
        <img
          src={imgUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ isPlaying, accent, progress = 0 }) {
  const canvasRef = useRef(null);
  const shapeRef = useRef(null); // static bar heights, generated once per mount

  // Generate static waveform shape once — never changes, just fills
  useEffect(() => {
    const bars = 64;
    const heights = [];
    for (let i = 0; i < bars; i++) {
      // Natural-looking static waveform using seeded math
      const h =
        Math.abs(Math.sin(i * 0.28)) * 0.35 +
        Math.abs(Math.sin(i * 0.65)) * 0.35 +
        Math.abs(Math.sin(i * 0.12)) * 0.3;
      heights.push(Math.max(0.08, h));
    }
    shapeRef.current = heights;
  }, []);

  // Redraw whenever progress or accent changes — no animation loop needed
  useEffect(() => {
    const canvas = canvasRef.current;
    const heights = shapeRef.current;
    if (!canvas || !heights) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width,
      H = canvas.height;
    const bars = heights.length;
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < bars; i++) {
      const x = i * (W / bars);
      const barW = W / bars - 1.5;
      const h = heights[i] * H * 0.85;
      const y = (H - h) / 2;
      const played = i / bars < progress;
      ctx.fillStyle = played ? accent : `${accent}35`;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, 2);
      ctx.fill();
    }
  }, [progress, accent]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={72}
      style={{ width: "100%", height: 72, display: "block" }}
    />
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────
function TrackRow({ track, onPlay, isActive, index }) {
  return (
    <div
      onClick={() => onPlay(track)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "7px 10px",
        borderRadius: 10,
        cursor: "pointer",
        background: isActive ? "rgba(124,58,237,0.12)" : "transparent",
      }}
    >
      {index !== undefined && (
        <span
          style={{
            width: 20,
            textAlign: "right",
            fontSize: 12,
            color: "#334155",
            flexShrink: 0,
          }}
        >
          {isActive ? "▶" : index + 1}
        </span>
      )}
      <AlbumArt track={track} size={44} radius={6} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? "#a78bfa" : "#f1f5f9",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {track.Name}
          </div>
          {isHot(track.Id) && <HotIcon />}
        </div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>
          {track.AlbumArtist || track.Artists?.[0]} · {track.Album}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#334155", flexShrink: 0 }}>
        {fmtTicks(track.RunTimeTicks)}
      </div>
    </div>
  );
}

// ─── Album Card ───────────────────────────────────────────────────────────────
function AlbumCard({ item, onPlay, size = 150 }) {
  const imgRef = useRef(null);
  const imgUrl = getImageUrl(item.Id, "Primary", size * 2);
  return (
    <div
      onClick={() => onPlay(imgRef.current)}
      style={{ flexShrink: 0, cursor: "pointer", width: size }}
    >
      <div
        ref={imgRef}
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          overflow: "hidden",
          background: "#1e1e2e",
        }}
      >
        <img
          src={imgUrl}
          alt={item.Name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          fontWeight: 500,
          color: "#f1f5f9",
          lineHeight: 1.3,
        }}
      >
        {item.Name}
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
        {item.AlbumArtist || item.Name}
      </div>
    </div>
  );
}

// ─── Station Card ─────────────────────────────────────────────────────────────
function StationCard({ icon, title, subtitle, accent, onPlay }) {
  return (
    <div
      onClick={onPlay}
      style={{
        flexShrink: 0,
        width: 160,
        borderRadius: 14,
        padding: 16,
        background: `linear-gradient(135deg, ${accent}28, ${accent}0a)`,
        border: `1px solid ${accent}30`,
        cursor: "pointer",
      }}
    >
      {/* Premium SVG icon with accent glow */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          marginBottom: 12,
          background: `${accent}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 16px ${accent}33`,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={accent}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#f1f5f9",
          marginBottom: 3,
          letterSpacing: -0.2,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
        {subtitle}
      </div>
    </div>
  );
}

function ScrollRow({ children, gap = 16 }) {
  return (
    <div
      style={{
        display: "flex",
        gap,
        overflowX: "auto",
        paddingBottom: 8,
        scrollbarWidth: "none",
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 700,
          color: "#f1f5f9",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: "flex", gap: 6, padding: "16px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#7c3aed",
            animation: `vbounce 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes vbounce{from{transform:translateY(0);opacity:.4}to{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  );
}

// ─── Mini Player ─────────────────────────────────────────────────────────────
function MiniPlayer({
  track,
  isPlaying,
  progress,
  onToggle,
  onNext,
  onPrev,
  onExpand,
}) {
  const { accent } = useColors(); // dynamic accent color
  if (!track) return null;
  return (
    <div
      data-miniplayer="true"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 700,
        background: "rgba(12,12,20,0.96)",
        backdropFilter: "blur(24px)",
        borderRadius: 18,
        border: `1px solid ${accent}30`,
        boxShadow: `0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px ${accent}12`,
        zIndex: 100,
        padding: "10px 14px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div onClick={onExpand} style={{ cursor: "pointer", flexShrink: 0 }}>
        <AlbumArt track={track} size={44} radius={8} />
      </div>
      <div
        onClick={onExpand}
        style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#f1f5f9",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.Name}
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {track.AlbumArtist || track.Artists?.[0]}
        </div>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
          }}
        >
          {Icons.prev("#94a3b8")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: accent,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 20px ${accent}60`,
            flexShrink: 0,
          }}
        >
          {isPlaying ? Icons.pause("#fff") : Icons.play("#fff")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
          }}
        >
          {Icons.next("#94a3b8")}
        </button>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 16,
          right: 16,
          height: 2,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            height: "100%",
            background: accent,
            borderRadius: 2,
            width: `${progress * 100}%`,
            transition: "width 0.25s linear",
          }}
        />
      </div>
    </div>
  );
}

// ─── Drag-to-Close Hook ──────────────────────────────────────────────────────
// Works from ANYWHERE on the player — album art, track info, anywhere.
// Scroll conflict resolution:
//   - If scrollTop > 0: let scroll happen, don't activate drag
//   - If scrollTop === 0 and gesture is downward: activate drag, lock scroll
//   - Grab handle always activates drag regardless of scrollTop
// Velocity + threshold close. GPU transform only. Snap-back spring.
function useDragToClose(onClose, scrollRef) {
  const elRef = useRef(null);
  const startY = useRef(0);
  const startTime = useRef(0);
  const dragging = useRef(false);
  const frameRef = useRef(null);

  const setStyle = useCallback((y, transition) => {
    const el = elRef.current;
    if (!el) return;
    el.style.transition = transition || "none";
    el.style.transform = `translateY(${Math.max(0, y)}px)`;
    el.style.borderRadius =
      y > 8
        ? `${Math.min(y * 0.15, 20)}px ${Math.min(y * 0.15, 20)}px 0 0`
        : "0";
  }, []);

  const onPointerDown = useCallback((e) => {
    dragging.current = false;
    startY.current = e.clientY;
    startTime.current = Date.now();
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const delta = e.clientY - startY.current;
      const scrollTop = scrollRef.current?.scrollTop ?? 0;

      const DRAG_THRESHOLD = 12;

      // Only START drag if:
      // - pulling DOWN
      // - at top
      // - passed threshold
      if (!dragging.current) {
        if (delta > DRAG_THRESHOLD && scrollTop <= 0) {
          dragging.current = true;
        } else {
          return; // let scroll happen naturally
        }
      }

      // Once dragging has started, continue freely
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => setStyle(delta));
    },
    [setStyle, scrollRef],
  );

  const onPointerUp = useCallback(
    (e) => {
      cancelAnimationFrame(frameRef.current);

      if (!dragging.current) return;
      dragging.current = false;

      const delta = e.clientY - startY.current;
      const elapsed = Math.max(Date.now() - startTime.current, 1);
      const velocity = delta / elapsed;

      if (velocity > 0.3 || delta > 80) {
        setStyle(
          window.innerHeight,
          "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        );
        setTimeout(onClose, 300);
      } else {
        setStyle(0, "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)");
      }
    },
    [setStyle, onClose],
  );

  const onHandlePointerDown = onPointerDown;

  return {
    elRef,
    onHandlePointerDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

// ─── Full Player ──────────────────────────────────────────────────────────────
// Color pipeline helpers — album color influences but never dominates
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
function controlledAccent(hex) {
  // Desaturate ~30% and clamp lightness — so controls never go red/harsh
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255,
    min = Math.min(r, g, b) / 255;
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (Math.max(r, g, b) / 255) {
      case r / 255:
        h = ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6;
        break;
      case g / 255:
        h = ((b - r) / 255 / d + 2) / 6;
        break;
      default:
        h = ((r - g) / 255 / d + 4) / 6;
    }
  }
  // Reduce sat by 30%, clamp lightness 0.45-0.60
  const ns = Math.max(0, s * 0.7);
  const nl = Math.min(0.6, Math.max(0.45, l));
  // Convert back
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let nr, ng, nb;
  if (ns === 0) {
    nr = ng = nb = nl;
  } else {
    const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns,
      p = 2 * nl - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }
  return (
    "#" +
    [nr, ng, nb]
      .map((x) =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function FullPlayer({
  track,
  isPlaying,
  progress,
  currentTime,
  duration,
  volume,
  isShuffle,
  repeatMode,
  onToggle,
  onNext,
  onPrev,
  onSeek,
  onVolume,
  onShuffle,
  onRepeat,
  onClose,
  getWaveform,
  queue,
  queueIndex,
  onPlayAt,
  isExpanded,
}) {
  const { accent: rawAccent, primary: rawPrimary } = useColors();
  const scrollRef = useRef(null);
  const {
    elRef,
    onHandlePointerDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useDragToClose(onClose, scrollRef);

  // Controlled colors — album art influences but never dominates
  const accent = controlledAccent(rawAccent); // desaturated, clamped
  const bgColor = "#0a0a14"; // always Vibe dark — no album color flash

  // Clear CSS animation after slide-up completes so drag transform works cleanly
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onEnd = () => {
      el.style.animation = "none";
      el.style.transform = "translateY(0)";
    };
    el.addEventListener("animationend", onEnd, { once: true });
    return () => el.removeEventListener("animationend", onEnd);
  }, []);

  // Scroll to top only on mount — never on track change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!track) return null;

  // Repeat indicator
  const repeatAll =
    repeatMode === "all" || (repeatMode !== "none" && repeatMode !== "one");
  const repeatOne = repeatMode === "one";

  // Control icon colors — NEVER use album color directly
  const ctrlDim = "rgba(255,255,255,0.35)";
  const ctrlActive = "rgba(255,255,255,0.90)";

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        backgroundColor: "#000",
        willChange: "transform",
        overscrollBehavior: "contain",
        contain: "paint",
        touchAction: "pan-y",
        animation: "vibeSlideUp 0.38s cubic-bezier(0.32,0.72,0,1) both",
        // 'both' fill mode ensures translateY(100%) before animation starts — no library peek
      }}
    >
      <style>{`
        @keyframes vibeSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Background — solid base + controlled gradient layered on top */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundColor: "#000",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: `linear-gradient(to bottom, ${bgColor}58 0%, rgba(0,0,0,0.92) 55%, #080810 100%)`,
          transition: "background 600ms ease",
        }}
      />
      {/* Subtle accent glow at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 320,
          zIndex: 0,
          background: `radial-gradient(ellipse at 50% -20%, ${accent}22 0%, transparent 70%)`,
          transition: "background 300ms ease",
          pointerEvents: "none",
        }}
      />

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          touchAction: "pan-y",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 24px 48px",
          }}
        >
          {/* Grab handle */}
          <div
            onPointerDown={onHandlePointerDown}
            style={{
              width: "100%",
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "10px auto 20px",
              cursor: "grab",
              flexShrink: 0,
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.18)",
              }}
            />
          </div>

          {/* Album Art — breathes when playing */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              width: "100%",
              aspectRatio: "1/1",
              borderRadius: 18,
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)`,
              marginBottom: 28,
              transform: isPlaying ? "scale(1)" : "scale(0.95)",
              transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
              touchAction: "none",
            }}
          >
            <AlbumArt
              track={track}
              size={480}
              radius={18}
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          {/* Track info — strict color hierarchy */}
          <div style={{ width: "100%", marginBottom: 20, textAlign: "left" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: -0.5,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {track.Name}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                marginTop: 5,
                letterSpacing: 0.1,
              }}
            >
              {track.AlbumArtist || track.Artists?.[0]}
              {track.Album ? (
                <span style={{ color: "rgba(255,255,255,0.3)" }}>
                  {" "}
                  · {track.Album}
                </span>
              ) : null}
            </div>
          </div>

          {/* Waveform */}
          <div style={{ width: "100%", marginBottom: 4 }}>
            <Waveform
              isPlaying={isPlaying}
              accent={accent}
              progress={progress}
              getWaveform={getWaveform}
            />
          </div>

          {/* Seek bar + timestamps */}
          <div style={{ width: "100%", marginBottom: 28 }}>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: accent }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginTop: 4,
                letterSpacing: 0.3,
              }}
            >
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: 32,
            }}
          >
            {/* Shuffle */}
            <button
              onClick={onShuffle}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              {Icons.shuffle(isShuffle ? ctrlActive : ctrlDim)}
              {isShuffle && (
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: ctrlActive,
                  }}
                />
              )}
            </button>

            {/* Prev */}
            <button
              onClick={onPrev}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                width: 52,
                height: 52,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {Icons.prev("rgba(255,255,255,0.85)")}
            </button>

            {/* Play / Pause — primary action, uses controlled accent */}
            <button
              onClick={onToggle}
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: accent,
                border: "none",
                cursor: "pointer",
                boxShadow: `0 0 32px ${accent}66, 0 4px 20px rgba(0,0,0,0.4)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.1s, box-shadow 0.2s",
              }}
            >
              {isPlaying ? Icons.pause("#fff") : Icons.play("#fff")}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                width: 52,
                height: 52,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {Icons.next("rgba(255,255,255,0.85)")}
            </button>

            {/* Repeat — with cycle indicator */}
            <button
              onClick={onRepeat}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              {Icons.repeat(repeatAll || repeatOne ? ctrlActive : ctrlDim)}
              {repeatOne && (
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: ctrlActive,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#080810",
                  }}
                >
                  1
                </div>
              )}
              {repeatAll && (
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: ctrlActive,
                  }}
                />
              )}
            </button>
          </div>

          {/* Volume */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              marginBottom: 4,
            }}
          >
            {Icons.volLow("rgba(255,255,255,0.3)")}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: accent }}
            />
            {Icons.volHigh("rgba(255,255,255,0.3)")}
          </div>

          {/* Up Next — visually secondary */}
          {queue?.length > 1 && (
            <QueueTrackList
              queue={queue}
              queueIndex={queueIndex}
              currentTrackId={track?.Id}
              accent={accent}
              onPlayAt={onPlayAt}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Player Sheet ────────────────────────────────────────────────────────────
// Pure passthrough — FullPlayer handles all its own background and animation
function PlayerSheet({ children }) {
  return <>{children}</>;
}

// ─── Album Detail ─────────────────────────────────────────────────────────────
function AlbumDetail({ album, onClose, onArtistSelect, player }) {
  const [tracks, setTracks] = useState([]);
  const [colors, setColors] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    getAlbumTracks(album.Id).then((r) => {
      setTracks(r.Items || []);
      setLoading(false);
    });
    extractColors(getImageUrl(album.Id, "Primary", 400)).then(setColors);
  }, [album.Id]);

  const accent = colors?.vibrant?.hex || "#7c3aed";
  const primary = colors?.primary?.hex || "#0a0a14";
  const imgUrl = getImageUrl(album.Id, "Primary", 600);
  const total = tracks.reduce((s, t) => s + (t.RunTimeTicks || 0), 0);

  const playAll = (idx = 0) => {
    player.play(tracks, idx);
    player.setPlayerExpanded(true);
    onClose();
  };
  const playShuffle = () => {
    player.play(
      [...tracks].sort(() => Math.random() - 0.5),
      0,
    );
    player.setPlayerExpanded(true);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      <PageTransition>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#080810",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingTop: "env(safe-area-inset-top)",
            }}
          >
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.3,
                  filter: "blur(40px)",
                  transform: "scale(1.1)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, ${primary}99 0%, #080810 100%)`,
                }}
              />
            </div>
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "calc(16px + env(safe-area-inset-top))",
                left: 16,
                zIndex: 10,
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(10px)",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {Icons.chevronDown("#f1f5f9")}
            </button>
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "60px 24px 0",
              }}
            >
              <div
                style={{
                  width: "65%",
                  maxWidth: 260,
                  aspectRatio: "1/1",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: `0 24px 60px ${accent}44`,
                  marginBottom: 20,
                }}
              >
                <img
                  src={imgUrl}
                  alt={album.Name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#f8fafc",
                  textAlign: "center",
                  letterSpacing: -0.5,
                }}
              >
                {album.Name}
              </h1>
              <p
                onClick={() =>
                  onArtistSelect?.({
                    Id: album.AlbumArtistId,
                    Name: album.AlbumArtist,
                  })
                }
                style={{
                  margin: "6px 0 0",
                  fontSize: 15,
                  color: "rgba(255,255,255,0.65)",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {album.AlbumArtist}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {album.ProductionYear && `${album.ProductionYear} · `}
                {tracks.length} songs · {fmtTicks(total)}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 20,
                  marginBottom: 8,
                }}
              >
                <button
                  onClick={() => playAll(0)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 28px",
                    background: accent,
                    border: "none",
                    borderRadius: 30,
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    boxShadow: `0 4px 24px ${accent}55`,
                  }}
                >
                  {Icons.play("#fff")} Play
                </button>
                <button
                  onClick={playShuffle}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 22px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 30,
                    cursor: "pointer",
                    color: "#f1f5f9",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {Icons.shuffle("#f1f5f9")} Shuffle
                </button>
              </div>
            </div>
          </div>
          <div style={{ padding: "16px 16px 120px" }}>
            {loading ? (
              <Loader />
            ) : (
              tracks.map((t, i) => (
                <div
                  key={t.Id}
                  onClick={() => playAll(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background:
                      player.currentTrack?.Id === t.Id
                        ? `${accent}18`
                        : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{ width: 24, textAlign: "center", flexShrink: 0 }}
                  >
                    {player.currentTrack?.Id === t.Id ? (
                      <span style={{ color: accent, fontSize: 14 }}>▶</span>
                    ) : (
                      <span style={{ fontSize: 13, color: "#334155" }}>
                        {t.IndexNumber || i + 1}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color:
                          player.currentTrack?.Id === t.Id ? "#fff" : "#f1f5f9",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.Name}
                    </div>
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#334155", flexShrink: 0 }}
                  >
                    {fmtTicks(t.RunTimeTicks)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

// ─── Artist Detail ────────────────────────────────────────────────────────────
function ArtistDetail({ artist, onClose, onAlbumSelect, player }) {
  const [albums, setAlbums] = useState([]);
  const [colors, setColors] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    getArtistAlbums(artist.Id).then((r) => {
      setAlbums(r.Items || []);
      setLoading(false);
    });
    // Try local artist image first, then Jellyfin image for color extraction
    const localUrl = `/artists/${artist.Name}.jpg`;
    const img = new Image();
    img.onload = () => extractColors(localUrl).then(setColors);
    img.onerror = () => {
      // Fall back to first album art for color if no local image
      getArtistAlbums(artist.Id).then((r) => {
        if (r.Items?.[0])
          extractColors(getImageUrl(r.Items[0].Id, "Primary", 200)).then(
            setColors,
          );
      });
    };
    img.src = localUrl;
  }, [artist.Id]);

  const accent = "#7c3aed"; // Always Vibe purple — consistent brand
  const primary = colors?.primary?.hex || "#0a0a14";

  const playAll = async () => {
    const r = await getArtistTracks(artist.Id, 100);
    if (!r.Items?.length) return;
    player.play(r.Items, 0);
    player.setPlayerExpanded(true);
    onClose();
  };
  const playShuffle = async () => {
    const r = await getArtistTracks(artist.Id, 100);
    if (!r.Items?.length) return;
    player.play(
      [...r.Items].sort(() => Math.random() - 0.5),
      0,
    );
    player.setPlayerExpanded(true);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      <PageTransition>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#080810",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          {colors && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: 500,
                background: `radial-gradient(ellipse at 50% 0%, ${accent}18, transparent 70%)`,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}

          {/* Hero */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 420,
              overflow: "hidden",
            }}
          >
            <img
              src={`/artists/${artist.Name}.jpg`}
              alt={artist.Name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 20%",
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(8,8,16,0.7) 65%, #080810 100%), linear-gradient(to right, rgba(8,8,16,0.4), transparent 40%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 120,
                background: `linear-gradient(to top, ${accent}18, transparent)`,
                mixBlendMode: "screen",
              }}
            />
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "calc(14px + env(safe-area-inset-top))",
                left: 16,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              {Icons.chevronDown("#f1f5f9")}
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "0 20px 22px",
                zIndex: 5,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 3,
                  borderRadius: 2,
                  background: accent,
                  marginBottom: 10,
                  boxShadow: `0 0 12px ${accent}88`,
                }}
              />
              <h1
                style={{
                  margin: 0,
                  fontSize: 38,
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: -1.5,
                  lineHeight: 1,
                  textShadow: `0 2px 32px rgba(0,0,0,0.9)`,
                }}
              >
                {artist.Name}
              </h1>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 500,
                  letterSpacing: 0.5,
                }}
              >
                {albums.length} {albums.length === 1 ? "ALBUM" : "ALBUMS"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              padding: "20px 20px 12px",
              display: "flex",
              gap: 12,
              position: "relative",
              zIndex: 1,
            }}
          >
            <button
              onClick={playAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "13px 30px",
                background: accent,
                border: "none",
                borderRadius: 30,
                cursor: "pointer",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                boxShadow: `0 4px 28px ${accent}66`,
              }}
            >
              {Icons.play("#fff")} Play All
            </button>
            <button
              onClick={playShuffle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 22px",
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${accent}30`,
                borderRadius: 30,
                cursor: "pointer",
                color: "#f1f5f9",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {Icons.shuffle("#f1f5f9")} Shuffle
            </button>
          </div>

          {/* Similar Artists */}
          <SimilarArtists artist={artist} onArtistSelect={onAlbumSelect} />

          {/* Albums */}
          <div
            style={{
              padding: "8px 20px 40px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 16,
                  borderRadius: 2,
                  background: accent,
                }}
              />
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#f1f5f9",
                }}
              >
                Discography
              </h2>
            </div>
            {loading ? (
              <Loader />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 16,
                }}
              >
                {albums.map((album) => (
                  <div
                    key={album.Id}
                    onClick={() => onAlbumSelect?.(album)}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#1e1e2e",
                        marginBottom: 8,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                      }}
                    >
                      <img
                        src={getImageUrl(album.Id, "Primary", 400)}
                        alt={album.Name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#f1f5f9",
                        lineHeight: 1.3,
                      }}
                    >
                      {album.Name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#475569", marginTop: 2 }}
                    >
                      {album.ProductionYear || ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

// ─── Hot Track Store ─────────────────────────────────────────────────────────
// Tracks play counts in localStorage. A track is "hot" after 5+ plays.
const HOT_THRESHOLD = 5;
const getPlayCounts = () => {
  try {
    return JSON.parse(localStorage.getItem("vibe_play_counts") || "{}");
  } catch (e) {
    return {};
  }
};
const recordPlay = (trackId) => {
  try {
    const counts = getPlayCounts();
    counts[trackId] = (counts[trackId] || 0) + 1;
    localStorage.setItem("vibe_play_counts", JSON.stringify(counts));
    return counts[trackId];
  } catch (e) {
    return 0;
  }
};
const isHot = (trackId) => (getPlayCounts()[trackId] || 0) >= HOT_THRESHOLD;

// Hot fire icon — shown next to track name
function HotIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0, marginLeft: 4 }}
    >
      <path
        d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-3-2-6-2-6s-1 3-3 3c-1.1 0-2-.9-2-2 0-2 2-6 2-8z"
        fill="#ef4444"
        opacity="0.9"
      />
      <path
        d="M12 14c-.6 0-1-.4-1-1 0-1 1-3 1-3s1 2 1 3c0 .6-.4 1-1 1z"
        fill="#fbbf24"
      />
    </svg>
  );
}

// ─── Queue Track List (Album Picker inside FullPlayer) ────────────────────────
function QueueTrackList({
  queue,
  queueIndex,
  currentTrackId,
  accent,
  onPlayAt,
}) {
  const activeRef = useRef(null);
  // No auto-scroll — user controls scrolling

  if (!queue?.length) return null;

  return (
    <div style={{ width: "100%", marginTop: 28 }}>
      {/* Section header — secondary, low contrast */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          Up Next
        </span>
      </div>

      {/* Track list — own scroll container, isolated from player drag */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          borderRadius: 12,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {queue.map((t, i) => {
          // Source of truth: player.currentTrack.Id — not index, not position
          const active = t.Id === currentTrackId;
          const played = i < queueIndex;
          const hot = isHot(t.Id);
          const imgUrl = getAlbumImageUrl(t, 80);

          return (
            <div
              key={`q-${t.Id}-${i}`}
              ref={active ? activeRef : null}
              onClick={() => onPlayAt(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                cursor: "pointer",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                transition: "background 0.15s",
                opacity: played ? 0.4 : 1,
              }}
            >
              {/* Album art thumbnail */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#1e1e2e",
                  position: "relative",
                  boxShadow: active ? `0 0 0 2px ${accent}` : "none",
                }}
              >
                <img
                  src={imgUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                {/* Playing indicator overlay */}
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `${accent}55`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
                      <polygon points="6,3 20,12 6,21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Track info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(255,255,255,0.55)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.Name}
                  </span>
                  {hot && <HotIcon />}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.3)",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.AlbumArtist || t.Artists?.[0]}
                </div>
              </div>

              {/* Duration */}
              <div
                style={{
                  fontSize: 11,
                  color: "#334155",
                  flexShrink: 0,
                  letterSpacing: 0.3,
                }}
              >
                {fmtTicks(t.RunTimeTicks)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Similar Artists Section ──────────────────────────────────────────────────
function SimilarArtists({ artist, onArtistSelect }) {
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    if (!artist?.Id) return;
    const find = async () => {
      try {
        const { serverUrl, token, userId } = VIBE_CONFIG;
        const res = await fetch(
          `${serverUrl}/Artists/${artist.Id}/Similar?UserId=${userId}&Limit=8&Fields=PrimaryImageAspectRatio`,
          { headers: { "X-Emby-Token": token } },
        );
        if (res.ok) {
          const data = await res.json();
          setSimilar((data.Items || []).filter((a) => a.Id !== artist.Id));
        }
      } catch (e) {}
    };
    find();
  }, [artist?.Id]);

  if (!similar.length) return null;

  return (
    <div
      style={{
        padding: "0 20px",
        marginTop: 8,
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            background: "#7c3aed",
          }}
        />
        <h2
          style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}
        >
          Similar Artists
        </h2>
      </div>
      <div
        style={{
          display: "flex",
          gap: 20,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "none",
        }}
      >
        {similar.map((a) => (
          <div
            key={a.Id}
            onClick={() => onArtistSelect?.({ Id: a.Id, Name: a.Name })}
            style={{
              flexShrink: 0,
              width: 80,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#1e1e2e",
                marginBottom: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              <img
                src={`/artists/${a.Name}.jpg`}
                alt={a.Name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 20%",
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#e2e8f0",
                lineHeight: 1.3,
              }}
            >
              {a.Name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page Transition ─────────────────────────────────────────────────────────
// Slides up from bottom — matches player open motion, no opacity flash
function PageTransition({ children }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        animation: "vibeSlideUp 0.36s cubic-bezier(0.32,0.72,0,1) both",
      }}
    >
      {children}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavBar({ active, onChange, blocked = false }) {
  const items = [
    { id: "home", label: "Home", icon: Icons.home },
    { id: "search", label: "Search", icon: Icons.search },
    { id: "library", label: "Library", icon: Icons.library },
  ];
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(8,8,16,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        paddingTop: "env(safe-area-inset-top)",
        pointerEvents: blocked ? "none" : "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          height: 56,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: -1,
            marginRight: 28,
            background: "linear-gradient(135deg, #f8fafc 30%, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Vibe
        </div>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {items.map((item) => {
            const on = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                style={{
                  background: on ? "rgba(124,58,237,0.15)" : "none",
                  border: "none",
                  borderRadius: 8,
                  color: on ? "#a78bfa" : "#475569",
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {item.icon(on ? "#a78bfa" : "#475569")}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Track List Page — full screen dedicated page ────────────────────────────
function TrackListPage({ title, tracks, onClose, player, playAndExpand }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const month = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      <PageTransition>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#080810",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          {/* Header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "rgba(8,8,16,0.92)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "calc(env(safe-area-inset-top) + 14px) 20px 14px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  letterSpacing: -0.3,
                }}
              >
                {title}
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>
                {tracks.length} songs
              </div>
            </div>
          </div>

          {/* Play All bar */}
          <div style={{ padding: "16px 20px 8px", display: "flex", gap: 10 }}>
            <button
              onClick={() => playAndExpand(tracks, 0)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                background: "#7c3aed",
                border: "none",
                borderRadius: 30,
                cursor: "pointer",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 20px #7c3aed44",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <polygon points="6,3 20,12 6,21" />
              </svg>
              Play All
            </button>
            <button
              onClick={() =>
                playAndExpand(
                  [...tracks].sort(() => Math.random() - 0.5),
                  0,
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 30,
                cursor: "pointer",
                color: "#f1f5f9",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16,3 21,3 21,8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21,16 21,21 16,21" />
                <line x1="15" y1="15" x2="21" y2="21" />
              </svg>
              Shuffle
            </button>
          </div>

          {/* Track list */}
          <div style={{ padding: "8px 16px 120px" }}>
            {tracks.map((t, i) => (
              <TrackRow
                key={`${t.Id}-${i}`}
                track={t}
                index={i}
                onPlay={() => playAndExpand(tracks, i)}
                isActive={player.currentTrack?.Id === t.Id}
              />
            ))}
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

// ─── Most Played Section ──────────────────────────────────────────────────────
function MostPlayedSection({ tracks, player, onPlay, onViewAll }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            color: "#f1f5f9",
            letterSpacing: -0.3,
          }}
        >
          Most Played · This Month
        </h2>
        {tracks.length > 4 && (
          <button
            onClick={() => onViewAll?.(tracks)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "#7c3aed",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 0",
            }}
          >
            All {tracks.length}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {tracks.slice(0, 4).map((t, i) => (
          <TrackRow
            key={t.Id}
            track={t}
            index={i}
            onPlay={() => onPlay(tracks, i)}
            isActive={player.currentTrack?.Id === t.Id}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeView({
  player,
  onAlbumSelect,
  onArtistSelect,
  playAndExpand,
  recentArtists = [],
  onViewMostPlayed,
  onViewHistory,
}) {
  const [recentPlayed, setRecentPlayed] = useState([]);
  const [recentAdded, setRecentAdded] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [recentAlbums, setRecentAlbums] = useState([]);
  const [mostPlayed, setMostPlayed] = useState([]);
  const [history, setHistory] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreTracks, setGenreTracks] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rp, ra, pl, ta, ral, mp, h, g] = await Promise.all([
          getRecentlyPlayed(12),
          getRecentlyAdded(12),
          getRecentPlaylists(6),
          getTopAlbums(12),
          getRecentAlbums(12),
          getMostPlayedThisMonth(12),
          getPlayHistory(20),
          getAllGenres(),
        ]);
        setRecentPlayed(rp.Items || []);
        const uniqueAlbums = [
          ...new Map(
            (ra.Items || []).map((t) => [t.AlbumId || t.Album, t]),
          ).values(),
        ];

        setRecentAdded(uniqueAlbums);
        setPlaylists(pl.Items || []);
        setTopAlbums(ta.Items || []);
        setRecentAlbums(ral.Items || []);
        setMostPlayed(mp.Items || []);
        setHistory(h.Items || []);
        setGenres((g.Items || []).slice(0, 8));
        if (g.Items?.length) {
          setActiveGenre(g.Items[0].Name);
          const gt = await getByGenre(g.Items[0].Name, 8);
          setGenreTracks(gt.Items || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenre = async (name) => {
    setActiveGenre(name);
    const gt = await getByGenre(name, 8);
    setGenreTracks(gt.Items || []);
  };
  const playTracks = (tracks, idx = 0) => playAndExpand(tracks, idx);
  const playAlbum = async (album, originEl) => {
    const r = await getAlbumTracks(album.Id);
    if (r.Items?.length) playAndExpand(r.Items, 0, originEl);
  };
  const playRadio = async () => {
    const r = await getVibeRadio(100);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };
  const playMix = async (id) => {
    const r = await getInstantMix(id, 50);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading)
    return (
      <div style={{ padding: "32px 0" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: 8,
          }}
        >
          {greeting}, Zeus 👋
        </h1>
        <Loader />
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: "#f8fafc",
            letterSpacing: -0.8,
          }}
        >
          {greeting}, Zeus 👋
        </h1>
        <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 14 }}>
          Ready to vibe?
        </p>
      </div>

      {recentPlayed.length > 0 && (
        <div>
          <SectionHeader title="Recently Played" />
          <ScrollRow gap={12}>
            {recentPlayed.map((t, i) => {
              const timeAgo = (() => {
                const raw = t.UserData?.LastPlayedDate || t.LastPlayedDate;
                if (!raw) return null;
                const diff = Math.floor((Date.now() - new Date(raw)) / 1000);
                if (diff < 60) return "Just now";
                if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                return `${Math.floor(diff / 86400)}d ago`;
              })();

              // Determine card type — artist, album, or track
              const isArtist = t.Type === "MusicArtist";
              const isAlbum = t.Type === "MusicAlbum";
              const isTrack = t.Type === "Audio" || (!isArtist && !isAlbum);

              const imgUrl = isArtist
                ? `/artists/${t.Name}.jpg`
                : isAlbum
                  ? getImageUrl(t.Id, "Primary", 280)
                  : getAlbumImageUrl(t, 280);

              const label = t.Name;
              const sublabel = isArtist
                ? timeAgo || ""
                : isAlbum
                  ? t.AlbumArtist || ""
                  : t.AlbumArtist || t.Artists?.[0] || "";
              const isActive = isTrack && player.currentTrack?.Id === t.Id;

              const handleClick = () => {
                if (isArtist) onArtistSelect?.({ Id: t.Id, Name: t.Name });
                else if (isAlbum) onAlbumSelect?.(t);
                else {
                  // Play this track and open player — like Plexamp
                  const audioTracks = recentPlayed.filter(
                    (x) => x.Type === "Audio" || !x.Type,
                  );
                  const trackIdx = audioTracks.findIndex((x) => x.Id === t.Id);
                  playAndExpand(audioTracks, trackIdx >= 0 ? trackIdx : 0);
                }
              };

              return (
                <div
                  key={`${t.Id}-${i}`}
                  onClick={handleClick}
                  style={{ flexShrink: 0, width: 140, cursor: "pointer" }}
                >
                  {/* Art — circle for artist, rounded square for album/track */}
                  <div
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: isArtist ? "50%" : 12,
                      overflow: "hidden",
                      background: "#1e1e2e",
                      marginBottom: 8,
                      boxShadow: isActive ? "0 0 0 2px #7c3aed" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={label}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: isArtist ? "center 20%" : "center",
                      }}
                      onError={(e) => {
                        if (isArtist) {
                          e.target.src = `/artists/${encodeURIComponent(t.Name)}.jpg`;
                          e.target.onerror = () => {
                            e.target.style.display = "none";
                          };
                        } else {
                          e.target.style.display = "none";
                        }
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: isActive ? "#a78bfa" : "#f1f5f9",
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sublabel}
                    {timeAgo ? ` · ${timeAgo}` : ""}
                  </div>
                </div>
              );
            })}
          </ScrollRow>
        </div>
      )}

      {recentArtists.length > 0 && (
        <div>
          <SectionHeader title="Recent Artists" />
          <ScrollRow gap={20}>
            {recentArtists.map((a) => (
              <div
                key={a.Id}
                onClick={() => onArtistSelect?.({ Id: a.Id, Name: a.Name })}
                style={{
                  flexShrink: 0,
                  width: 90,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#1e1e2e",
                    marginBottom: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <img
                    src={`/artists/${a.Name}.jpg`}
                    alt={a.Name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center 20%",
                    }}
                    onError={(e) => {
                      e.target.src = `/artists/${encodeURIComponent(a.Name)}.jpg`;
                      e.target.onerror = () => {
                        e.target.style.display = "none";
                      };
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f1f5f9",
                    lineHeight: 1.3,
                  }}
                >
                  {a.Name}
                </div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {recentAdded.length > 0 && (
        <div>
          <SectionHeader title="Recently Added in Vibe" />
          <ScrollRow>
            {recentAdded.map((t) => (
              <div key={t.Id} style={{ flexShrink: 0, width: 130 }}>
                <AlbumCard
                  item={{
                    Id: t.AlbumId || t.Id,
                    Name: t.Album || t.Name,
                    AlbumArtist: t.AlbumArtist,
                  }}
                  size={130}
                  onPlay={() =>
                    t.AlbumId
                      ? playAlbum({ Id: t.AlbumId })
                      : playTracks([t], 0)
                  }
                />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      <div>
        <SectionHeader title="Stations" />
        <ScrollRow gap={12}>
          {/* Mic — Artist Mix */}
          <StationCard
            icon={
              <>
                <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </>
            }
            title="Artist Mix"
            subtitle="Pick your artists"
            accent="#7c3aed"
            onPlay={() => {}}
          />
          {/* Disc — Album Mix */}
          <StationCard
            icon={
              <>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </>
            }
            title="Album Mix"
            subtitle="Pick your albums"
            accent="#2563eb"
            onPlay={() => {}}
          />
          {/* Radio waves — Vibe Radio */}
          <StationCard
            icon={
              <>
                <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 10 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
              </>
            }
            title="Vibe Radio"
            subtitle="Everything, shuffled"
            accent="#d97706"
            onPlay={playRadio}
          />
          {/* Trending up — Top This Month */}
          <StationCard
            icon={
              <>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </>
            }
            title="Top This Month"
            subtitle="Your most played"
            accent="#ef4444"
            onPlay={() => playTracks(mostPlayed, 0)}
          />
        </ScrollRow>
      </div>

      {topAlbums.length > 0 && (
        <div>
          <SectionHeader title="Top Albums" />
          <ScrollRow>
            {topAlbums.map((a) => (
              <AlbumCard
                key={a.Id}
                item={a}
                size={140}
                onPlay={() => playAlbum(a)}
              />
            ))}
          </ScrollRow>
        </div>
      )}
      {recentAlbums.length > 0 && (
        <div>
          <SectionHeader title="Recently Added Albums" />
          <ScrollRow>
            {recentAlbums.map((a) => (
              <AlbumCard
                key={a.Id}
                item={a}
                size={140}
                onPlay={() => playAlbum(a)}
              />
            ))}
          </ScrollRow>
        </div>
      )}

      {genres.length > 0 && (
        <div>
          <SectionHeader title={`More In: ${activeGenre || "Genre"}`} />
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {genres.map((g) => (
              <button
                key={g.Id}
                onClick={() => handleGenre(g.Name)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  background:
                    activeGenre === g.Name
                      ? "#7c3aed"
                      : "rgba(255,255,255,0.07)",
                  color: activeGenre === g.Name ? "#fff" : "#64748b",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
              >
                {g.Name}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {genreTracks.map((t, i) => (
              <TrackRow
                key={t.Id}
                track={t}
                index={i}
                onPlay={() => playTracks(genreTracks, i)}
                isActive={player.currentTrack?.Id === t.Id}
              />
            ))}
          </div>
        </div>
      )}

      {playlists.length > 0 && (
        <div>
          <SectionHeader title="Recent Playlists" />
          <ScrollRow gap={12}>
            {playlists.map((pl) => (
              <div
                key={pl.Id}
                onClick={() => playMix(pl.Id)}
                style={{
                  flexShrink: 0,
                  width: 150,
                  borderRadius: 14,
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <AlbumArt album={pl} size={150} radius={14} />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                    padding: "24px 10px 10px",
                  }}
                >
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}
                  >
                    {pl.Name}
                  </div>
                </div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {mostPlayed.length > 0 && (
        <MostPlayedSection
          tracks={mostPlayed}
          player={player}
          onPlay={playTracks}
          onViewAll={onViewMostPlayed}
        />
      )}

      {history.length > 0 && (
        <div style={{ marginBottom: 100 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: "#f1f5f9",
                letterSpacing: -0.3,
              }}
            >
              History
            </h2>
            {history.length > 4 && (
              <button
                onClick={() => onViewHistory?.(history)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#7c3aed",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 0",
                }}
              >
                All {history.length}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {history.slice(0, 4).map((t, i) => (
              <TrackRow
                key={`h-${t.Id}-${i}`}
                track={t}
                index={i}
                onPlay={() => playTracks(history, i)}
                isActive={player.currentTrack?.Id === t.Id}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && recentPlayed.length === 0 && recentAdded.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: "#475569" }}>
            Your library is empty
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────
function SearchView({ player, onAlbumSelect, onArtistSelect, playAndExpand }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    getAllGenres().then((r) => setGenres((r.Items || []).slice(0, 12)));
  }, []);
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const res = await search(q, 40);
      setResults(res.Items || []);
      setSearching(false);
    }, 350);
  }, [q]);

  const tracks = results.filter((r) => r.Type === "Audio");
  const albums = results.filter((r) => r.Type === "MusicAlbum");
  const artists = results.filter((r) => r.Type === "MusicArtist");
  const playAlbum = async (a) => {
    const r = await getAlbumTracks(a.Id);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };

  return (
    <div>
      <h2
        style={{
          margin: "0 0 20px",
          fontSize: 22,
          fontWeight: 700,
          color: "#f8fafc",
        }}
      >
        Search
      </h2>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <div
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {Icons.search("#475569")}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Songs, artists, albums..."
          style={{
            width: "100%",
            padding: "12px 16px 12px 46px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            color: "#f1f5f9",
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {!q && genres.length > 0 && (
        <div>
          <p style={{ color: "#475569", fontSize: 13, marginBottom: 12 }}>
            Browse by genre
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {genres.map((g, i) => {
              const cs = [
                "#7c3aed",
                "#2563eb",
                "#d97706",
                "#ef4444",
                "#059669",
                "#ec4899",
                "#0891b2",
                "#7c3aed",
              ];
              const c = cs[i % cs.length];
              return (
                <button
                  key={g.Id}
                  onClick={() => setQ(g.Name)}
                  style={{
                    background: `${c}20`,
                    border: `1px solid ${c}40`,
                    borderRadius: 20,
                    padding: "7px 16px",
                    color: c,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {g.Name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {searching && <Loader />}
      {artists.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Artists" />
          <ScrollRow gap={20}>
            {artists.map((a) => (
              <div
                key={a.Id}
                onClick={() => onArtistSelect?.(a)}
                style={{
                  flexShrink: 0,
                  width: 90,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#1e1e2e",
                    marginBottom: 8,
                  }}
                >
                  <img
                    src={`/artists/${a.Name}.jpg`}
                    alt={a.Name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center 20%",
                    }}
                    onError={(e) => {
                      e.target.src = `/artists/${encodeURIComponent(a.Name)}.jpg`;
                      e.target.onerror = () => {
                        e.target.style.display = "none";
                      };
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f1f5f9",
                    lineHeight: 1.3,
                  }}
                >
                  {a.Name}
                </div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}
      {albums.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Albums" />
          <ScrollRow>
            {albums.map((a) => (
              <AlbumCard
                key={a.Id}
                item={a}
                size={130}
                onPlay={() => (onAlbumSelect ? onAlbumSelect(a) : playAlbum(a))}
              />
            ))}
          </ScrollRow>
        </div>
      )}
      {tracks.length > 0 && (
        <div>
          <SectionHeader title="Songs" />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {tracks.map((t, i) => (
              <TrackRow
                key={t.Id}
                track={t}
                index={i}
                onPlay={() => playAndExpand(tracks, i)}
                isActive={player.currentTrack?.Id === t.Id}
              />
            ))}
          </div>
        </div>
      )}
      {q && !searching && results.length === 0 && (
        <p style={{ color: "#475569", textAlign: "center", marginTop: 48 }}>
          No results for "{q}"
        </p>
      )}
    </div>
  );
}

// ─── Library ──────────────────────────────────────────────────────────────────
function LibraryView({ player, onAlbumSelect, playAndExpand }) {
  const [tab, setTab] = useState("albums");
  const [albums, setAlbums] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    (tab === "albums"
      ? getAlbums(300).then((r) => setAlbums(r.Items || []))
      : getAllTracks(500).then((r) => setTracks(r.Items || []))
    ).finally(() => setLoading(false));
  }, [tab]);

  const playAlbum = async (a) => {
    const r = await getAlbumTracks(a.Id);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <h2
        style={{
          margin: "0 0 20px",
          fontSize: 22,
          fontWeight: 700,
          color: "#f8fafc",
        }}
      >
        Library
      </h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["albums", "tracks"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 18px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              background: tab === t ? "#7c3aed" : "rgba(255,255,255,0.07)",
              color: tab === t ? "#fff" : "#64748b",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {loading && <Loader />}
      {tab === "albums" && !loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 20,
          }}
        >
          {albums.map((a) => (
            <AlbumCard
              key={a.Id}
              item={a}
              size={140}
              onPlay={() => (onAlbumSelect ? onAlbumSelect(a) : playAlbum(a))}
            />
          ))}
        </div>
      )}
      {tab === "tracks" && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tracks.map((t, i) => (
            <TrackRow
              key={t.Id}
              track={t}
              index={i}
              onPlay={() => playAndExpand(tracks, i)}
              isActive={player.currentTrack?.Id === t.Id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const player = useVibePlayer();
  const [view, setView] = useState("home");
  const [stack, setStack] = useState([]);

  // Recently viewed artists — persisted to localStorage
  const [recentArtists, setRecentArtists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vibe_recent_artists") || "[]");
    } catch {
      return [];
    }
  });

  const trackArtistView = (artist) => {
    setRecentArtists((prev) => {
      const filtered = prev.filter((a) => a.Id !== artist.Id);
      const updated = [{ Id: artist.Id, Name: artist.Name }, ...filtered].slice(
        0,
        8,
      );
      try {
        localStorage.setItem("vibe_recent_artists", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const pushAlbum = (album) =>
    setStack((s) => [...s, { type: "album", data: album }]);
  const pushArtist = (artist) => {
    trackArtistView(artist);
    setStack((s) => [...s, { type: "artist", data: artist }]);
  };
  const popStack = () => setStack((s) => s.slice(0, -1));
  const top = stack[stack.length - 1] || null;
  const progress =
    player.duration > 0 ? player.currentTime / player.duration : 0;

  // Shared element origin — MUST be defined before playAndExpand
  const [playerOrigin, setPlayerOrigin] = useState(null);

  // Normalize track objects for queue consistency
  const normalizeTrack = (track) => ({
    Id: track.Id,
    Name: track.Name,
    Album: track.Album,
    AlbumId: track.AlbumId,
    AlbumArtist: track.AlbumArtist || track.Artists?.[0],
    Artists: track.Artists || [],
    RunTimeTicks: track.RunTimeTicks || 0,
  });

  // Single unified playback entry point — Plexamp style
  const playAndExpand = (tracks, index = 0, originEl = null) => {
    const normalized = tracks.map(normalizeTrack);
    if (normalized[index]?.Id) recordPlay(normalized[index].Id);
    // Capture origin rect before state update
    if (originEl) {
      const rect = originEl.getBoundingClientRect();
      setPlayerOrigin({
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
      });
    } else {
      setPlayerOrigin(null);
    }
    player.play(normalized, index);
    if (window.innerWidth < 768) {
      player.setPlayerExpanded(true);
    }
  };

  return (
    <ColorProvider track={player.currentTrack} isPlaying={player.isPlaying}>
      <div
        style={{ minHeight: "100vh", background: "#080810", color: "#f1f5f9" }}
      >
        <style>{`
  *{scrollbar-width:none;-ms-overflow-style:none}
  *::-webkit-scrollbar{display:none}
  *{-webkit-tap-highlight-color:transparent}
  body,*{user-select:none;-webkit-user-select:none}
  button,div{-webkit-touch-callout:none}
`}</style>
        <NavBar
          active={view}
          onChange={(v) => {
            setStack([]);
            setView(v);
          }}
          blocked={player.playerExpanded}
        />
        <main
          style={{
            paddingTop: "calc(72px + env(safe-area-inset-top))",
            paddingBottom: 120,
            paddingLeft: 20,
            paddingRight: 20,
            maxWidth: 760,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
            pointerEvents: player.playerExpanded ? "none" : "auto",
            touchAction: player.playerExpanded ? "none" : "auto",
            overflowY: player.playerExpanded ? "hidden" : "visible",
          }}
        >
          {view === "home" && (
            <HomeView
              player={player}
              onAlbumSelect={pushAlbum}
              onArtistSelect={pushArtist}
              playAndExpand={playAndExpand}
              recentArtists={recentArtists}
              onViewMostPlayed={(tracks) =>
                setStack((s) => [
                  ...s,
                  {
                    type: "mostplayed",
                    data: {
                      title: `Most Played · ${new Date().toLocaleString("default", { month: "long" })}`,
                      tracks,
                    },
                  },
                ])
              }
              onViewHistory={(tracks) =>
                setStack((s) => [
                  ...s,
                  { type: "history", data: { title: "History", tracks } },
                ])
              }
            />
          )}
          {view === "search" && (
            <SearchView
              player={player}
              onAlbumSelect={pushAlbum}
              onArtistSelect={pushArtist}
              playAndExpand={playAndExpand}
            />
          )}
          {view === "library" && (
            <LibraryView
              player={player}
              onAlbumSelect={pushAlbum}
              playAndExpand={playAndExpand}
            />
          )}
        </main>
        {top?.type === "album" && (
          <AlbumDetail
            album={top.data}
            onClose={popStack}
            onArtistSelect={pushArtist}
            player={player}
          />
        )}
        {top?.type === "artist" && (
          <ArtistDetail
            artist={top.data}
            onClose={popStack}
            onAlbumSelect={pushAlbum}
            player={player}
          />
        )}
        {top?.type === "mostplayed" && (
          <TrackListPage
            title={top.data.title}
            tracks={top.data.tracks}
            onClose={popStack}
            player={player}
            playAndExpand={playAndExpand}
          />
        )}
        {top?.type === "history" && (
          <TrackListPage
            title={top.data.title}
            tracks={top.data.tracks}
            onClose={popStack}
            player={player}
            playAndExpand={playAndExpand}
          />
        )}

        {player.currentTrack && !player.playerExpanded && (
          <MiniPlayer
            track={player.currentTrack}
            isPlaying={player.isPlaying}
            progress={progress}
            onToggle={player.togglePlay}
            onNext={player.next}
            onPrev={player.prev}
            onExpand={(e) => {
              const el = e?.currentTarget?.closest("[data-miniplayer]");
              if (el) {
                const rect = el.getBoundingClientRect();
                setPlayerOrigin({
                  x: rect.left,
                  y: rect.top,
                  w: rect.width,
                  h: rect.height,
                });
              }
              player.setPlayerExpanded(true);
            }}
          />
        )}
        {player.playerExpanded && player.currentTrack && (
          <PlayerSheet key="fullplayer-sheet">
            <FullPlayer
              track={player.currentTrack}
              isPlaying={player.isPlaying}
              progress={progress}
              currentTime={player.currentTime}
              duration={player.duration}
              volume={player.volume}
              isShuffle={player.isShuffle}
              repeatMode={player.repeatMode}
              getWaveform={player.getWaveform}
              onToggle={player.togglePlay}
              onNext={player.next}
              onPrev={player.prev}
              onSeek={player.seek}
              onVolume={player.changeVolume}
              onShuffle={player.toggleShuffle}
              onRepeat={player.cycleRepeat}
              onClose={() => player.setPlayerExpanded(false)}
              queue={player.queue}
              queueIndex={player.queueIndex}
              onPlayAt={player.playAt}
              isExpanded={player.playerExpanded}
            />
          </PlayerSheet>
        )}
      </div>
    </ColorProvider>
  );
}
