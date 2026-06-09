import { useState, useEffect } from 'react';
import { getSimilarArtists } from './library.api';

export function SimilarArtists({ artist, onArtistSelect }) {
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    if (!artist?.Id) return;
    getSimilarArtists(artist.Id).then(setSimilar);
  }, [artist?.Id]);

  if (!similar.length) return null;

  return (
    <div style={{ padding: '0 20px', marginTop: 8, position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: '#7c3aed' }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Similar Artists</h2>
      </div>
      <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {similar.map((a) => (
          <div key={a.Id} onClick={() => onArtistSelect?.({ Id: a.Id, Name: a.Name })} style={{ flexShrink: 0, width: 80, cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: '#1e1e2e', marginBottom: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <img
                src={`/artists/${a.Name}.jpg`}
                alt={a.Name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.3 }}>{a.Name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
