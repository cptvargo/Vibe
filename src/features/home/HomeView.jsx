import { useState, useEffect } from 'react';
import {
  getRecentlyPlayed, getRecentlyAdded, getRecentPlaylists, getTopAlbums,
  getRecentAlbums, getMostPlayedThisMonth, getPlayHistory, getAllGenres,
  getByGenre, getAlbumTracks, getVibeRadio, getInstantMix,
  getImageUrl, getAlbumImageUrl,
} from '../library/library.api';
import { AlbumCard } from '../../components/AlbumCard';
import { AlbumArt } from '../../components/AlbumArt';
import { StationCard } from '../../components/StationCard';
import { TrackRow } from '../../components/TrackRow';
import { ScrollRow, SectionHeader } from '../../components/Shelf';
import { Loader } from '../../components/Loader';
import { MostPlayedSection } from './MostPlayedSection';
import { getFireSongs } from '../../utils/fireSongs';

export function HomeView({ player, onAlbumSelect, onArtistSelect, playAndExpand, recentArtists = [], onOpenMix, onViewMostPlayed, onViewHistory }) {
  const [recentPlayed, setRecentPlayed] = useState([]);
  const [recentAdded,  setRecentAdded]  = useState([]);
  const [playlists,    setPlaylists]    = useState([]);
  const [topAlbums,    setTopAlbums]    = useState([]);
  const [recentAlbums, setRecentAlbums] = useState([]);
  const [mostPlayed,   setMostPlayed]   = useState([]);
  const [history,      setHistory]      = useState([]);
  const [genres,       setGenres]       = useState([]);
  const [genreTracks,  setGenreTracks]  = useState([]);
  const [activeGenre,  setActiveGenre]  = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rp, ra, pl, ta, ral, mp, h, g] = await Promise.all([
          getRecentlyPlayed(12), getRecentlyAdded(12), getRecentPlaylists(6),
          getTopAlbums(12), getRecentAlbums(12), getMostPlayedThisMonth(12),
          getPlayHistory(20), getAllGenres(),
        ]);
        setRecentPlayed(rp.Items || []);
        setRecentAdded([...new Map((ra.Items || []).map((t) => [t.AlbumId || t.Album, t])).values()]);
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
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleGenre = async (name) => {
    setActiveGenre(name);
    const gt = await getByGenre(name, 8);
    setGenreTracks(gt.Items || []);
  };
  const playTracks = (tracks, idx = 0) => playAndExpand(tracks, idx);
  const playAlbum  = async (album) => {
    const r = await getAlbumTracks(album.Id);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };
  const playRadio = async () => {
    const r = await getVibeRadio(100);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };
  const playMix = async (id) => {
    const r = await getInstantMix(id, 50);
    if (r.Items?.length) playAndExpand(r.Items, 0);
  };

  if (loading) return <div style={{ padding: '32px 0' }}><Loader /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

      {recentPlayed.length > 0 && (
        <div>
          <SectionHeader title="Recently Played" />
          <ScrollRow gap={12}>
            {recentPlayed.map((t, i) => {
              const raw    = t.UserData?.LastPlayedDate || t.LastPlayedDate;
              const diff   = raw ? Math.floor((Date.now() - new Date(raw)) / 1000) : null;
              const timeAgo = diff == null ? null : diff < 60 ? 'Just now' : diff < 3600 ? `${Math.floor(diff/60)}m ago` : diff < 86400 ? `${Math.floor(diff/3600)}h ago` : `${Math.floor(diff/86400)}d ago`;
              const isArtist = t.Type === 'MusicArtist';
              const isAlbum  = t.Type === 'MusicAlbum';
              const isTrack  = !isArtist && !isAlbum;
              const imgUrl   = isArtist ? `${import.meta.env.BASE_URL}artists/${t.Name}.jpg` : isAlbum ? getImageUrl(t.Id, 'Primary', 280) : getAlbumImageUrl(t, 280);
              const sublabel = isArtist ? (timeAgo || '') : isAlbum ? (t.AlbumArtist || '') : (t.AlbumArtist || t.Artists?.[0] || '');
              const isActive = isTrack && player.currentTrack?.Id === t.Id;

              const handleClick = () => {
                if (isArtist) onArtistSelect?.({ Id: t.Id, Name: t.Name });
                else if (isAlbum) onAlbumSelect?.(t);
                else {
                  const audioTracks = recentPlayed.filter((x) => x.Type === 'Audio' || !x.Type);
                  const idx = audioTracks.findIndex((x) => x.Id === t.Id);
                  playAndExpand(audioTracks, idx >= 0 ? idx : 0);
                }
              };

              return (
                <div key={`${t.Id}-${i}`} onClick={handleClick} style={{ flexShrink: 0, width: 140, cursor: 'pointer' }}>
                  <div style={{ width: 140, height: 140, borderRadius: isArtist ? '50%' : 12, overflow: 'hidden', background: '#1e1e2e', marginBottom: 8, boxShadow: isActive ? '0 0 0 2px #7c3aed' : 'none', flexShrink: 0 }}>
                    <img
                      src={imgUrl} alt={t.Name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: isArtist ? 'center 20%' : 'center' }}
                      onError={(e) => {
                        if (isArtist) { e.target.src = `${import.meta.env.BASE_URL}artists/${encodeURIComponent(t.Name)}.jpg`; e.target.onerror = () => { e.target.style.display = 'none'; }; }
                        else { e.target.style.display = 'none'; }
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? '#a78bfa' : '#f1f5f9', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.Name}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sublabel}{timeAgo ? ` · ${timeAgo}` : ''}</div>
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
              <div key={a.Id} onClick={() => onArtistSelect?.({ Id: a.Id, Name: a.Name })} style={{ flexShrink: 0, width: 90, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', background: '#1e1e2e', marginBottom: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                  <img src={`${import.meta.env.BASE_URL}artists/${a.Name}.jpg`} alt={a.Name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
                    onError={(e) => { e.target.src = `${import.meta.env.BASE_URL}artists/${encodeURIComponent(a.Name)}.jpg`; e.target.onerror = () => { e.target.style.display = 'none'; }; }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#f1f5f9', lineHeight: 1.3 }}>{a.Name}</div>
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
                <AlbumCard item={{ Id: t.AlbumId || t.Id, Name: t.Album || t.Name, AlbumArtist: t.AlbumArtist }} size={130}
                  onPlay={() => t.AlbumId ? playAlbum({ Id: t.AlbumId }) : playTracks([t], 0)} />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      <div>
        <SectionHeader title="Stations" />
        <ScrollRow gap={12}>
          <StationCard icon={<><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>} title="Artist Mix" subtitle="Pick your artists" accent="#7c3aed" onPlay={() => onOpenMix('artist')} />
          <StationCard icon={<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></>} title="Album Mix" subtitle="Full albums, back-to-back" accent="#2563eb" onPlay={() => onOpenMix('album')} />
          <StationCard
            icon={<path d="M12 2c0 0-5 6.5-5 11a5 5 0 0 0 10 0c0-4.5-5-11-5-11z" />}
            title="Fire Mix" subtitle="Songs you've marked fire" accent="#f97316"
            onPlay={() => { const s = getFireSongs(); if (s.length) playTracks([...s].sort(() => Math.random() - 0.5), 0); }}
          />
          <StationCard icon={<><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 10 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></>} title="Vibe Radio" subtitle="Everything, shuffled" accent="#d97706" onPlay={playRadio} />
          <StationCard icon={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>} title="Top This Month" subtitle="Your most played" accent="#ef4444" onPlay={() => playTracks(mostPlayed, 0)} />
        </ScrollRow>
      </div>

      {topAlbums.length > 0 && (
        <div><SectionHeader title="Top Albums" /><ScrollRow>{topAlbums.map((a) => <AlbumCard key={a.Id} item={a} size={140} onPlay={() => onAlbumSelect(a)} />)}</ScrollRow></div>
      )}
      {recentAlbums.length > 0 && (
        <div><SectionHeader title="Recently Added Albums" /><ScrollRow>{recentAlbums.map((a) => <AlbumCard key={a.Id} item={a} size={140} onPlay={() => onAlbumSelect(a)} />)}</ScrollRow></div>
      )}

      {genres.length > 0 && (
        <div>
          <SectionHeader title={`More In: ${activeGenre || 'Genre'}`} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {genres.map((g) => (
              <button key={g.Id} onClick={() => handleGenre(g.Name)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: activeGenre === g.Name ? '#7c3aed' : 'rgba(255,255,255,0.07)', color: activeGenre === g.Name ? '#fff' : '#64748b', fontSize: 12, fontWeight: 500, transition: 'all 0.2s' }}>
                {g.Name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {genreTracks.map((t, i) => <TrackRow key={t.Id} track={t} index={i} onPlay={() => playTracks(genreTracks, i)} isActive={player.currentTrack?.Id === t.Id} />)}
          </div>
        </div>
      )}

      {playlists.length > 0 && (
        <div>
          <SectionHeader title="Recent Playlists" />
          <ScrollRow gap={12}>
            {playlists.map((pl) => (
              <div key={pl.Id} onClick={() => playMix(pl.Id)} style={{ flexShrink: 0, width: 150, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                <AlbumArt album={pl} size={150} radius={14} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '24px 10px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{pl.Name}</div>
                </div>
              </div>
            ))}
          </ScrollRow>
        </div>
      )}

      {mostPlayed.length > 0 && <MostPlayedSection tracks={mostPlayed} player={player} onPlay={playTracks} onViewAll={onViewMostPlayed} />}

      {history.length > 0 && (
        <div style={{ marginBottom: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3 }}>History</h2>
            {history.length > 4 && (
              <button onClick={() => onViewHistory?.(history)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', fontSize: 12, fontWeight: 600, padding: '4px 0' }}>
                All {history.length}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6" /></svg>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.slice(0, 4).map((t, i) => <TrackRow key={`h-${t.Id}-${i}`} track={t} index={i} onPlay={() => playTracks(history, i)} isActive={player.currentTrack?.Id === t.Id} />)}
          </div>
        </div>
      )}

      {!loading && recentPlayed.length === 0 && recentAdded.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#475569' }}>Your library is empty</p>
        </div>
      )}

    </div>
  );
}
