import { getImageUrl, getAlbumImageUrl } from '../api/jellyfin';
import { extractColors } from '../utils/colorExtract';

export function AlbumArt({ track, album, size = 56, radius = 8, style = {} }) {
  const imgUrl     = track
    ? getAlbumImageUrl(track, Math.min(size * 2, 800))
    : album ? getImageUrl(album.Id, 'Primary', size * 2) : null;
  // Always extract at 200px — matches the cache key used by useVibePlayer
  const extractUrl = track
    ? getAlbumImageUrl(track, 200)
    : album ? getImageUrl(album.Id, 'Primary', 200) : null;

  return (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden', background: '#1a1a2e', ...style }}>
      {imgUrl && (
        <img
          src={imgUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onLoad={() => extractUrl && extractColors(extractUrl)}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
}
