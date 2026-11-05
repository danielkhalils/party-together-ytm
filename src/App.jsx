import React, { useState, useEffect, useRef } from 'react';
import { lookupRoomState, startRoomSync } from './services/realtimeSync.js';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Plus,
  Search,
  Users,
  Lock,
  Share2,
  ThumbsUp,
  Crown,
  LogOut,
  Check,
  Sparkles,
  Disc3,
  AlertCircle,
  Mic2,
  ListMusic
} from 'lucide-react';

// Ícone Oficial Customizado da Aplicação "Party Together"
function PartyTogetherLogo({ className = 'w-10 h-10', iconSize = 'w-6 h-6' }) {
  return (
    <div
      className={`${className} rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30 border border-white/15 shrink-0 select-none`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={iconSize}
      >
        {/* Ondas de sincronia */}
        <path
          d="M7 12C4.5 15.5 4.5 20.5 7 24"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M29 12C31.5 15.5 31.5 20.5 29 24"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Vinil / Nota Musical Dupla */}
        <circle cx="14" cy="22" r="3.5" fill="white" />
        <circle cx="23" cy="20" r="3.5" fill="white" />
        <path
          d="M17.5 22V11L26.5 9V20"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// Capas de álbuns populares/icônicos para o Mosaico de Fundo estilo Netflix / Spotify
const ALBUM_MOSAIC_COVERS = [
  'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
  'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
  'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
  'https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg',
  'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
  'https://i.ytimg.com/vi/09R8_2nJtjg/hqdefault.jpg',
  'https://i.ytimg.com/vi/YQHsXMglC9A/hqdefault.jpg',
  'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg',
  'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg',
  'https://i.ytimg.com/vi/lp-EO5I60KA/hqdefault.jpg',
  'https://i.ytimg.com/vi/SlPhMPnQ58k/hqdefault.jpg',
  'https://i.ytimg.com/vi/bo_efYhYU2A/hqdefault.jpg',
  'https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg',
  'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg',
  'https://i.ytimg.com/vi/gNi_6U5Pm_o/hqdefault.jpg',
  'https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg',
  'https://i.ytimg.com/vi/G7KNmW9a75Y/hqdefault.jpg',
  'https://i.ytimg.com/vi/b1kbLwvqugk/hqdefault.jpg',
  'https://i.ytimg.com/vi/kffacxfA7G4/hqdefault.jpg',
  'https://i.ytimg.com/vi/CevxZvSJLk8/hqdefault.jpg',
  'https://i.ytimg.com/vi/e-ORhEE9VVg/hqdefault.jpg',
  'https://i.ytimg.com/vi/nfWlot6h_JM/hqdefault.jpg',
  'https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg',
  'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg'
];

// Sementes para gerar avatares fofos aleatórios (DiceBear Fun Emoji / Adventurer / Thumbs)
const CUTE_AVATAR_STYLES = ['fun-emoji', 'bottts-neutral', 'thumbs', 'adventurer-neutral'];
function getRandomCuteAvatar(seed) {
  const style = CUTE_AVATAR_STYLES[Math.floor(Math.random() * CUTE_AVATAR_STYLES.length)];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffdfbf,ffd5dc,c0aede,b6e3f4,d1d4f9`;
}

// Utilitário para extrair ID do YouTube se o usuário colar um link direto
function extractYouTubeId(input) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = input.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Faz o parse do formato LRC "[00:12.50] Letra..." para array de objetos { time, text }
function parseSyncedLyrics(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      parsed.push({
        time: timeInSeconds,
        text: text || '♪'
      });
    }
  }
  return parsed;
}

export default function App() {
  // Identidade e Avatar Fofo aleatório do usuário
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 9));
  const [userAvatar] = useState(() => getRandomCuteAvatar('party_' + Math.random().toString(36).substring(2, 8)));
  const [username, setUsername] = useState('');
  const [inRoom, setInRoom] = useState(false);

  // Dados de criação / entrada na sala
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [roomNameInput, setRoomNameInput] = useState('Sexta Indie & Pop');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [pinInput, setPinInput] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  // Estado Sincronizado da Sala
  const [roomState, setRoomState] = useState(null);

  // Estados Locais do Player no PC de cada usuário
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Estados da Busca (Inicia VAZIA a critério do usuário)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Abas: 'queue' | 'search' | 'lyrics'
  const [activeTab, setActiveTab] = useState('search');

  // Estados do BetterLyrics (Letras Sincronizadas em Tempo Real)
  const [lyricsData, setLyricsData] = useState({
    loading: false,
    synced: [],
    plain: '',
    error: null
  });

  const playerRef = useRef(null);
  const ytApiReady = useRef(false);
  const activeLyricRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const syncServiceRef = useRef(null);

  const isHost = Boolean(roomState && roomState.hostId === userId);

  // Refs de sincronização para garantir que callbacks e eventos nunca fiquem com closure defasada
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const handleSkipNextRef = useRef(() => {});

  // 1. Atualiza o Favicon do navegador com o novo ícone da aplicação
  useEffect(() => {
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" rx="10" fill="#dc2626"/><circle cx="14" cy="22" r="3.5" fill="white"/><circle cx="23" cy="20" r="3.5" fill="white"/><path d="M17.5 22V11L26.5 9V20" stroke="white" stroke-width="2.6" stroke-linecap="round"/></svg>`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = `data:image/svg+xml,${encodeURIComponent(svgIcon)}`;
    document.title = 'Party Together — YouTube Music Sync';
  }, []);

  // 2. Carrega a API oficial de IFrame do YouTube
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        ytApiReady.current = true;
      };
    } else {
      ytApiReady.current = true;
    }
  }, []);

  // 3. Sincronização em Tempo Real (Global MQTT WebSockets + BroadcastChannel Local)
  useEffect(() => {
    if (!inRoom || !roomState?.roomId) return;

    const currentRoomId = roomState.roomId;
    const sync = startRoomSync({
      roomId: currentRoomId,
      isHost,
      onStateUpdate: (remoteState) => {
        setRoomState((prev) => {
          if (!prev) return remoteState;
          const currentTimestamp = prev.playback?.updatedAt || 0;
          const remoteTimestamp = remoteState.playback?.updatedAt || 0;
          // Anfitrião mantém controle se a atualização externa for mais antiga
          if (isHostRef.current && remoteTimestamp < currentTimestamp) {
            return prev;
          }
          return remoteState;
        });
      },
      onAction: (action) => {
        if (!isHostRef.current) return;
        handleHostProcessGuestAction(action);
      }
    });

    syncServiceRef.current = sync;

    if (isHost) {
      sync.broadcastState(roomStateRef.current);
    }

    return () => {
      sync.destroy();
      syncServiceRef.current = null;
    };
  }, [inRoom, roomState?.roomId, isHost]);

  const broadcastRoomState = (newState) => {
    setRoomState(newState);
    if (syncServiceRef.current) {
      syncServiceRef.current.broadcastState(newState);
    } else {
      try {
        localStorage.setItem(`party_room_${newState.roomId}`, JSON.stringify(newState));
      } catch {}
    }
  };

  // O Anfitrião processa ações disparadas por convidados (adicionar à fila, voto, novo participante)
  const handleHostProcessGuestAction = (action) => {
    const currentRoom = roomStateRef.current;
    if (!currentRoom) return;

    if (action.type === 'ADD_TO_QUEUE') {
      const track = action.track;
      if (!track) return;

      // Se não havia nenhuma música tocando na sala, começa imediatamente!
      if (!currentRoom.playback.videoId) {
        if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById(track.videoId);
        }
        broadcastRoomState({
          ...currentRoom,
          playback: {
            videoId: track.videoId,
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumbnail,
            addedBy: action.senderName || 'Convidado',
            isPlaying: true,
            trackPosition: 0,
            updatedAt: Date.now()
          }
        });
      } else {
        const newQueueItem = {
          ...track,
          id: 'q_' + Math.random().toString(36).substring(2, 9),
          addedBy: action.senderName || 'Convidado',
          votes: 1
        };
        broadcastRoomState({
          ...currentRoom,
          queue: [...(currentRoom.queue || []), newQueueItem]
        });
      }
    } else if (action.type === 'VOTE_TRACK') {
      const queue = currentRoom.queue || [];
      const updatedQueue = queue
        .map((item) => (item.id === action.itemId ? { ...item, votes: item.votes + 1 } : item))
        .sort((a, b) => b.votes - a.votes);

      broadcastRoomState({
        ...currentRoom,
        queue: updatedQueue
      });
    } else if (action.type === 'USER_JOINED') {
      if (!action.member || !action.member.id) return;
      const exists = (currentRoom.members || []).some((m) => m.id === action.member.id);
      if (!exists) {
        broadcastRoomState({
          ...currentRoom,
          members: [...(currentRoom.members || []), action.member]
        });
      }
    } else if (action.type === 'USER_LEFT') {
      broadcastRoomState({
        ...currentRoom,
        members: (currentRoom.members || []).filter((m) => m.id !== action.userId)
      });
    }
  };

  // 4. Busca de músicas no YouTube Music (Inicia vazia até o usuário digitar)
  useEffect(() => {
    const query = searchQuery.trim();

    if (!query || extractYouTubeId(query)) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Erro ao buscar no YT Music:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 5. Busca automática da Letra Sincronizada (BetterLyrics style via LRCLIB) sempre que a música muda
  useEffect(() => {
    const currentVideoId = roomState?.playback?.videoId;
    const rawTitle = roomState?.playback?.title;
    const rawArtist = roomState?.playback?.artist;

    if (!currentVideoId || !rawTitle) {
      setLyricsData({ loading: false, synced: [], plain: '', error: null });
      return;
    }

    let isCancelled = false;

    async function fetchSyncedLyrics() {
      setLyricsData({ loading: true, synced: [], plain: '', error: null });

      // Limpeza rigorosa de sufixos do YouTube que poluem o título
      const cleanTitle = rawTitle
        .replace(/\(.*?\)|\[.*?\]/g, '') // Remove parênteses e colchetes e o conteúdo dentro
        .replace(/official\s*(music\s*)?video|visualizer|audio|lyrics|lyric\s*video|hd|hq|4k|remix|live/gi, '')
        .replace(/[-–—]/g, ' ')
        .trim();

      const cleanArtist = (rawArtist || '')
        .replace(/- Topic/gi, '')
        .replace(/vevo/gi, '')
        .replace(/[-–—]/g, ' ')
        .trim();

      try {
        // Tentativa 1: Busca estruturada exata usando track_name e artist_name
        const exactParams = new URLSearchParams({
          track_name: cleanTitle,
          artist_name: cleanArtist
        });

        let response = await fetch(`https://lrclib.net/api/get?${exactParams.toString()}`);
        let bestMatch = null;

        if (response.ok) {
          bestMatch = await response.json();
        }

        // Se a busca exata falhar, tenta a busca geral por texto inteligente
        if (!bestMatch || (!bestMatch.syncedLyrics && !bestMatch.plainLyrics)) {
          const generalParams = new URLSearchParams({
            q: `${cleanArtist} ${cleanTitle}`.trim()
          });
          const searchResponse = await fetch(`https://lrclib.net/api/search?${generalParams.toString()}`);
          if (searchResponse.ok) {
            const results = await searchResponse.json();
            if (results && results.length > 0) {
              // Filtra o resultado que melhor se aproxima do artista correto
              bestMatch = results.find(
                (item) =>
                  item.artistName &&
                  item.artistName.toLowerCase().includes(cleanArtist.toLowerCase().split(' ')[0])
              ) || results[0];
            }
          }
        }

        if (isCancelled) return;

        if (bestMatch && (bestMatch.syncedLyrics || bestMatch.plainLyrics)) {
          if (bestMatch.syncedLyrics) {
            const parsedLines = parseSyncedLyrics(bestMatch.syncedLyrics);
            setLyricsData({
              loading: false,
              synced: parsedLines,
              plain: bestMatch.plainLyrics || '',
              error: null
            });
          } else {
            setLyricsData({
              loading: false,
              synced: [],
              plain: bestMatch.plainLyrics,
              error: null
            });
          }
        } else {
          setLyricsData({
            loading: false,
            synced: [],
            plain: '',
            error: `Não encontramos a letra exata para "${cleanTitle}" de ${cleanArtist}.`
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setLyricsData({
            loading: false,
            synced: [],
            plain: '',
            error: 'Erro de conexão ao buscar a letra.'
          });
        }
      }
    }

    fetchSyncedLyrics();
    return () => {
      isCancelled = true;
    };
  }, [roomState?.playback?.videoId]);

  // 6. Inicializa ou atualiza o Player do YouTube quando há uma música ativa na sala
  useEffect(() => {
    if (!inRoom || !roomState || (!isHost && !audioUnlocked)) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      const playerDiv = document.getElementById('yt-music-player');
      if (!playerDiv) {
        setTimeout(initPlayer, 200);
        return;
      }

      if (!playerRef.current) {
        playerRef.current = new window.YT.Player('yt-music-player', {
          height: '100%',
          width: '100%',
          videoId: roomStateRef.current?.playback?.videoId || '',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(volumeRef.current);
              if (roomStateRef.current?.playback?.videoId) {
                syncGuestPlayerWithRoom(event.target, roomStateRef.current);
              }
            },
            onStateChange: (event) => {
              // YouTube Player State 0 = ENDED
              if (event.data === window.YT.PlayerState.ENDED) {
                if (isHostRef.current) {
                  handleSkipNextRef.current();
                }
              }
            },
            onError: (err) => {
              console.warn('YouTube Player onError:', err);
              if (isHostRef.current) {
                handleSkipNextRef.current();
              }
            }
          }
        });
      }
    };

    if (roomState.playback?.videoId) {
      initPlayer();
    }
  }, [inRoom, audioUnlocked, isHost, roomState?.playback?.videoId]);

  // 7. Sincronização de vídeo e Drift Correction (Regra dos 2 segundos)
  const syncGuestPlayerWithRoom = (player, state) => {
    if (!player || typeof player.getCurrentTime !== 'function') return;

    const { videoId, isPlaying, trackPosition, updatedAt } = state.playback;
    if (!videoId) return;

    const loadedVideoUrl = player.getVideoUrl ? player.getVideoUrl() : '';
    if (!loadedVideoUrl || !loadedVideoUrl.includes(videoId)) {
      if (typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
      }
    }

    const elapsedSeconds = isPlaying ? (Date.now() - updatedAt) / 1000 : 0;
    const targetTime = trackPosition + elapsedSeconds;
    const currentLocalTime = player.getCurrentTime() || 0;

    if (Math.abs(currentLocalTime - targetTime) > 2) {
      if (typeof player.seekTo === 'function') {
        player.seekTo(targetTime, true);
      }
    }

    if (typeof player.getPlayerState === 'function') {
      const playerState = player.getPlayerState();
      if (isPlaying && playerState !== 1) {
        player.playVideo();
      } else if (!isPlaying && playerState !== 2) {
        player.pauseVideo();
      }
    }
  };

  useEffect(() => {
    if (!inRoom || !roomState || !playerRef.current || !roomState.playback.videoId) return;
    syncGuestPlayerWithRoom(playerRef.current, roomState);
  }, [roomState?.playback?.videoId, roomState?.playback?.isPlaying]);

  // 8. Loop de alta precisão (250ms) para acompanhar a letra estilo BetterLyrics + Heartbeat e detecção de término
  useEffect(() => {
    if (!inRoom) return;

    let lastHeartbeatSecond = -1;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === 'function') {
        const curr = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        setLocalProgress(curr);
        setDuration(dur);

        const currentRoom = roomStateRef.current;
        if (!currentRoom) return;

        // Detecção segura de término de faixa para o Host (garante que avança mesmo se o evento do YouTube atrasar)
        if (
          isHostRef.current &&
          dur > 5 &&
          curr >= dur - 0.5 &&
          currentRoom.playback.isPlaying
        ) {
          handleSkipNextRef.current();
          return;
        }

        const currentWholeSec = Math.floor(curr);
        if (
          isHostRef.current &&
          currentRoom.playback.isPlaying &&
          currentWholeSec > 0 &&
          currentWholeSec % 5 === 0 &&
          currentWholeSec !== lastHeartbeatSecond
        ) {
          lastHeartbeatSecond = currentWholeSec;
          broadcastRoomState({
            ...currentRoom,
            playback: {
              ...currentRoom.playback,
              trackPosition: curr,
              updatedAt: Date.now()
            }
          });
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [inRoom]);

  // Calcula qual verso da letra está ativo neste exato momento
  const activeLyricIndex = React.useMemo(() => {
    if (!lyricsData.synced.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyricsData.synced.length; i++) {
      if (localProgress + 0.25 >= lyricsData.synced[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyricsData.synced, localProgress]);

  // Faz auto-scroll suave estilo BetterLyrics para centralizar o verso atual
  useEffect(() => {
    if (activeTab === 'lyrics' && activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLyricIndex, activeTab]);

  // Criar Sala como Anfitrião (Inicia com fila e player vazios para o usuário buscar)
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Escolha o seu nome de usuário para continuar.');
      return;
    }

    const generatedRoomId = 'PT-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const newRoom = {
      roomId: generatedRoomId,
      roomName: roomNameInput.trim() || 'Sessão Party Together',
      pinCode: pinInput.trim() || '1234',
      hostId: userId,
      hostName: username.trim(),
      members: [
        {
          id: userId,
          name: username.trim(),
          avatar: userAvatar,
          isHost: true
        }
      ],
      playback: {
        videoId: null,
        title: 'Nenhuma música tocando',
        artist: 'Busque uma música ao lado para começar a festa!',
        thumbnail: null,
        addedBy: null,
        isPlaying: false,
        trackPosition: 0,
        updatedAt: Date.now()
      },
      queue: []
    };

    try {
      localStorage.setItem(`party_room_${generatedRoomId}`, JSON.stringify(newRoom));
    } catch {}

    setRoomState(newRoom);
    setAudioUnlocked(true);
    setInRoom(true);
    setActiveTab('search');
    setErrorMsg('');
  };

  // Entrar numa Sala existente com Avatar Fofo Aleatório
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Digite o seu nome para entrar na sala.');
      return;
    }

    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Digite o código da sala (ex.: PT-XXXX).');
      return;
    }

    setIsJoiningRoom(true);
    setErrorMsg('');

    try {
      const foundRoom = await lookupRoomState(cleanCode);

      if (!foundRoom) {
        setErrorMsg('Sala não encontrada! Verifique o código e certifique-se de que a sala está aberta.');
        setIsJoiningRoom(false);
        return;
      }

      if (foundRoom.pinCode && foundRoom.pinCode !== pinInput.trim()) {
        setErrorMsg('Código PIN incorreto para esta sala.');
        setIsJoiningRoom(false);
        return;
      }

      const updatedMembers = (foundRoom.members || []).some((m) => m.id === userId)
        ? foundRoom.members
        : [
            ...(foundRoom.members || []),
            {
              id: userId,
              name: username.trim(),
              avatar: userAvatar,
              isHost: false
            }
          ];

      const updatedRoom = {
        ...foundRoom,
        members: updatedMembers
      };

      try {
        localStorage.setItem(`party_room_${cleanCode}`, JSON.stringify(updatedRoom));
      } catch {}

      setRoomState(updatedRoom);
      setInRoom(true);
      setErrorMsg('');
      setIsJoiningRoom(false);
    } catch (err) {
      console.error('Erro ao conectar à sala:', err);
      setErrorMsg('Falha ao conectar à sala. Tente novamente.');
      setIsJoiningRoom(false);
    }
  };

  // Controles do Anfitrião: Play / Pause
  const handleTogglePlay = () => {
    const currentRoom = roomStateRef.current;
    if (!isHostRef.current || !playerRef.current || !currentRoom?.playback?.videoId) return;
    const nextPlayingState = !currentRoom.playback.isPlaying;
    const currentPos = playerRef.current.getCurrentTime() || 0;

    if (nextPlayingState) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }

    broadcastRoomState({
      ...currentRoom,
      playback: {
        ...currentRoom.playback,
        isPlaying: nextPlayingState,
        trackPosition: currentPos,
        updatedAt: Date.now()
      }
    });
  };

  // Controles do Anfitrião: Avançar para a próxima música da fila
  const handleSkipNext = () => {
    const currentRoom = roomStateRef.current;
    if (!isHostRef.current || !currentRoom) return;

    // Se a fila estiver vazia, apenas encerra a reprodução
    if (!currentRoom.queue || currentRoom.queue.length === 0) {
      broadcastRoomState({
        ...currentRoom,
        playback: {
          videoId: null,
          title: 'Fila vazia',
          artist: 'Adicione mais músicas para continuar a festa!',
          thumbnail: null,
          addedBy: null,
          isPlaying: false,
          trackPosition: 0,
          updatedAt: Date.now()
        }
      });
      return;
    }

    const sortedQueue = [...currentRoom.queue].sort((a, b) => b.votes - a.votes);
    const nextTrack = sortedQueue[0];
    const remainingQueue = sortedQueue.slice(1);

    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(nextTrack.videoId);
    }

    broadcastRoomState({
      ...currentRoom,
      playback: {
        videoId: nextTrack.videoId,
        title: nextTrack.title,
        artist: nextTrack.artist,
        thumbnail: nextTrack.thumbnail,
        addedBy: nextTrack.addedBy,
        isPlaying: true,
        trackPosition: 0,
        updatedAt: Date.now()
      },
      queue: remainingQueue
    });
  };
  handleSkipNextRef.current = handleSkipNext;

  // Adicionar música: Se não houver música tocando ainda, inicia imediatamente no Player!
  const handleAddTrack = (track) => {
    const currentRoom = roomStateRef.current;
    if (!currentRoom) return;

    if (isHostRef.current) {
      if (!currentRoom.playback.videoId) {
        if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById(track.videoId);
        }

        broadcastRoomState({
          ...currentRoom,
          playback: {
            videoId: track.videoId,
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumbnail,
            addedBy: username,
            isPlaying: true,
            trackPosition: 0,
            updatedAt: Date.now()
          }
        });
        setActiveTab('lyrics');
        return;
      }

      const newQueueItem = {
        ...track,
        id: 'q_' + Math.random().toString(36).substring(2, 9),
        addedBy: username,
        votes: 1
      };

      broadcastRoomState({
        ...currentRoom,
        queue: [...(currentRoom.queue || []), newQueueItem]
      });
      setActiveTab('queue');
    } else {
      // Convidado envia a ação em tempo real para o Host via WebSocket MQTT
      if (syncServiceRef.current) {
        syncServiceRef.current.sendAction({
          type: 'ADD_TO_QUEUE',
          track,
          senderId: userId,
          senderName: username
        });
      }
      setActiveTab('queue');
    }
  };

  // Adicionar por Link Direto do YouTube
  const handleAddCustomYoutubeUrl = (e) => {
    e.preventDefault();
    const extractedId = extractYouTubeId(searchQuery.trim());
    if (!extractedId) return;

    handleAddTrack({
      videoId: extractedId,
      title: `Faixa do YouTube (${extractedId})`,
      artist: 'Link Direto',
      duration: 'Ao vivo',
      thumbnail: `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`
    });
    setSearchQuery('');
  };

  // Votar numa música da fila
  const handleVoteTrack = (itemId) => {
    if (isHostRef.current) {
      const currentRoom = roomStateRef.current;
      if (!currentRoom) return;
      const updatedQueue = (currentRoom.queue || [])
        .map((item) => (item.id === itemId ? { ...item, votes: item.votes + 1 } : item))
        .sort((a, b) => b.votes - a.votes);

      broadcastRoomState({
        ...currentRoom,
        queue: updatedQueue
      });
    } else {
      if (syncServiceRef.current) {
        syncServiceRef.current.sendAction({
          type: 'VOTE_TRACK',
          itemId,
          senderId: userId
        });
      }
    }
  };

  // Clicar num verso da letra (se for o Anfitrião, avança a música para aquele verso igual ao BetterLyrics)
  const handleSeekToLyric = (timeInSeconds) => {
    const currentRoom = roomStateRef.current;
    if (!isHostRef.current || !playerRef.current || typeof playerRef.current.seekTo !== 'function' || !currentRoom) return;
    playerRef.current.seekTo(timeInSeconds, true);
    setLocalProgress(timeInSeconds);

    broadcastRoomState({
      ...currentRoom,
      playback: {
        ...currentRoom.playback,
        trackPosition: timeInSeconds,
        updatedAt: Date.now()
      }
    });
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
    }
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ============================================================================
  // TELA 1: LOGIN / LOBBY COM FUNDO MOSAICO DE ÁLBUNS ESTILO NETFLIX & SPOTIFY
  // ============================================================================
  if (!inRoom) {
    return (
      <div className="relative min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Mosaico Diagonal de Capas de Álbuns Famosos ao Fundo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-4 opacity-35 scale-125 -rotate-6 transform origin-center">
            {[...ALBUM_MOSAIC_COVERS, ...ALBUM_MOSAIC_COVERS].map((coverUrl, index) => (
              <div
                key={index}
                className="aspect-square rounded-xl overflow-hidden shadow-lg bg-zinc-900 border border-white/5"
              >
                <img
                  src={coverUrl}
                  alt=""
                  className="w-full h-full object-cover filter saturate-125 contrast-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {/* Vinheta Gradiente Estilo Netflix / Spotify sobre as capas */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,#09090b_85%)]" />
        </div>

        {/* Card Central de Entrada */}
        <div className="relative z-10 w-full max-w-md bg-zinc-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/80">
          <div className="flex items-center gap-3.5 mb-6">
            <PartyTogetherLogo className="w-13 h-13" iconSize="w-7 h-7" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Party Together
              </h1>
              <p className="text-xs text-zinc-400">
                Ouça YouTube Music sincronizado com letras ao vivo
              </p>
            </div>
          </div>

          {/* Preview do Perfil Fofo Aleatório do Usuário */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 mb-5">
            <img
              src={userAvatar}
              alt="Seu Avatar"
              className="w-12 h-12 rounded-full border-2 border-red-500/60 shadow-md shrink-0 bg-zinc-800"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-red-400 font-bold block">
                Seu Avatar na Festa
              </span>
              <input
                type="text"
                placeholder="Digite seu Nickname..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-0.5 bg-transparent text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none border-b border-zinc-800 focus:border-red-500 pb-0.5"
              />
            </div>
          </div>

          {/* Alternador Criar vs Entrar */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/90 rounded-xl mb-5 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setErrorMsg('');
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${mode === 'create'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Criar Sessão (Host)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('join');
                setErrorMsg('');
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${mode === 'join'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Entrar com Código
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={mode === 'create' ? handleCreateRoom : handleJoinRoom} className="space-y-4">
            {mode === 'create' ? (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Nome da Festa / Sala
                </label>
                <input
                  type="text"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950/90 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Código da Sala (Ex: PT-A1B2)
                </label>
                <input
                  type="text"
                  placeholder="PT-XXXX"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-zinc-950/90 border border-zinc-800 rounded-xl text-sm uppercase focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                PIN de Acesso da Sala
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="1234"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/90 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoiningRoom}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:brightness-110 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isJoiningRoom ? (
                <>
                  <Disc3 className="w-5 h-5 animate-spin" /> Conectando à Sala...
                </>
              ) : mode === 'create' ? (
                'Criar Party & Escolher Músicas'
              ) : (
                'Entrar na Party'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TELA 2: SALA ATIVA (PLAYER SINCRONIZADO + BETTERLYRICS + BUSCA YT MUSIC)
  // ============================================================================
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col relative overflow-hidden">
      {/* Brilho ambiente dinâmico baseado na capa da música atual */}
      {roomState.playback.thumbnail && (
        <div
          className="pointer-events-none fixed inset-0 opacity-15 blur-3xl scale-125 transition-all duration-1000"
          style={{
            backgroundImage: `url(${roomState.playback.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Cabeçalho da Sala com o Ícone Oficial */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-900/75 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PartyTogetherLogo className="w-10 h-10" iconSize="w-5 h-5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base">{roomState.roomName}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {roomState.roomId}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800/60">
                PIN: {roomState.pinCode}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Anfitrião: <strong className="text-zinc-200">{roomState.hostName}</strong> •{' '}
              {roomState.members.length} na festa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              navigator.clipboard.writeText(`Sala: ${roomState.roomId} | PIN: ${roomState.pinCode}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold transition cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copiado!' : 'Convidar Amigos'}
          </button>

          <button
            onClick={() => {
              if (syncServiceRef.current) {
                syncServiceRef.current.sendAction({
                  type: 'USER_LEFT',
                  userId
                });
                syncServiceRef.current.destroy();
                syncServiceRef.current = null;
              }
              setInRoom(false);
              if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Player Sincronizado + Participantes com Avatares Fofos */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 flex flex-col items-center text-center relative overflow-hidden shadow-xl">
            {/* Desbloqueio de Áudio para Convidados */}
            {!isHost && !audioUnlocked && (
              <div className="absolute inset-0 z-20 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
                <PartyTogetherLogo className="w-14 h-14 mb-4 animate-bounce" iconSize="w-8 h-8" />
                <h3 className="font-bold text-lg mb-1">A festa está rolando ao vivo!</h3>
                <p className="text-xs text-zinc-400 mb-5">
                  Clique abaixo para ativar o som no seu navegador e sincronizar com o anfitrião.
                </p>
                <button
                  onClick={() => setAudioUnlocked(true)}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold rounded-full shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  🔊 Sincronizar e Ouvir Agora
                </button>
              </div>
            )}

            {/* Container do YouTube IFrame Player mantido sempre no DOM */}
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 mb-4 border border-zinc-800 shadow-inner flex items-center justify-center relative">
              <div id="yt-music-player" className={`w-full h-full ${roomState.playback.videoId ? 'block' : 'hidden'}`}></div>
              {!roomState.playback.videoId && (
                <div className="flex flex-col items-center justify-center p-6 text-zinc-500 absolute inset-0">
                  <PartyTogetherLogo className="w-12 h-12 mb-3 opacity-80" iconSize="w-6 h-6" />
                  <p className="text-xs font-medium text-zinc-400">
                    Use a aba &ldquo;Buscar Música&rdquo; ao lado para escolher a primeira faixa!
                  </p>
                </div>
              )}
            </div>

            {roomState.playback.addedBy && (
              <span className="text-[11px] uppercase tracking-wider text-red-400 font-semibold mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Escolhida por {roomState.playback.addedBy}
              </span>
            )}
            <h3 className="text-xl font-bold line-clamp-1">{roomState.playback.title}</h3>
            <p className="text-sm text-zinc-400 mb-4">{roomState.playback.artist}</p>

            {/* Barra de Progresso */}
            <div className="w-full mb-4">
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                  style={{
                    width: `${duration ? Math.min(100, (localProgress / duration) * 100) : 0}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-500 mt-1 font-mono">
                <span>{formatTime(localProgress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controles do Player */}
            <div className="w-full flex items-center justify-between gap-4 pt-2 border-t border-zinc-800/80">
              {isHost ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlay}
                    disabled={!roomState.playback.videoId}
                    className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 flex items-center justify-center text-white shadow-md transition cursor-pointer"
                    title="Play / Pause para toda a sala"
                  >
                    {roomState.playback.isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={handleSkipNext}
                    disabled={roomState.queue.length === 0}
                    className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 flex items-center justify-center text-white transition cursor-pointer"
                    title="Pular para a próxima música da fila"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 ml-1">
                    <Crown className="w-3.5 h-3.5" /> Anfitrião
                  </span>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado com {roomState.hostName}
                </div>
              )}

              {/* Volume Local */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextMute = !isMuted;
                    setIsMuted(nextMute);
                    if (playerRef.current && playerRef.current.setVolume) {
                      playerRef.current.setVolume(nextMute ? 0 : volume);
                    }
                  }}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-red-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Lista de Participantes com Fotos Fofas Aleatórias */}
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 shadow-xl">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-red-500" /> Galera na Party ({roomState.members.length})
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {roomState.members.map((m) => (
                <div
                  key={m.id}
                  className="pl-1.5 pr-3 py-1 rounded-full text-xs bg-zinc-950 border border-zinc-800 flex items-center gap-2 shadow-sm"
                >
                  <img
                    src={m.avatar || getRandomCuteAvatar(m.name)}
                    alt={m.name}
                    className="w-6 h-6 rounded-full bg-zinc-800 object-cover border border-red-500/40"
                  />
                  <span className="font-medium text-zinc-200">{m.name}</span>
                  {m.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Abas (Buscar Música | Fila Colaborativa | BetterLyrics) */}
        <div className="lg:col-span-7 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 flex flex-col shadow-xl min-h-[520px]">
          <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3.5 mb-4 gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${activeTab === 'search'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
              >
                <Search className="w-3.5 h-3.5" /> Buscar Música
              </button>

              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${activeTab === 'queue'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
              >
                <ListMusic className="w-3.5 h-3.5" /> Fila ({roomState.queue.length})
              </button>

              <button
                onClick={() => setActiveTab('lyrics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${activeTab === 'lyrics'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
              >
                <Mic2 className="w-3.5 h-3.5" /> Letra (BetterLyrics)
              </button>
            </div>
          </div>

          {/* ABA 1: BUSCA DO YOUTUBE MUSIC (INICIA VAZIA) */}
          {activeTab === 'search' && (
            <div className="flex-1 flex flex-col">
              <form onSubmit={handleAddCustomYoutubeUrl} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Digite o nome da música, artista ou cole um link do YouTube..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                {extractYouTubeId(searchQuery) && (
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                  >
                    Adicionar Link
                  </button>
                )}
              </form>

              <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1 flex-1">
                {isSearching ? (
                  <div className="text-center py-14 text-zinc-400 text-sm flex flex-col items-center gap-3">
                    <Disc3 className="w-7 h-7 text-red-500 animate-spin" />
                    <span>Buscando no catálogo do YouTube Music...</span>
                  </div>
                ) : !searchQuery.trim() ? (
                  <div className="text-center py-16 text-zinc-500 flex flex-col items-center">
                    <PartyTogetherLogo className="w-12 h-12 mb-3 opacity-60" iconSize="w-6 h-6" />
                    <p className="text-sm font-medium text-zinc-300">
                      Sua playlist colaborativa começa aqui!
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                      Pesquise qualquer música ou artista acima para tocar agora ou adicionar à fila da festa.
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center py-12 text-zinc-500 text-sm">
                    Nenhuma música encontrada para &ldquo;{searchQuery}&rdquo;.
                  </p>
                ) : (
                  searchResults.map((track) => (
                    <div
                      key={track.videoId}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{track.title}</p>
                          <p className="text-xs text-zinc-400 truncate">
                            {track.artist} • {track.duration}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddTrack(track)}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-600/40 text-xs font-bold transition shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {!roomState.playback.videoId ? 'Tocar Agora' : 'Na Fila'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA 2: FILA DA FESTA (INICIA VAZIA) */}
          {activeTab === 'queue' && (
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[440px] pr-1">
              {roomState.queue.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 flex flex-col items-center">
                  <PartyTogetherLogo className="w-12 h-12 mb-3 opacity-60" iconSize="w-6 h-6" />
                  <p className="text-sm font-medium text-zinc-300">A fila está vazia no momento</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="mt-3 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-red-400 font-semibold transition cursor-pointer"
                  >
                    + Buscar músicas no YouTube Music
                  </button>
                </div>
              ) : (
                roomState.queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-zinc-500 w-5 text-center">
                        #{idx + 1}
                      </span>
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <p className="text-xs text-zinc-400 truncate">
                          {item.artist} • <span className="text-zinc-500">por {item.addedBy}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleVoteTrack(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold shrink-0 transition cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-red-400" />
                      <span>{item.votes}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 3: LETRAS SINCRONIZADAS ESTILO BETTERLYRICS */}
          {activeTab === 'lyrics' && (
            <div
              ref={lyricsContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden max-h-[440px] px-4 sm:px-8 py-12 rounded-2xl bg-gradient-to-b from-zinc-950/90 via-zinc-950/60 to-zinc-950/90 border border-zinc-800/70 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {!roomState.playback.videoId ? (
                <div className="text-center py-16 text-zinc-500 flex flex-col items-center">
                  <Mic2 className="w-10 h-10 mb-2 opacity-40 text-red-400" />
                  <p className="text-sm">Escolha uma música para ver a letra sincronizada aqui!</p>
                </div>
              ) : lyricsData.loading ? (
                <div className="text-center py-16 text-zinc-400 flex flex-col items-center gap-3">
                  <Disc3 className="w-7 h-7 text-red-500 animate-spin" />
                  <span className="text-sm">Sincronizando letra de &ldquo;{roomState.playback.title}&rdquo;...</span>
                </div>
              ) : lyricsData.synced.length > 0 ? (
                <div className="space-y-8 py-20 w-full max-w-2xl mx-auto text-center transition-all duration-700">
                  {lyricsData.synced.map((line, index) => {
                    const isCurrent = index === activeLyricIndex;
                    const isPast = index < activeLyricIndex;

                    return (
                      <p
                        key={index}
                        ref={isCurrent ? activeLyricRef : null}
                        onClick={() => handleSeekToLyric(line.time)}
                        className={`transition-all duration-700 ease-out select-none break-words px-2 transform ${isHost ? 'cursor-pointer' : ''
                          } ${isCurrent
                            ? 'text-2xl sm:text-3xl font-extrabold text-white scale-105 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] py-1'
                            : isPast
                              ? 'text-lg sm:text-xl font-medium text-zinc-600/70 blur-[0.3px] opacity-70'
                              : 'text-lg sm:text-xl font-medium text-zinc-400/90 hover:text-zinc-200 opacity-90'
                          }`}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              ) : lyricsData.plain ? (
                <div className="whitespace-pre-line text-zinc-300 text-base leading-relaxed font-medium px-4 max-w-2xl mx-auto text-center break-words">
                  <div className="mb-4 text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/50 rounded-xl px-3 py-2">
                    Letra estática (esta faixa não possui marcação de tempo linha a linha):
                  </div>
                  {lyricsData.plain}
                </div>
              ) : (
                <div className="text-center py-16 text-zinc-500">
                  <Mic2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{lyricsData.error || 'Letra não encontrada para esta faixa.'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}