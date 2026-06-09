import { useState, useEffect, useRef } from 'react';
import {
  getArtists, searchArtists, getArtistTracks, getArtistImageUrl,
  getTopAlbums, getAlbumTracks_forMix, getImageUrl, search,
} from '../library/library.api';
import { controlledAccent } from '../../utils/colorUtils';
import { useAccent } from '../player/useAccent';

export function MixBuilder({ mode, recentArtists = [], onPlay, onClose }) {
  const accent   = controlledAccent(useAccent());
  const isArtist = mode === 'artist';

  const [selected,      setSelected]      = useState([]);
  const [browse,        setBrowse]        = useState([]);
  const [query,         setQuery]         = useState('');
  const [searchRes,     setSearchRes]     = useState(null); // null = show browse
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [generating,    setGenerating]    = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    setLoadingBrowse(true);
    (async () => {
      if (isArtist) {
        const r = await getArtists(80);
        setBrowse((r.Items || []).map(a => ({
          Id: a.Id, Name: a.Name, imageUrl: getArtistImageUrl(a.Id, 80),
        })));
      } else {
        const r = await getTopAlbums(24);
        setBrowse((r.Items || []).map(a => ({
          Id: a.Id, Name: a.Name, subtitle: a.AlbumArtist,
          imageUrl: getImageUrl(a.Id, 'Primary', 80),
        })));
      }
      setLoadingBrowse(false);
    })();
  }, [isArtist]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setSearchRes(null); return; }
    debounce.current = setTimeout(async () => {
      if (isArtist) {
        const r = await searchArtists(query);
        setSearchRes((r.Items || []).map(a => ({
          Id: a.Id, Name: a.Name, imageUrl: getArtistImageUrl(a.Id, 80),
        })));
      } else {
        const r = await search(query, 30);
        setSearchRes(
          (r.Items || [])
            .filter(i => i.Type === 'MusicAlbum')
            .map(a => ({ Id: a.Id, Name: a.Name, subtitle: a.AlbumArtist, imageUrl: getImageUrl(a.Id, 'Primary', 80) }))
        );
      }
    }, 300);
  }, [query, isArtist]);

  const isSelected = (id) => selected.some(s => s.Id === id);

  const toggle = (item) => {
    setSelected(prev =>
      prev.find(s => s.Id === item.Id)
        ? prev.filter(s => s.Id !== item.Id)
        : [...prev, item]
    );
  };

  const handlePlay = async () => {
    if (!selected.length || generating) return;
    setGenerating(true);
    let tracks = [];
    if (isArtist) {
      const results = await Promise.all(selected.map(a => getArtistTracks(a.Id, 50)));
      tracks = results.flatMap(r => r.Items || []).sort(() => Math.random() - 0.5);
    } else {
      // Full albums in track order, one after another
      const results = await Promise.all(selected.map(a => getAlbumTracks_forMix(a.Id)));
      tracks = results.flatMap(r => r.Items || []);
    }
    setGenerating(false);
    if (tracks.length) onPlay(tracks);
  };

  const displayItems = searchRes ?? browse;
  const recentIds    = new Set(recentArtists.map(a => a.Id));
  const libraryItems = isArtist && !query ? displayItems.filter(i => !recentIds.has(i.Id)) : displayItems;
  const showRecent   = isArtist && !query && recentArtists.length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes mixUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />

      {/* Sheet */}
      <div style={{ position: 'relative', marginTop: 'auto', background: '#0d0d1a', borderRadius: '20px 20px 0 0', maxHeight: '88dvh', display: 'flex', flexDirection: 'column', animation: 'mixUp 0.32s cubic-bezier(0.32,0.72,0,1) both' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.5 }}>
                {isArtist ? 'Artist Mix' : 'Album Mix'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>
                {isArtist
                  ? 'Pick artists — get a shuffled stream of their songs'
                  : 'Pick albums — play them full, back-to-back in order'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '12px 0 2px', scrollbarWidth: 'none' }}>
              {selected.map(item => (
                <button key={item.Id} onClick={() => toggle(item)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', background: `${accent}20`, border: `1px solid ${accent}44`, borderRadius: 20, cursor: 'pointer' }}>
                  <img src={item.imageUrl} alt="" style={{ width: 22, height: 22, borderRadius: isArtist ? '50%' : 3, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: accent, whiteSpace: 'nowrap' }}>{item.Name}</span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', margin: '12px 0 10px' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isArtist ? 'Search artists…' : 'Search albums…'}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px 10px 36px', fontSize: 14, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none' }}
            />
          </div>
        </div>

        {/* Browse area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }}>
          {loadingBrowse && !displayItems.length ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Loading…</div>
          ) : isArtist ? (
            <>
              {showRecent && (
                <>
                  <SectionLabel>Recent</SectionLabel>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
                    {recentArtists.map(a => {
                      const item = { Id: a.Id, Name: a.Name, imageUrl: getArtistImageUrl(a.Id, 80) };
                      return <ArtistDot key={a.Id} item={item} selected={isSelected(a.Id)} accent={accent} onToggle={() => toggle(item)} />;
                    })}
                  </div>
                  {libraryItems.length > 0 && <SectionLabel>Library</SectionLabel>}
                </>
              )}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {libraryItems.map(item => (
                  <ArtistDot key={item.Id} item={item} selected={isSelected(item.Id)} accent={accent} onToggle={() => toggle(item)} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {displayItems.map(item => (
                <AlbumRow key={item.Id} item={item} selected={isSelected(item.Id)} accent={accent} onToggle={() => toggle(item)} />
              ))}
            </div>
          )}
        </div>

        {/* Play button */}
        <div style={{ padding: '10px 20px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handlePlay}
            disabled={!selected.length || generating}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              cursor: selected.length && !generating ? 'pointer' : 'default',
              background: selected.length ? accent : 'rgba(255,255,255,0.07)',
              color: selected.length ? '#fff' : 'rgba(255,255,255,0.28)',
              fontSize: 15, fontWeight: 700, transition: 'background 0.2s, box-shadow 0.2s',
              boxShadow: selected.length ? `0 4px 24px ${accent}44` : 'none',
            }}
          >
            {generating
              ? 'Building mix…'
              : selected.length
                ? `Play ${isArtist ? 'Artist' : 'Album'} Mix · ${selected.length} ${isArtist ? (selected.length === 1 ? 'artist' : 'artists') : (selected.length === 1 ? 'album' : 'albums')}`
                : `Select ${isArtist ? 'artists' : 'albums'} to start`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.2, textTransform: 'uppercase', padding: '4px 0 10px' }}>
      {children}
    </div>
  );
}

function ArtistDot({ item, selected, accent, onToggle }) {
  return (
    <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 66, padding: 0 }}>
      <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: '#1e1e2e', border: `2.5px solid ${selected ? accent : 'transparent'}`, transition: 'border-color 0.15s', flexShrink: 0, boxSizing: 'border-box' }}>
        <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: selected ? 700 : 400, color: selected ? accent : 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.3, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.Name}
      </span>
    </button>
  );
}

function AlbumRow({ item, selected, accent, onToggle }) {
  return (
    <button onClick={onToggle} style={{ width: '100%', background: selected ? `${accent}14` : 'transparent', border: `1px solid ${selected ? accent + '38' : 'transparent'}`, borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
      <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: '#1e1e2e', flexShrink: 0 }}>
        <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.Name}</div>
        {item.subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{item.subtitle}</div>}
      </div>
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? accent : 'rgba(255,255,255,0.18)'}`, background: selected ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        {selected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
    </button>
  );
}
