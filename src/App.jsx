import { useState } from 'react';
import './styles/tokens.css';
import { useVibePlayer } from './hooks/useVibePlayer';
import { NavBar }        from './layout/NavBar';
import { HomeView }      from './features/home/HomeView';
import { SearchView }    from './features/search/SearchView';
import { LibraryView }   from './features/library/LibraryView';
import { AlbumDetail }   from './features/library/AlbumDetail';
import { ArtistDetail }  from './features/library/ArtistDetail';
import { TrackListPage } from './features/library/TrackListPage';
import { MiniPlayer }    from './features/player/MiniPlayer';
import { Player }        from './features/player/Player';
import { recordPlay }    from './utils/hotTracks';

export default function App() {
  const player = useVibePlayer();
  const [view,  setView]  = useState('home');
  const [stack, setStack] = useState([]);

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

  const pushAlbum  = (album)  => setStack((s) => [...s, { type: 'album',  data: album }]);
  const pushArtist = (artist) => { trackArtistView(artist); setStack((s) => [...s, { type: 'artist', data: artist }]); };
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
    if (window.innerWidth < 768) player.setPlayerExpanded(true);
  };

  const progress = player.duration > 0 ? player.currentTime / player.duration : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#f1f5f9' }}>
      <style>{`
        *{scrollbar-width:none;-ms-overflow-style:none}
        *::-webkit-scrollbar{display:none}
        *{-webkit-tap-highlight-color:transparent}
        body,*{user-select:none;-webkit-user-select:none}
        button,div{-webkit-touch-callout:none}
      `}</style>

      <NavBar active={view} onChange={(v) => { setStack([]); setView(v); }} blocked={player.playerExpanded} />

      <main style={{ paddingTop: 'calc(72px + env(safe-area-inset-top))', paddingBottom: 120, paddingLeft: 20, paddingRight: 20, maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1, pointerEvents: player.playerExpanded ? 'none' : 'auto', touchAction: player.playerExpanded ? 'none' : 'auto', overflowY: player.playerExpanded ? 'hidden' : 'visible' }}>
        {view === 'home' && (
          <HomeView
            player={player} onAlbumSelect={pushAlbum} onArtistSelect={pushArtist}
            playAndExpand={playAndExpand} recentArtists={recentArtists}
            onViewMostPlayed={(tracks) => setStack((s) => [...s, { type: 'mostplayed', data: { title: `Most Played · ${new Date().toLocaleString('default', { month: 'long' })}`, tracks } }])}
            onViewHistory={(tracks) => setStack((s) => [...s, { type: 'history', data: { title: 'History', tracks } }])}
          />
        )}
        {view === 'search'  && <SearchView  player={player} onAlbumSelect={pushAlbum} onArtistSelect={pushArtist} playAndExpand={playAndExpand} />}
        {view === 'library' && <LibraryView player={player} onAlbumSelect={pushAlbum} playAndExpand={playAndExpand} />}
      </main>

      {/* Overlay stack */}
      {top?.type === 'album'      && <AlbumDetail   album={top.data}  onClose={popStack} onArtistSelect={pushArtist} player={player} />}
      {top?.type === 'artist'     && <ArtistDetail  artist={top.data} onClose={popStack} onAlbumSelect={pushAlbum}  player={player} />}
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
    </div>
  );
}
