import { useState, useEffect, useRef, useCallback } from 'react';
import './styles/tokens.css';
import { useVibePlayer }  from './hooks/useVibePlayer';
import { controlledAccent } from './utils/colorUtils';
import { NavBar }          from './layout/NavBar';
import { HomeView }      from './features/home/HomeView';
import { SearchView }    from './features/search/SearchView';
import { LibraryView }   from './features/library/LibraryView';
import { AlbumDetail }   from './features/library/AlbumDetail';
import { ArtistDetail }  from './features/library/ArtistDetail';
import { TrackListPage } from './features/library/TrackListPage';
import { MiniPlayer }    from './features/player/MiniPlayer';
import { Player }        from './features/player/Player';
import { ScreenSaver }   from './features/player/ScreenSaver';
import { MixBuilder }    from './features/mix/MixBuilder';
import { AIView }       from './features/ai/AIView';
import { recordPlay }    from './utils/hotTracks';

export default function App() {
  const player = useVibePlayer();
  const [view,    setView]    = useState('home');
  const [stack,   setStack]   = useState([]);
  const [mixMode, setMixMode] = useState(null); // 'artist' | 'album' | null

  const [isIdle,      setIsIdle]  = useState(false);
  const idleTimer    = useRef(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = player.isPlaying;

  // Stable: just starts the 30s countdown
  const startIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), 30_000);
  }, []);

  // Stable: dismiss screensaver + restart countdown. Reads isPlayingRef so no stale closure.
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    clearTimeout(idleTimer.current);
    if (isPlayingRef.current) startIdleTimer();
  }, [startIdleTimer]);

  // Event listeners added once — resetIdle is stable
  useEffect(() => {
    window.addEventListener('pointerdown', resetIdle, { passive: true });
    window.addEventListener('keydown',     resetIdle, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', resetIdle);
      window.removeEventListener('keydown',     resetIdle);
    };
  }, [resetIdle]);

  // Start/stop timer on play state or track change
  useEffect(() => {
    if (player.isPlaying) {
      startIdleTimer();
    } else {
      clearTimeout(idleTimer.current);
      setIsIdle(false);
    }
    return () => clearTimeout(idleTimer.current);
  }, [player.isPlaying, player.currentTrack?.Id, startIdleTimer]);

  const [recentArtists, setRecentArtists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vibe_recent_artists') || '[]'); }
    catch { return []; }
  });

  const trackArtistView = (artist) => {
    setRecentArtists((prev) => {
      const updated = [{ Id: artist.Id, Name: artist.Name }, ...prev.filter((a) => a.Id !== artist.Id)].slice(0, 8);
      try { localStorage.setItem('vibe_recent_artists', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const pushAlbum   = (album)  => setStack((s) => [...s, { type: 'album',  data: album }]);
  const pushArtist  = (artist) => { trackArtistView(artist); setStack((s) => [...s, { type: 'artist', data: artist }]); };
  const pushAIArtist = (artist) => setStack((s) => [...s, { type: 'artist', data: artist }]);
  const popStack   = ()       => setStack((s) => s.slice(0, -1));
  const top        = stack[stack.length - 1] || null;

  const normalizeTrack = (t) => ({
    Id: t.Id, Name: t.Name, Album: t.Album, AlbumId: t.AlbumId,
    AlbumArtist: t.AlbumArtist || t.Artists?.[0],
    Artists: t.Artists || [], RunTimeTicks: t.RunTimeTicks || 0,
  });

  const playAndExpand = (tracks, index = 0) => {
    const normalized = tracks.map(normalizeTrack);
    if (normalized[index]?.Id) recordPlay(normalized[index].Id);
    player.play(normalized, index);
    const t = tracks[index];
    const artistId   = t?.ArtistItems?.[0]?.Id || t?.AlbumArtistIds?.[0];
    const artistName = t?.AlbumArtist || t?.Artists?.[0];
    if (artistId && artistName) trackArtistView({ Id: artistId, Name: artistName });
    if (window.innerWidth < 768) player.setPlayerExpanded(true);
  };

  // AI variant — no artist tracking so AI artists never appear in Vibe Recent Artists
  const playAndExpandAI = (tracks, index = 0) => {
    const normalized = tracks.map(normalizeTrack);
    if (normalized[index]?.Id) recordPlay(normalized[index].Id);
    player.play(normalized, index);
    if (window.innerWidth < 768) player.setPlayerExpanded(true);
  };

  const progress    = player.duration > 0 ? player.currentTime / player.duration : 0;
  const accentGlow  = player.lockedAccent ? controlledAccent(player.lockedAccent) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#f1f5f9' }}>
      <style>{`
        *{scrollbar-width:none;-ms-overflow-style:none}
        *::-webkit-scrollbar{display:none}
        *{-webkit-tap-highlight-color:transparent}
        body,*{user-select:none;-webkit-user-select:none}
        button,div{-webkit-touch-callout:none}
        html,body{height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch}
      `}</style>

      {/* Ambient album color — bleeds into the whole app including NavBar's blur */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundColor: accentGlow ? `${accentGlow}1a` : 'transparent', transition: 'background-color 1.4s ease' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: accentGlow ? `radial-gradient(ellipse at 50% -10%, ${accentGlow}50 0%, transparent 60%)` : 'none', transition: 'background 1.4s ease' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '40%', zIndex: 0, pointerEvents: 'none', background: accentGlow ? `radial-gradient(ellipse at 50% 120%, ${accentGlow}28 0%, transparent 65%)` : 'none', transition: 'background 1.4s ease' }} />

      <NavBar active={view} onChange={(v) => { setStack([]); setView(v); }} blocked={player.playerExpanded} />

      <main style={{ paddingTop: 'calc(72px + env(safe-area-inset-top))', paddingBottom: 'calc(96px + env(safe-area-inset-bottom))', paddingLeft: 20, paddingRight: 20, maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1, pointerEvents: player.playerExpanded ? 'none' : 'auto', touchAction: player.playerExpanded ? 'none' : 'auto', overflowY: player.playerExpanded ? 'hidden' : 'visible' }}>
        {view === 'home' && (
          <HomeView
            player={player} onAlbumSelect={pushAlbum} onArtistSelect={pushArtist}
            playAndExpand={playAndExpand} recentArtists={recentArtists}
            onOpenMix={setMixMode}
            onViewMostPlayed={(tracks) => setStack((s) => [...s, { type: 'mostplayed', data: { title: `Most Played · ${new Date().toLocaleString('default', { month: 'long' })}`, tracks } }])}
            onViewHistory={(tracks) => setStack((s) => [...s, { type: 'history', data: { title: 'History', tracks } }])}
          />
        )}
        {view === 'search'  && <SearchView  player={player} onAlbumSelect={pushAlbum} onArtistSelect={pushArtist} playAndExpand={playAndExpand} />}
        {view === 'library' && <LibraryView player={player} onAlbumSelect={pushAlbum} playAndExpand={playAndExpand} />}
        {view === 'ai'      && <AIView      player={player} onAlbumSelect={pushAlbum} onArtistSelect={pushAIArtist} playAndExpand={playAndExpandAI} />}
      </main>

      {/* Mix builder — rendered at root level so it sits above MiniPlayer */}
      {mixMode && (
        <MixBuilder
          mode={mixMode}
          onPlay={(tracks) => { playAndExpand(tracks, 0); setMixMode(null); }}
          onClose={() => setMixMode(null)}
        />
      )}

      {/* Overlay stack */}
      {top?.type === 'album'      && <AlbumDetail   album={top.data}  onClose={popStack} onArtistSelect={pushArtist} player={player} />}
      {top?.type === 'artist'     && <ArtistDetail  artist={top.data} onClose={popStack} onAlbumSelect={pushAlbum}  player={player} theme={top.data._theme} aiArtistIds={top.data._aiArtistIds} />}
      {top?.type === 'mostplayed' && <TrackListPage title={top.data.title} tracks={top.data.tracks} onClose={popStack} player={player} playAndExpand={playAndExpand} />}
      {top?.type === 'history'    && <TrackListPage title={top.data.title} tracks={top.data.tracks} onClose={popStack} player={player} playAndExpand={playAndExpand} />}

      {/* Player */}
      {player.currentTrack && !player.playerExpanded && (
        <MiniPlayer
          track={player.currentTrack} isPlaying={player.isPlaying} progress={progress}
          onToggle={player.togglePlay} onNext={player.next} onPrev={player.prev}
          onExpand={() => player.setPlayerExpanded(true)}
        />
      )}
      {player.playerExpanded && player.currentTrack && (
        <Player
          track={player.currentTrack} isPlaying={player.isPlaying} progress={progress}
          currentTime={player.currentTime} duration={player.duration} volume={player.volume}
          isShuffle={player.isShuffle} repeatMode={player.repeatMode}
          getWaveform={player.getWaveform}
          onToggle={player.togglePlay} onNext={player.next} onPrev={player.prev}
          onSeek={player.seek} onVolume={player.changeVolume}
          onShuffle={player.toggleShuffle} onRepeat={player.cycleRepeat}
          onClose={() => player.setPlayerExpanded(false)}
          queue={player.queue} queueIndex={player.queueIndex} onPlayAt={player.playAt}
        />
      )}

      {/* Screen saver — activates after 30s idle while music plays */}
      {isIdle && player.currentTrack && (
        <ScreenSaver
          track={player.currentTrack}
          currentTime={player.currentTime}
          duration={player.duration}
          accent={accentGlow}
          onDismiss={resetIdle}
        />
      )}
    </div>
  );
}
