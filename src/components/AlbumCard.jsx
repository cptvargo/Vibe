import { useRef, useState, useEffect } from 'react';
import { getImageUrl } from '../api/jellyfin';
import { extractColors } from '../utils/colorExtract';
import { isAlbumDownloaded } from '../utils/offlineStorage';

export function AlbumCard({ item, onPlay, size = 150 }) {
  const imgRef     = useRef(null);
  const imgUrl     = getImageUrl(item.Id, 'Primary', size * 2);
  const extractUrl = getImageUrl(item.Id, 'Primary', 200);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    isAlbumDownloaded(item.Id).then(setDownloaded);
  }, [item.Id]);

  return (
    <div onClick={() => onPlay(imgRef.current)} style={{ flexShrink: 0, cursor: 'pointer', width: size }}>
      <div ref={imgRef} style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', background: '#1e1e2e', position: 'relative' }}>
        <img
          src={imgUrl}
          alt={item.Name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onLoad={() => extractColors(extractUrl)}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {downloaded && (
          <div style={{ position: 'absolute', bottom: 7, right: 7, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: '#f1f5f9', lineHeight: 1.3 }}>{item.Name}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.AlbumArtist || item.Name}</div>
    </div>
  );
}
