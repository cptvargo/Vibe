import { useRef } from 'react';
import { getImageUrl } from '../api/jellyfin';
import { extractColors } from '../utils/colorExtract';

export function AlbumCard({ item, onPlay, size = 150 }) {
  const imgRef    = useRef(null);
  const imgUrl    = getImageUrl(item.Id, 'Primary', size * 2);
  const extractUrl = getImageUrl(item.Id, 'Primary', 200); // canonical 200px cache key
  return (
    <div onClick={() => onPlay(imgRef.current)} style={{ flexShrink: 0, cursor: 'pointer', width: size }}>
      <div ref={imgRef} style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', background: '#1e1e2e' }}>
        <img
          src={imgUrl}
          alt={item.Name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onLoad={() => extractColors(extractUrl)}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: '#f1f5f9', lineHeight: 1.3 }}>{item.Name}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.AlbumArtist || item.Name}</div>
    </div>
  );
}
