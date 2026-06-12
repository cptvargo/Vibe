import { useState, useEffect } from 'react';
import { getAIAlbums, getAIArtists, getAITracks, getAIRecentlyPlayed, getAIRecentlyAdded, getAITopAlbums, getAIMostPlayed, getAIPlayHistory, getAIRadio, getAlbumTracks, getImageUrl, getAlbumImageUrl } from './ai.api';
import { AlbumCard } from '../../components/AlbumCard';
import { TrackRow } from '../../components/TrackRow';
import { ScrollRow, SectionHeader } from '../../components/Shelf';
import { Loader } from '../../components/Loader';
import { Icons } from '../../components/Icons';

const SW_MAGENTA = '#e040fb';
const SW_CYAN    = '#18ffff';
const SW_PURPLE  = '#9c27b0';

const imgName = (name) => name.replace(/Æ/g, 'AE').replace(/æ/g, 'ae');

function AIHeader({ title }) {
  return (
    <h2 style={{
      margin: '0 0 14px', fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
      background: `linear-gradient(90deg, ${SW_MAGENTA}, ${SW_CYAN})`,
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      display: 'inline-block',
    }}>
      {title}
    </h2>
  );
}

export function AIView({ player, onAlbumSelect, onArtistSelect, playAndExpand }) {
  const [albums,         setAlbums]         = useState([]);
  const [artists,        setArtists]        = useState([]);
  const [allTracks,      setAllTracks]      = useState([]);
  const [recentPlayed,   setRecentPlayed]   = useState([]);
  const [recentAdded,    setRecentAdded]    = useState([]);
  const [topAlbums,      setTopAlbums]      = useState([]);
  const [mostPlayed,     setMostPlayed]     = useState([]);
  const [history,        setHistory]        = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [al, ar, tr, rp, ra, ta, mp, h] = await Promise.all([
          getAIAlbums(), getAIArtists(), getAITracks(),
          getAIRecentlyPlayed(12), getAIRecentlyAdded(20),
          getAITopAlbums(12), getAIMostPlayed(12), getAIPlayHistory(20),
        ]);
        setAlbums(al.Items || []);
        setArtists(ar.Items || []);
        setAllTracks(tr.Items || []);
        setRecentPlayed(rp.Items || []);
        setRecentAdded([...new Map((ra.Items || []).map((t) => [t.AlbumId || t.Album, t])).values()]);
        setTopAlbums(ta.Items || []);
        setMostPlayed(mp.Items || []);
        setHistory(h.Items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const playAll   = () => { if (allTracks.length) playAndExpand(allTracks, 0); };
  const shuffle   = () => { if (allTracks.length) playAndExpand([...allTracks].sort(() => Math.random() - 0.5), 0); };
  const playRadio = async () => { const r = await getAIRadio(100); if (r.Items?.length) playAndExpand(r.Items, 0); };
  const playAlbum = async (album) => { const r = await getAlbumTracks(album.Id); if (r.Items?.length) playAndExpand(r.Items, 0); };
  const playTracks = (tracks, idx = 0) => playAndExpand(tracks, idx);

  if (loading) return <div style={{ padding: '32px 0' }}><Loader /></div>;

  const featured = albums[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

      {/* Synthwave grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(224,64,251,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(24,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '35%',
        zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 120%, ${SW_PURPLE}30 0%, transparent 65%)`,
      }} />

      {/* Hero */}
      {featured && (
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 220 }}>
          <img src={getImageUrl(featured.Id, 'Primary', 600)} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.45)', transform: 'scale(1.1)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(156,39,176,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,229,255,0.15) 100%)` }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 20, padding: '28px 22px 24px', alignItems: 'flex-end' }}>
            <div style={{ width: 110, height: 110, flexShrink: 0, borderRadius: 12, overflow: 'hidden', boxShadow: `0 0 0 1px ${SW_MAGENTA}55, 0 8px 32px rgba(0,0,0,0.6)` }}>
              <img src={getImageUrl(featured.Id, 'Primary', 220)} alt={featured.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: SW_CYAN, marginBottom: 6, textShadow: `0 0 10px ${SW_CYAN}` }}>
                AI Generated
              </div>
              <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 900, letterSpacing: -0.5, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {featured.Name}
              </h1>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {featured.AlbumArtist}{allTracks.length > 0 && ` · ${allTracks.length} tracks`}
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={playAll} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: SW_MAGENTA, border: 'none', borderRadius: 30, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: `0 4px 20px ${SW_MAGENTA}55`, flexShrink: 0 }}>
                  {Icons.play('#fff')} Play All
                </button>
                <button onClick={shuffle} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 30, cursor: 'pointer', color: '#f1f5f9', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {Icons.shuffle('#f1f5f9')} Shuffle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artists */}
      {artists.length > 0 && (
        <div>
          <AIHeader title="Artists" />
          <ScrollRow gap={20}>
            {artists.map((a) => (
              <div key={a.Id} onClick={() => onArtistSelect?.({ Id: a.Id, Name: a.Name, _theme: 'synthwave', _aiArtistIds: artists.map(x => x.Id) })}
                style={{ flexShrink: 0, width: 90, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', background: '#1a0030', marginBottom: 8, boxShadow: `0 0 0 2px ${SW_MAGENTA}55, 0 4px 20px ${SW_MAGENTA}30` }}>
                  <img src={`${import.meta.env.BASE_URL}artists/${imgName(a.Name)}.png`} alt={a.Name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
                    onError={(e) => { e.target.src = `${import.meta.env.BASE_URL}artists/${imgName(a.Name)}.jpg`; e.target.onerror = () => { e.target.style.display = 'none'; }; }}
                  />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>{a.Name}</div>
                <div style={{ fontSize: 10, color: SW_CYAN, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase', textShadow: `0 0 8px ${SW_CYAN}` }}>AI Artist</div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Recently Played */}
      {recentPlayed.length > 0 && (
        <div>
          <AIHeader title="Recently Played" />
          <ScrollRow gap={12}>
            {recentPlayed.map((t, i) => {
              const raw = t.UserData?.LastPlayedDate || t.LastPlayedDate;
              const diff = raw ? Math.floor((Date.now() - new Date(raw)) / 1000) : null;
              const timeAgo = diff == null ? null : diff < 60 ? 'Just now' : diff < 3600 ? `${Math.floor(diff/60)}m ago` : diff < 86400 ? `${Math.floor(diff/3600)}h ago` : `${Math.floor(diff/86400)}d ago`;
              const isActive = player.currentTrack?.Id === t.Id;
              return (
                <div key={`${t.Id}-${i}`} onClick={() => { const idx = recentPlayed.findIndex(x => x.Id === t.Id); playTracks(recentPlayed, idx >= 0 ? idx : 0); }}
                  style={{ flexShrink: 0, width: 140, cursor: 'pointer' }}>
                  <div style={{ width: 140, height: 140, borderRadius: 12, overflow: 'hidden', background: '#1a0030', marginBottom: 8, boxShadow: isActive ? `0 0 0 2px ${SW_MAGENTA}` : `0 0 0 1px ${SW_MAGENTA}22`, flexShrink: 0 }}>
                    <img src={getAlbumImageUrl(t, 280)} alt={t.Name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? SW_MAGENTA : '#f1f5f9', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.Name}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.AlbumArtist || t.Artists?.[0]}{timeAgo ? ` · ${timeAgo}` : ''}</div>
                </div>
              );
            })}
          </ScrollRow>
        </div>
      )}

      {/* Recently Added */}
      {recentAdded.length > 0 && (
        <div>
          <AIHeader title="Recently Added" />
          <ScrollRow>
            {recentAdded.map((t) => (
              <div key={t.Id} style={{ flexShrink: 0, width: 130, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 14, zIndex: 1, pointerEvents: 'none', boxShadow: `0 0 0 1px ${SW_MAGENTA}33, 0 6px 20px ${SW_MAGENTA}18` }} />
                <AlbumCard item={{ Id: t.AlbumId || t.Id, Name: t.Album || t.Name, AlbumArtist: t.AlbumArtist }} size={130}
                  onPlay={() => t.AlbumId ? playAlbum({ Id: t.AlbumId }) : playTracks([t], 0)} />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Top Albums */}
      {topAlbums.length > 0 && (
        <div>
          <AIHeader title="Top Albums" />
          <ScrollRow>
            {topAlbums.map((a) => (
              <div key={a.Id} style={{ flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 14, zIndex: 1, pointerEvents: 'none', boxShadow: `0 0 0 1px ${SW_MAGENTA}33, 0 6px 20px ${SW_MAGENTA}18` }} />
                <AlbumCard item={a} size={140} onPlay={() => onAlbumSelect(a)} />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* All Albums */}
      {albums.length > 0 && (
        <div>
          <AIHeader title="All Albums" />
          <ScrollRow>
            {albums.map((a) => (
              <div key={a.Id} style={{ flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 14, zIndex: 1, pointerEvents: 'none', boxShadow: `0 0 0 1px ${SW_MAGENTA}33, 0 6px 20px ${SW_MAGENTA}18` }} />
                <AlbumCard item={a} size={140} onPlay={() => onAlbumSelect(a)} />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Most Played */}
      {mostPlayed.length > 0 && (
        <div>
          <AIHeader title="Most Played" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mostPlayed.slice(0, 6).map((t, i) => (
              <TrackRow key={t.Id} track={t} index={i} onPlay={() => playTracks(mostPlayed, i)} isActive={player.currentTrack?.Id === t.Id} accent={SW_MAGENTA} />
            ))}
          </div>
        </div>
      )}

      {/* AI Radio */}
      <div>
        <AIHeader title="Station" />
        <button onClick={playRadio} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: `linear-gradient(135deg, ${SW_PURPLE}40, rgba(0,0,0,0.3))`, border: `1px solid ${SW_MAGENTA}33`, borderRadius: 16, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${SW_MAGENTA}, ${SW_PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${SW_MAGENTA}44` }}>
            {Icons.shuffle('#fff')}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>AI Radio</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Everything, shuffled</div>
          </div>
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginBottom: 100 }}>
          <AIHeader title="History" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.slice(0, 4).map((t, i) => (
              <TrackRow key={`h-${t.Id}-${i}`} track={t} index={i} onPlay={() => playTracks(history, i)} isActive={player.currentTrack?.Id === t.Id} accent={SW_MAGENTA} />
            ))}
          </div>
        </div>
      )}

      {!loading && albums.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 13, color: '#475569' }}>No AI music found</div>
        </div>
      )}

    </div>
  );
}
