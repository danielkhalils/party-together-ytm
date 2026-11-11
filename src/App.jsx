import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  ListMusic,
  Trash2,
  MessageCircle,
  Send,
  RefreshCw,
  UserX,
  Download,
  Bell,
  BellOff,
  ImagePlus,
  X
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

const MAX_CHAT_MESSAGES = 50;
const MAX_CHAT_CHARACTERS = 300;
const MAX_AVATAR_FILE_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_DATA_LENGTH = 12000;
const PRESENCE_HEARTBEAT_MS = 15000;
const PRESENCE_TIMEOUT_MS = 45000;
const CHAT_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉'];
const CHAT_COLOR_PALETTE = [
  '#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#00d2d3', '#54a0ff', '#5f27cd', '#ff6bcb',
  '#c8d96f', '#48dbfb', '#ee5253', '#a55eea', '#26de81', '#fd9644', '#2bcbba', '#778beb'
];

function getAvailableChatColor(members = []) {
  const used = new Set(members.map((member) => member.color).filter(Boolean));
  const available = CHAT_COLOR_PALETTE.find((color) => !used.has(color));
  if (available) return available;
  for (let hue = 0; hue < 360; hue += 1) {
    const color = `hsl(${hue} 78% 66%)`;
    if (!used.has(color)) return color;
  }
  return '#ffffff';
}

function getUserColor(userId = '') {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 78% 66%)`;
}

function playChatMessageChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // Suave e moderno som "pop/chime" de notificação de mensagem (duas notas)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);

    setTimeout(() => {
      try { ctx.close(); } catch {}
    }, 400);
  } catch {}
}

function ensureMemberChatColors(room) {
  if (!room) return room;
  const usedColors = new Set();
  const members = (room.members || []).map((member) => {
    const color = member.color && !usedColors.has(member.color) ? member.color : getAvailableChatColor([...usedColors].map((usedColor) => ({ color: usedColor })));
    usedColors.add(color);
    return member.color === color ? member : { ...member, color };
  });
  const colorsById = new Map(members.map((member) => [member.id, member.color]));
  const chat = (room.chat || []).slice(-MAX_CHAT_MESSAGES).map((message) => {
    const tenorGif = message.type === 'gif' ? normalizeTenorGifUrl(message.gifUrl || '') : null;
    const normalized = {
      type: message.type === 'gif' && tenorGif ? 'gif' : 'text',
      text: String(message.text || '').slice(0, MAX_CHAT_CHARACTERS),
      gifKind: tenorGif?.kind,
      gifUrl: tenorGif?.url,
      color: colorsById.get(message.senderId) || message.color || getUserColor(message.senderId)
    };
    return Object.keys(normalized).every((key) => message[key] === normalized[key]) ? message : { ...message, ...normalized };
  });
  return { ...room, members, chat };
}

const ChatMessageBubble = React.memo(function ChatMessageBubble({ message }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-bold" style={{ color: message.color }}>
          {message.senderName}
        </span>
        <time className="shrink-0 text-[10px] text-zinc-600">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
      {message.type === 'gif' ? (
        message.gifKind === 'image' ? (
          <img
            src={message.gifUrl}
            alt={`GIF enviado por ${message.senderName}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="mt-1 h-36 w-44 max-w-full rounded-xl bg-zinc-900 object-contain"
          />
        ) : (
          <a href={message.gifUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-red-300 underline">
            Abrir GIF no Tenor
          </a>
        )
      ) : (
        <p className="break-words whitespace-pre-wrap text-sm text-zinc-200">{message.text}</p>
      )}
    </div>
  );
});

function TenorGifModal({
  query,
  onQueryChange,
  results,
  isSearching,
  error,
  manualLink,
  onManualLinkChange,
  isSending,
  onChoose,
  onSendLink,
  onClose
}) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl" role="dialog" aria-modal="true" aria-label="Selecionar GIF do Tenor">
        <div className="flex items-center gap-2 border-b border-zinc-800 p-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white">Selecionar GIF</h2>
            <p className="text-[10px] text-zinc-500">GIFs do Tenor</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Fechar seletor de GIFs">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              maxLength={80}
              placeholder="Buscar GIFs no Tenor"
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none"
            />
            {isSearching && <Disc3 className="h-4 w-4 animate-spin text-red-400" />}
          </div>
        </div>
        <div className="grid max-h-[48vh] grid-cols-2 gap-2 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {results.map((gif) => (
            <button
              key={gif.id}
              type="button"
              disabled={isSending}
              onClick={() => onChoose(gif)}
              title={gif.title}
              className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 hover:border-red-500 disabled:opacity-50"
            >
              <img src={gif.previewUrl} alt={gif.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-28 w-full bg-zinc-950 object-contain" />
            </button>
          ))}
          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <p className="col-span-2 py-8 text-center text-xs text-zinc-500">Nenhum GIF encontrado.</p>
          )}
          {!query.trim() && <p className="col-span-2 py-8 text-center text-xs text-zinc-500">Digite para buscar e selecione um GIF.</p>}
        </div>
        {error && <p className="px-3 pb-2 text-xs text-red-300">{error}</p>}
        <form onSubmit={(event) => { event.preventDefault(); onSendLink(); }} className="flex gap-2 border-t border-zinc-800 p-3">
          <input
            value={manualLink}
            onChange={(event) => onManualLinkChange(event.target.value)}
            maxLength={2000}
            placeholder="Ou cole um link compartilhado do Tenor"
            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs focus:border-red-500 focus:outline-none"
          />
          <button type="submit" disabled={!manualLink.trim() || isSending} className="rounded-lg bg-zinc-800 px-3 text-xs font-bold text-white disabled:opacity-40">
            {isSending ? '...' : 'Enviar'}
          </button>
        </form>
      </section>
    </div>,
    document.body
  );
}

function AlbumBackdrop({ src }) {
  const latestSrcRef = useRef(src);
  const nextLayerIdRef = useRef(1);
  const [layers, setLayers] = useState(() => src ? [{ id: 0, src, visible: true }] : []);

  useEffect(() => {
    if (src === latestSrcRef.current) return;
    latestSrcRef.current = src;
    if (!src) {
      setLayers([]);
      return;
    }
    const id = nextLayerIdRef.current++;
    setLayers((previous) => [
      ...previous.filter((layer) => layer.visible).slice(-1),
      { id, src, visible: false }
    ]);
  }, [src]);

  const handleImageLoaded = (id, imageSrc) => {
    if (latestSrcRef.current !== imageSrc) {
      setLayers((previous) => previous.filter((layer) => layer.id !== id));
      return;
    }
    setLayers((previous) => previous.map((layer) => ({ ...layer, visible: layer.id === id })));
  };

  if (!layers.length) return null;
  return (
    <>
      {layers.map((layer) => (
        <img
          key={layer.id}
          src={layer.src}
          alt=""
          aria-hidden="true"
          fetchPriority="low"
          decoding="async"
          onLoad={() => handleImageLoaded(layer.id, layer.src)}
          onError={() => setLayers((previous) => previous.filter((item) => item.id !== layer.id))}
          onTransitionEnd={(event) => {
            if (event.propertyName === 'opacity' && !layer.visible) {
              setLayers((previous) => previous.filter((item) => item.id !== layer.id));
            }
          }}
          className={`pointer-events-none fixed inset-0 z-0 h-full w-full scale-110 object-cover blur-[48px] transition-opacity duration-1000 ease-in-out ${layer.visible ? 'opacity-35' : 'opacity-0'}`}
        />
      ))}
      <div className="pointer-events-none fixed inset-0 z-0 bg-zinc-950/45" />
    </>
  );
}

function normalizeTenorGifUrl(rawUrl) {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'https:') return null;
    if (['media.tenor.com', 'media1.tenor.com', 'media.tenor.co', 'media1.tenor.co'].includes(url.hostname) && /\.gif$/i.test(url.pathname)) {
      return { kind: 'image', url: url.href };
    }
    if (url.hostname === 'tenor.com' || url.hostname === 'www.tenor.com') {
      if (/^\/[\w-]+\.gif$/i.test(url.pathname) || /^\/embed\/\d+\/?$/i.test(url.pathname) || /^\/view\/.+-(\d+)\/?$/i.test(url.pathname)) {
        return { kind: 'resolve', url: url.href };
      }
    }
  } catch {}
  return null;
}

function compressAvatarImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const maxSide = 96;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Não foi possível processar a imagem.'));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let result = canvas.toDataURL('image/webp', 0.62);
        if (result.length > MAX_AVATAR_DATA_LENGTH) result = canvas.toDataURL('image/jpeg', 0.55);
        if (result.length > MAX_AVATAR_DATA_LENGTH) {
          const downScale = 72 / Math.max(canvas.width, canvas.height);
          canvas.width = Math.max(1, Math.round(canvas.width * downScale));
          canvas.height = Math.max(1, Math.round(canvas.height * downScale));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          result = canvas.toDataURL('image/jpeg', 0.45);
        }
        if (result.length > MAX_AVATAR_DATA_LENGTH) return reject(new Error('A imagem ainda ficou grande após a compressão.'));
        resolve(result);
      } catch {
        reject(new Error('Não foi possível processar esta imagem.'));
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível abrir este arquivo de imagem.'));
    };
    image.src = objectUrl;
  });
}

function NewsPanel({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Novidades da aplicação">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="h-5 w-5 text-amber-400" /> Novidades</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Fechar novidades"><X className="h-5 w-5" /></button>
        </div>
        <ul className="space-y-3 text-sm text-zinc-300">
          <li>• Fila sem duplicatas, com remoção controlada e votos únicos.</li>
          <li>• Chat com emojis, GIFs do Tenor e histórico limitado a 50 mensagens.</li>
          <li>• Avatares personalizados, incluindo imagem do seu dispositivo.</li>
          <li>• Correções de sincronização e instalação como webapp.</li>
          <li>• Áudio com a tela bloqueada depende do suporte do navegador ao player incorporado do YouTube.</li>
        </ul>
      </div>
    </div>
  );
}

function InstallHelpPanel({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Como instalar o Party Together">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Download className="h-5 w-5 text-red-400" /> Instalar / adicionar</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Fechar instruções"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto text-sm text-zinc-300">
          <p>O app requer uma URL pública HTTPS para ser instalado. Se o navegador oferecer o botão de instalação, ele será aberto automaticamente.</p>
          <div><strong className="text-white">Chrome / ChromeOS:</strong> menu ⋮ → “Instalar página como app”. No ChromeOS, o app instalado aparece no launcher e pode ser fixado na prateleira. Para a barra lateral, carregue a extensão da pasta <code>browser-extensions/chrome</code>.</div>
          <div><strong className="text-white">Opera:</strong> use o menu para instalar a página como app. Para a sidebar do Opera, carregue a extensão da pasta <code>browser-extensions/opera</code>.</div>
          <div><strong className="text-white">Samsung Internet:</strong> menu ☰ → “Adicionar página a” → “Tela inicial”. O Samsung Internet não expõe uma API pública de sidebar para sites; extensões móveis dependem do programa de parceiros/Galaxy Store.</div>
          <p className="text-xs text-zinc-500">As extensões Chrome/Opera pedem o endereço HTTPS do app na primeira abertura e o guardam localmente neste navegador.</p>
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-zinc-800 py-2.5 text-sm font-bold hover:bg-zinc-700">Entendi</button>
      </div>
    </div>
  );
}

// Utilitário para extrair ID do YouTube se o usuário colar um link direto
function extractYouTubeId(input) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = input.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function createPlaylistItem(track, addedBy, status = 'queued') {
  return {
    ...track,
    id: 'track_' + Math.random().toString(36).substring(2, 10),
    addedBy,
    votes: 1,
    status
  };
}

const INITIAL_PLAYBACK_STATE = {
  videoId: null,
  title: 'Nenhuma música tocando',
  artist: 'Busque uma música ao lado para começar a festa!',
  thumbnail: null,
  addedBy: null,
  isPlaying: false,
  trackPosition: 0,
  updatedAt: 0
};

function ensureRoomPlaylist(room) {
  if (!room || Array.isArray(room.playlist)) return room;

  const playlist = (room.queue || []).map((item) => ({ ...item, status: 'queued' }));
  let playback = room.playback;

  if (playback?.videoId) {
    const playlistItemId = playback.playlistItemId || `playing_${playback.videoId}`;
    playlist.unshift({
      id: playlistItemId,
      videoId: playback.videoId,
      title: playback.title,
      artist: playback.artist,
      thumbnail: playback.thumbnail,
      addedBy: playback.addedBy || 'Anfitrião',
      votes: 0,
      status: 'playing'
    });
    playback = { ...playback, playlistItemId };
  }

  return { ...room, playback, playlist };
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

function betterLyricsScrollEase(progress) {
  const cubic = (time, p1, p2) => 3 * (1 - time) ** 2 * time * p1 + 3 * (1 - time) * time ** 2 * p2 + time ** 3;
  let low = 0;
  let high = 1;
  let time = progress;
  for (let i = 0; i < 8; i += 1) {
    const x = cubic(time, 0.86, 0.2);
    if (Math.abs(x - progress) < 0.001) break;
    if (x < progress) low = time;
    else high = time;
    time = (low + high) / 2;
  }
  return cubic(time, 0, 1);
}

const BetterLyricsLine = React.memo(function BetterLyricsLine({ line, isCurrent, isHost, activeLineRef, seekRef }) {
  return (
    <p
      ref={isCurrent ? activeLineRef : null}
      onClick={isHost ? () => seekRef.current(line.time) : undefined}
      aria-current={isCurrent ? 'true' : undefined}
      data-active={isCurrent ? 'true' : 'false'}
      className={`better-lyrics-line select-none break-words px-2 ${isHost ? 'cursor-pointer' : ''}`}
    >
      {line.text}
    </p>
  );
}, (previous, next) =>
  previous.line === next.line && previous.isCurrent === next.isCurrent && previous.isHost === next.isHost &&
  previous.activeLineRef === next.activeLineRef && previous.seekRef === next.seekRef
);

const SyncedLyricsList = React.memo(function SyncedLyricsList({ lines, activeIndex, isHost, activeLineRef, seekRef }) {
  return (
    <div className="better-lyrics-list mx-auto w-full max-w-2xl text-center">
      {lines.map((line, index) => (
        <BetterLyricsLine
          key={`${line.time}-${index}`}
          line={line}
          isCurrent={index === activeIndex}
          isHost={isHost}
          activeLineRef={activeLineRef}
          seekRef={seekRef}
        />
      ))}
    </div>
  );
}, (previous, next) =>
  previous.lines === next.lines && previous.activeIndex === next.activeIndex && previous.isHost === next.isHost &&
  previous.activeLineRef === next.activeLineRef && previous.seekRef === next.seekRef
);

export default function App() {
  // Identidade e Avatar Fofo aleatório do usuário (persistidos para manter identidade do admin e convidados)
  const [userId] = useState(() => {
    try {
      const stored = localStorage.getItem('party_user_id');
      if (stored) return stored;
      const generated = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('party_user_id', generated);
      return generated;
    } catch {
      return 'user_' + Math.random().toString(36).substring(2, 9);
    }
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    try {
      const stored = localStorage.getItem('party_user_avatar');
      if (stored) return stored;
    } catch {}
    return getRandomCuteAvatar('party_' + Math.random().toString(36).substring(2, 8));
  });
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('party_username') || '';
    } catch {
      return '';
    }
  });

  const handleUsernameChange = (newVal) => {
    setUsername(newVal);
    try {
      localStorage.setItem('party_username', newVal);
    } catch {}
  };

  const handleAvatarChange = (newVal) => {
    setUserAvatar(newVal);
    try {
      localStorage.setItem('party_user_avatar', newVal);
    } catch {}
  };

  const [inRoom, setInRoom] = useState(false);

  // Dados de criação / entrada na sala
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).has('room') ? 'join' : 'create'); // 'create' | 'join'
  const [roomNameInput, setRoomNameInput] = useState('Sexta Indie & Pop');
  const [roomCodeInput, setRoomCodeInput] = useState(() => new URLSearchParams(window.location.search).get('room') || '');
  const [pinInput, setPinInput] = useState(() => new URLSearchParams(window.location.search).get('pin') || '1234');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  // Estado Sincronizado da Sala
  const [roomState, setRoomState] = useState(null);
  const [roomBrokerIndex, setRoomBrokerIndex] = useState(null);
  const roomRevisionRef = useRef(0);
  const joinedRoomConfirmedRef = useRef(false);

  // Estados Locais do Player no PC de cada usuário
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isResyncingPlayer, setIsResyncingPlayer] = useState(false);

  // Estados da Busca (Inicia VAZIA a critério do usuário)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Abas: 'queue' | 'search' | 'lyrics' | 'chat'
  const [activeTab, setActiveTab] = useState('search');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isChatMuted, setIsChatMuted] = useState(() => {
    try {
      return localStorage.getItem('party_chat_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [chatInput, setChatInput] = useState('');
  const [gifInput, setGifInput] = useState('');
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [isSendingGif, setIsSendingGif] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showGifInput, setShowGifInput] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const closeTenorGifModal = useCallback(() => setShowGifInput(false), []);
  const chatMessagesContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  const handleInstallApp = async () => {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }
    try {
      await installPrompt.prompt();
    } catch {
      setShowInstallHelp(true);
    } finally {
      setInstallPrompt(null);
    }
  };

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
  const lyricScrollFrameRef = useRef(null);
  const seekLyricRef = useRef(() => {});
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
  const lastAdvancedTrackRef = useRef(null);
  const lastGuestSyncAtRef = useRef(0);
  const lastPlayerUiUpdateRef = useRef(0);
  const manualSyncPendingRef = useRef(false);

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

  useEffect(() => {
    const onInstallAvailable = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => window.removeEventListener('beforeinstallprompt', onInstallAvailable);
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
      brokerIndex: roomBrokerIndex,
      onStateUpdate: (remoteState) => {
        if (remoteState?.closedAt) {
          setInRoom(false);
          setErrorMsg('A sala foi encerrada pelo anfitrião.');
          joinedRoomConfirmedRef.current = false;
          if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
          }
          return;
        }
        const nextRoom = ensureMemberChatColors(ensureRoomPlaylist(remoteState));
        if (
          !isHostRef.current && joinedRoomConfirmedRef.current &&
          !(nextRoom.members || []).some((member) => member.id === userId)
        ) {
          setInRoom(false);
          setErrorMsg('Você foi removido desta party pelo anfitrião.');
          joinedRoomConfirmedRef.current = false;
          if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
          }
          return;
        }
        if (!isHostRef.current && (nextRoom.members || []).some((member) => member.id === userId)) {
          joinedRoomConfirmedRef.current = true;
        }
        setRoomState((prev) => {
          if (!prev) {
            roomRevisionRef.current = Number(nextRoom.stateVersion) || 0;
            return nextRoom;
          }
          const currentVersion = Number(prev.stateVersion) || 0;
          const remoteVersion = Number(nextRoom.stateVersion) || 0;
          // Ignora snapshots antigos que podem chegar atrasados pelo MQTT.
          if (remoteVersion < currentVersion) return prev;
          const currentTimestamp = prev.playback?.updatedAt || 0;
          const remoteTimestamp = nextRoom.playback?.updatedAt || 0;
          if (isHostRef.current && remoteVersion === currentVersion && remoteTimestamp < currentTimestamp) {
            return prev;
          }
          roomRevisionRef.current = Math.max(roomRevisionRef.current, remoteVersion);
          const previousMessages = new Map((prev.chat || []).map((message) => [message.id, message]));
          const mergedChat = (nextRoom.chat || []).map((message) => {
            const previous = previousMessages.get(message.id);
            if (!previous) return message;
            const sameMessage = ['senderId', 'senderName', 'type', 'text', 'gifKind', 'gifUrl', 'color', 'createdAt']
              .every((key) => previous[key] === message[key]);
            return sameMessage ? previous : message;
          });
          const chatUnchanged = mergedChat.length === (prev.chat || []).length && mergedChat.every((message, index) => message === prev.chat[index]);
          return chatUnchanged ? { ...nextRoom, chat: prev.chat || [] } : { ...nextRoom, chat: mergedChat };
        });
      },
      onAction: (action) => {
        if (!isHostRef.current) return;
        handleHostProcessGuestAction(action);
      }
    });

    syncServiceRef.current = sync;
    let joinRetryTimer = null;

    if (isHost) {
      joinedRoomConfirmedRef.current = true;
      sync.broadcastState(roomStateRef.current);
    } else {
      const sendJoinAction = () => sync.sendAction({
          type: 'USER_JOINED',
          member: {
            id: userId,
            name: username.trim(),
            avatar: userAvatar,
            isHost: false,
            lastSeen: Date.now()
          }
        });
      joinedRoomConfirmedRef.current = false;
      sendJoinAction();
      joinRetryTimer = setInterval(() => {
        if (!joinedRoomConfirmedRef.current) sendJoinAction();
      }, 5000);
    }

    return () => {
      if (joinRetryTimer) clearInterval(joinRetryTimer);
      sync.destroy();
      syncServiceRef.current = null;
    };
  }, [inRoom, roomState?.roomId, isHost, roomBrokerIndex, userId, username, userAvatar]);

  // Batimento de presença dos convidados e anfitrião
  useEffect(() => {
    if (!inRoom || !roomState?.roomId) return;
    const presenceTimer = setInterval(() => {
      syncServiceRef.current?.sendAction({ type: 'USER_HEARTBEAT', userId });
    }, PRESENCE_HEARTBEAT_MS);
    const handleLeave = () => syncServiceRef.current?.sendAction({ type: 'USER_LEFT', userId });
    window.addEventListener('pagehide', handleLeave);
    return () => {
      clearInterval(presenceTimer);
      window.removeEventListener('pagehide', handleLeave);
    };
  }, [inRoom, roomState?.roomId, userId]);

  useEffect(() => {
    if (!inRoom || !isHost) return;
    const presenceSweep = setInterval(() => {
      const current = roomStateRef.current;
      if (!current) return;
      const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;
      const nextMembers = (current.members || []).filter((member) =>
        (member.lastSeen || member.joinedAt || 0) >= cutoff
      );
      if (nextMembers.length !== (current.members || []).length) {
        const remainingNonHost = nextMembers.filter((m) => m.id !== current.hostId);
        const shouldClear = remainingNonHost.length === 0;
        broadcastRoomState({
          ...current,
          members: nextMembers,
          chat: shouldClear ? [] : current.chat,
          queue: shouldClear ? [] : current.queue,
          playlist: shouldClear ? [] : current.playlist,
          playback: shouldClear ? { ...INITIAL_PLAYBACK_STATE, updatedAt: Date.now() } : current.playback
        });
      }
    }, 10000);
    return () => {
      clearInterval(presenceSweep);
    };
  }, [inRoom, isHost]);

  const broadcastRoomState = (newState) => {
    const nextVersion = Math.max(
      roomRevisionRef.current,
      Number(roomStateRef.current?.stateVersion) || 0,
      Number(newState.stateVersion) || 0
    ) + 1;
    roomRevisionRef.current = nextVersion;
    const stateWithVersion = ensureRoomPlaylist({ ...newState, stateVersion: nextVersion });
    roomStateRef.current = stateWithVersion;
    setRoomState(stateWithVersion);
    if (syncServiceRef.current) {
      syncServiceRef.current.broadcastState(stateWithVersion);
    } else {
      try {
        localStorage.setItem(`party_room_${stateWithVersion.roomId}`, JSON.stringify(stateWithVersion));
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
      const alreadyActive = currentRoom.playback?.videoId === track.videoId || (currentRoom.playlist || []).some((item) =>
        item.videoId === track.videoId && ['queued', 'playing'].includes(item.status)
      );
      if (alreadyActive) return;

      // Se não havia nenhuma música tocando na sala, começa imediatamente!
      if (!currentRoom.playback.videoId) {
        const playlistItem = { ...createPlaylistItem(track, action.senderName || 'Convidado', 'playing'), addedById: action.senderId };
        if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById(track.videoId);
        }
        broadcastRoomState({
          ...currentRoom,
          playlist: [...(currentRoom.playlist || []), playlistItem],
          playback: {
            videoId: track.videoId,
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumbnail,
            addedBy: action.senderName || 'Convidado',
            playlistItemId: playlistItem.id,
            isPlaying: true,
            trackPosition: 0,
            updatedAt: Date.now()
          }
        });
      } else {
        const newQueueItem = { ...createPlaylistItem(track, action.senderName || 'Convidado'), addedById: action.senderId, voters: action.senderId ? [action.senderId] : [] };
        broadcastRoomState({
          ...currentRoom,
          queue: [...(currentRoom.queue || []), newQueueItem],
          playlist: [...(currentRoom.playlist || []), newQueueItem]
        });
      }
    } else if (action.type === 'VOTE_TRACK') {
      const queue = currentRoom.queue || [];
      const target = queue.find((item) => item.id === action.itemId);
      if (!target || !action.senderId) return;
      const hasVoted = (target.voters || []).includes(action.senderId);
      const updatedQueue = queue
        .map((item) => {
          if (item.id !== action.itemId) return item;
          const voters = item.voters || [];
          return hasVoted
            ? { ...item, votes: Math.max(0, (item.votes || 0) - 1), voters: voters.filter((id) => id !== action.senderId) }
            : { ...item, votes: (item.votes || 0) + 1, voters: [...voters, action.senderId] };
        })
        .sort((a, b) => (b.votes || 0) - (a.votes || 0));

      broadcastRoomState({
        ...currentRoom,
        queue: updatedQueue
      });
    } else if (action.type === 'USER_JOINED') {
      if (!action.member || !action.member.id) return;
      const members = currentRoom.members || [];
      const memberIndex = members.findIndex((m) => m.id === action.member.id);
      const previousMember = members[memberIndex];
      const member = {
        ...action.member,
        isHost: false,
        lastSeen: Date.now(),
        avatar: String(action.member.avatar || '').startsWith('data:image/') && action.member.avatar.length > MAX_AVATAR_DATA_LENGTH
          ? getRandomCuteAvatar(action.member.name || action.member.id)
          : action.member.avatar,
        color: previousMember?.color || getAvailableChatColor(members)
      };
      if (
        memberIndex >= 0 && members[memberIndex].name === member.name &&
        members[memberIndex].avatar === member.avatar && members[memberIndex].color &&
        Date.now() - (members[memberIndex].lastSeen || 0) < 10000
      ) return;
      const updatedMembers = memberIndex >= 0
        ? members.map((existing, index) => index === memberIndex ? { ...existing, ...member } : existing)
        : [...members, member];
      broadcastRoomState({ ...currentRoom, members: updatedMembers });
    } else if (action.type === 'USER_LEFT') {
      const members = currentRoom.members || [];
      const updatedMembers = members.filter((m) => m.id !== action.userId);
      const remainingNonHost = updatedMembers.filter((m) => m.id !== currentRoom.hostId);
      const isHostLeaving = action.userId === currentRoom.hostId;
      const shouldClear = isHostLeaving || remainingNonHost.length === 0;

      if (updatedMembers.length === members.length && !shouldClear) return;
      broadcastRoomState({
        ...currentRoom,
        members: updatedMembers,
        chat: shouldClear ? [] : currentRoom.chat,
        queue: shouldClear ? [] : currentRoom.queue,
        playlist: shouldClear ? [] : currentRoom.playlist,
        playback: shouldClear ? { ...INITIAL_PLAYBACK_STATE, updatedAt: Date.now() } : currentRoom.playback
      });
    } else if (action.type === 'USER_HEARTBEAT') {
      const members = currentRoom.members || [];
      if (!members.some((member) => member.id === action.userId)) return;
      broadcastRoomState({
        ...currentRoom,
        members: members.map((member) => member.id === action.userId ? { ...member, lastSeen: Date.now() } : member)
      });
    } else if (action.type === 'REMOVE_TRACK') {
      const item = (currentRoom.queue || []).find((track) => track.id === action.itemId);
      if (!item || (action.senderId !== currentRoom.hostId && item.addedById !== action.senderId)) return;
      broadcastRoomState({
        ...currentRoom,
        queue: (currentRoom.queue || []).filter((track) => track.id !== action.itemId),
        playlist: (currentRoom.playlist || []).filter((track) => track.id !== action.itemId)
      });
    } else if (action.type === 'KICK_MEMBER') {
      if (action.senderId !== currentRoom.hostId || action.userId === currentRoom.hostId) return;
      const members = currentRoom.members || [];
      const nextMembers = members.filter((member) => member.id !== action.userId);
      if (nextMembers.length !== members.length) broadcastRoomState({ ...currentRoom, members: nextMembers });
    } else if (action.type === 'CHAT_MESSAGE') {
      const message = action.message;
      if (!message?.senderId) return;
      const isGif = message.type === 'gif';
      const tenorGif = isGif ? normalizeTenorGifUrl(message.gifUrl || '') : null;
      const text = String(message.text || '').trim().slice(0, MAX_CHAT_CHARACTERS);
      if ((isGif && tenorGif?.kind !== 'image') || (!isGif && !text)) return;
      const sender = (currentRoom.members || []).find((member) => member.id === message.senderId);
      const messages = [...(currentRoom.chat || []), {
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: message.senderId,
        senderName: String(message.senderName || 'Convidado').slice(0, 32),
        type: isGif ? 'gif' : 'text',
        text,
        gifKind: tenorGif?.kind,
        gifUrl: tenorGif?.url,
        color: sender?.color || getUserColor(message.senderId),
        createdAt: Date.now()
      }].slice(-MAX_CHAT_MESSAGES);
      broadcastRoomState({ ...currentRoom, chat: messages });
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

  useEffect(() => {
    const query = gifSearchQuery.trim();
    if (!showGifInput || query.length < 2) {
      setGifResults([]);
      setIsSearchingGifs(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingGifs(true);
      try {
        const response = await fetch(`/api/tenor-gifs?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha ao buscar GIFs.');
        setGifResults(Array.isArray(data.results) ? data.results : []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setGifResults([]);
          setChatError(error.message || 'Não foi possível buscar GIFs agora.');
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingGifs(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [gifSearchQuery, showGifInput]);

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
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(volumeRef.current);
              if (roomStateRef.current?.playback?.videoId) {
                manualSyncPendingRef.current = false;
                syncGuestPlayerWithRoom(event.target, roomStateRef.current);
              }
            },
            onStateChange: (event) => {
              // YouTube Player State 0 = ENDED
              if (event.data === window.YT.PlayerState.ENDED) {
                if (isHostRef.current) {
                  handleSkipNextRef.current();
                }
                return;
              }

              // Recupera pausa local do iframe sem mudar o estado compartilhado da party.
              if (event.data === window.YT.PlayerState.PAUSED) {
                const sharedPlayback = roomStateRef.current?.playback;
                if (sharedPlayback?.isPlaying) {
                  setTimeout(() => {
                    if (roomStateRef.current?.playback?.isPlaying && playerRef.current?.getPlayerState?.() === window.YT.PlayerState.PAUSED) {
                      playerRef.current?.playVideo();
                    }
                  }, 250);
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
    if (!inRoom) return;
    const recoverPlayback = () => {
      if (document.visibilityState === 'hidden') return;
      const currentRoom = roomStateRef.current;
      const player = playerRef.current;
      if (!currentRoom?.playback?.isPlaying || !player) return;
      syncGuestPlayerWithRoom(player, currentRoom);
    };
    document.addEventListener('visibilitychange', recoverPlayback);
    window.addEventListener('pageshow', recoverPlayback);
    window.addEventListener('focus', recoverPlayback);
    return () => {
      document.removeEventListener('visibilitychange', recoverPlayback);
      window.removeEventListener('pageshow', recoverPlayback);
      window.removeEventListener('focus', recoverPlayback);
    };
  }, [inRoom]);

  useEffect(() => {
    if (!inRoom || !roomState || !playerRef.current || !roomState.playback.videoId) return;
    syncGuestPlayerWithRoom(playerRef.current, roomState);
  }, [roomState?.playback?.videoId, roomState?.playback?.isPlaying]);

  useEffect(() => {
    const mediaSession = navigator.mediaSession;
    if (!mediaSession || !roomState?.playback?.videoId) return;
    if ('MediaMetadata' in window) {
      mediaSession.metadata = new window.MediaMetadata({
        title: roomState.playback.title || 'Party Together',
        artist: roomState.playback.artist || roomState.roomName,
        artwork: roomState.playback.thumbnail ? [{ src: roomState.playback.thumbnail, sizes: '512x512', type: 'image/jpeg' }] : []
      });
    }
    try { mediaSession.playbackState = roomState.playback.isPlaying ? 'playing' : 'paused'; } catch {}
    try { mediaSession.setActionHandler('play', () => { if (isHostRef.current) handleTogglePlay(); }); } catch {}
    try { mediaSession.setActionHandler('pause', () => { if (isHostRef.current && roomStateRef.current?.playback?.isPlaying) handleTogglePlay(); }); } catch {}
    try { mediaSession.setActionHandler('nexttrack', () => { if (isHostRef.current) handleSkipNextRef.current(); }); } catch {}
    return () => {
      for (const action of ['play', 'pause', 'nexttrack']) {
        try { mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [roomState?.playback?.videoId, roomState?.playback?.title, roomState?.playback?.artist, roomState?.playback?.thumbnail, roomState?.playback?.isPlaying]);

  // 8. Loop de alta precisão (250ms) para acompanhar a letra estilo BetterLyrics + Heartbeat e detecção de término
  useEffect(() => {
    if (!inRoom) return;

    let lastHeartbeatSecond = -1;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === 'function') {
        const curr = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        if (Date.now() - lastPlayerUiUpdateRef.current >= 500) {
          lastPlayerUiUpdateRef.current = Date.now();
          setLocalProgress(curr);
          setDuration(dur);
        }

        const currentRoom = roomStateRef.current;
        if (!currentRoom) return;

        if (currentRoom.playback?.videoId && Date.now() - lastGuestSyncAtRef.current >= 5000) {
          lastGuestSyncAtRef.current = Date.now();
          syncGuestPlayerWithRoom(player, currentRoom);
        }

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
    const targetTime = localProgress + 0.25;
    let low = 0;
    let high = lyricsData.synced.length - 1;
    let activeIndex = -1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (lyricsData.synced[middle].time <= targetTime) {
        activeIndex = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return activeIndex;
  }, [lyricsData.synced, localProgress]);

  // Smoothly scroll only the lyrics viewport; cancel the previous movement on a new line.
  useEffect(() => {
    const container = lyricsContainerRef.current;
    const activeLine = activeLyricRef.current;
    if (lyricScrollFrameRef.current) cancelAnimationFrame(lyricScrollFrameRef.current);
    lyricScrollFrameRef.current = null;
    if (activeTab !== 'lyrics' || activeLyricIndex < 0 || !container || !activeLine) return;

    const containerRect = container.getBoundingClientRect();
    const lineRect = activeLine.getBoundingClientRect();
    const lineCenter = lineRect.top - containerRect.top + container.scrollTop + lineRect.height / 2;
    const targetScrollTop = Math.max(0, Math.min(
      container.scrollHeight - container.clientHeight,
      lineCenter - container.clientHeight * 0.37
    ));
    const startScrollTop = container.scrollTop;
    const scrollDistance = targetScrollTop - startScrollTop;
    if (Math.abs(scrollDistance) < 1) return;

    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 750;
    let startTime = null;
    const animateScroll = (now) => {
      if (startTime === null) startTime = now;
      const progress = Math.min(1, (now - startTime) / duration);
      container.scrollTop = startScrollTop + scrollDistance * betterLyricsScrollEase(progress);
      if (progress < 1) lyricScrollFrameRef.current = requestAnimationFrame(animateScroll);
      else lyricScrollFrameRef.current = null;
    };
    lyricScrollFrameRef.current = requestAnimationFrame(animateScroll);

    return () => {
      if (lyricScrollFrameRef.current) cancelAnimationFrame(lyricScrollFrameRef.current);
      lyricScrollFrameRef.current = null;
    };
  }, [activeLyricIndex, activeTab]);

  const lastKnownChatIdRef = useRef(null);

  // Manter scroll interno das mensagens do chat sem rolar a página inteira
  useEffect(() => {
    if (activeTab === 'chat' && chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [roomState?.chat?.length, activeTab]);

  // Alerta sonoro e selo de notificação de novas mensagens no chat
  useEffect(() => {
    const chatList = roomState?.chat || [];
    if (chatList.length === 0) return;

    const latestMsg = chatList[chatList.length - 1];
    if (!lastKnownChatIdRef.current) {
      // Primeira carga das mensagens existentes na sala: apenas memoriza
      lastKnownChatIdRef.current = latestMsg.id;
      return;
    }

    if (lastKnownChatIdRef.current !== latestMsg.id) {
      lastKnownChatIdRef.current = latestMsg.id;

      // Se a mensagem veio de outro usuário
      if (latestMsg.senderId !== userId) {
        if (!isChatMuted) {
          playChatMessageChime();
        }
        if (activeTab !== 'chat') {
          setUnreadChatCount((count) => count + 1);
        }
      }
    }
  }, [roomState?.chat, activeTab, userId, isChatMuted]);

  // Zera o selo de mensagens não lidas ao entrar na aba chat
  useEffect(() => {
    if (activeTab === 'chat') {
      setUnreadChatCount(0);
    }
  }, [activeTab]);

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
          isHost: true,
          color: getAvailableChatColor([]),
          joinedAt: Date.now(),
          lastSeen: Date.now()
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
      queue: [],
      playlist: [],
      chat: [],
      stateVersion: 0
    };

    roomRevisionRef.current = 0;
    joinedRoomConfirmedRef.current = true;
    setRoomBrokerIndex(null);
    try {
      localStorage.setItem(`party_room_${generatedRoomId}`, JSON.stringify(newRoom));
      localStorage.setItem(`party_admin_room_${generatedRoomId}`, JSON.stringify({ roomId: generatedRoomId, hostId: userId, pinCode: newRoom.pinCode }));
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
      const lookupResult = await lookupRoomState(cleanCode);

      if (!lookupResult) {
        setErrorMsg('Sala não encontrada! Verifique o código e certifique-se de que a sala está aberta.');
        setIsJoiningRoom(false);
        return;
      }

      const foundRoom = lookupResult.state;

      if (foundRoom.pinCode && foundRoom.pinCode !== pinInput.trim()) {
        setErrorMsg('Código PIN incorreto para esta sala.');
        setIsJoiningRoom(false);
        return;
      }

      const isAdmin = foundRoom.hostId === userId;
      const updatedMembers = (foundRoom.members || []).some((m) => m.id === userId)
        ? (foundRoom.members || []).map((m) => m.id === userId ? { ...m, isHost: isAdmin || m.isHost, name: username.trim(), avatar: userAvatar, lastSeen: Date.now() } : m)
        : [
            ...(foundRoom.members || []),
            {
              id: userId,
              name: username.trim(),
              avatar: userAvatar,
              isHost: isAdmin,
              color: getAvailableChatColor(foundRoom.members || []),
              joinedAt: Date.now(),
              lastSeen: Date.now()
            }
          ];

      const updatedRoom = ensureMemberChatColors(ensureRoomPlaylist({
        ...foundRoom,
        members: updatedMembers
      }));
      roomRevisionRef.current = Number(updatedRoom.stateVersion) || 0;
      joinedRoomConfirmedRef.current = false;
      setRoomBrokerIndex(lookupResult.brokerIndex);

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

  const handleResyncPlayer = () => {
    const currentRoom = roomStateRef.current;
    const playback = currentRoom?.playback;
    if (!playback?.videoId || isResyncingPlayer) return;

    const targetPosition = Math.max(
      0,
      (Number(playback.trackPosition) || 0) + (playback.isPlaying ? Math.max(0, Date.now() - (playback.updatedAt || Date.now())) / 1000 : 0)
    );
    const player = playerRef.current;
    setIsResyncingPlayer(true);

    try {
      if (player?.loadVideoById && player?.cueVideoById) {
        const loadMethod = playback.isPlaying ? player.loadVideoById : player.cueVideoById;
        loadMethod.call(player, { videoId: playback.videoId, startSeconds: targetPosition });
        if (playback.isPlaying) player.playVideo?.();
        setLocalProgress(targetPosition);
      } else {
        manualSyncPendingRef.current = true;
        if (!isHostRef.current) setAudioUnlocked(true);
      }
    } catch (error) {
      console.warn('Falha ao sincronizar o player local:', error);
      manualSyncPendingRef.current = true;
      if (!isHostRef.current) setAudioUnlocked(true);
    }

    window.setTimeout(() => {
      setIsResyncingPlayer(false);
      if (manualSyncPendingRef.current && playerRef.current && roomStateRef.current?.playback?.videoId) {
        manualSyncPendingRef.current = false;
        syncGuestPlayerWithRoom(playerRef.current, roomStateRef.current);
      }
    }, 1200);
  };

  // Controles do Anfitrião: Avançar para a próxima música da fila
  const handleSkipNext = () => {
    const currentRoom = ensureRoomPlaylist(roomStateRef.current);
    if (!isHostRef.current || !currentRoom) return;
    const finishedTrackId = currentRoom.playback?.playlistItemId || currentRoom.playback?.videoId;
    if (finishedTrackId && lastAdvancedTrackRef.current === finishedTrackId) return;
    if (finishedTrackId) lastAdvancedTrackRef.current = finishedTrackId;

    // Se a fila estiver vazia, apenas encerra a reprodução
    if (!currentRoom.queue || currentRoom.queue.length === 0) {
      broadcastRoomState({
        ...currentRoom,
        playlist: (currentRoom.playlist || []).map((item) =>
          item.id === currentRoom.playback?.playlistItemId ? { ...item, status: 'played' } : item
        ),
        playback: {
          videoId: null,
          title: 'Fila vazia',
          artist: 'Adicione mais músicas para continuar a festa!',
          thumbnail: null,
          addedBy: null,
          playlistItemId: null,
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
      playlist: (currentRoom.playlist || []).map((item) => {
        if (item.id === currentRoom.playback?.playlistItemId) return { ...item, status: 'played' };
        if (item.id === nextTrack.id) return { ...item, status: 'playing' };
        return item;
      }),
      playback: {
        videoId: nextTrack.videoId,
        title: nextTrack.title,
        artist: nextTrack.artist,
        thumbnail: nextTrack.thumbnail,
        addedBy: nextTrack.addedBy,
        playlistItemId: nextTrack.id,
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

    const alreadyQueuedOrPlaying = currentRoom.playback?.videoId === track.videoId || (currentRoom.playlist || []).some((item) =>
      item.videoId === track.videoId && ['queued', 'playing'].includes(item.status)
    );
    if (alreadyQueuedOrPlaying) return;

    if (isHostRef.current) {
      if (!currentRoom.playback.videoId) {
        const playlistItem = { ...createPlaylistItem(track, username, 'playing'), addedById: userId, voters: [] };
        if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById(track.videoId);
        }

        broadcastRoomState({
          ...currentRoom,
          playlist: [...(currentRoom.playlist || []), playlistItem],
          playback: {
            videoId: track.videoId,
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumbnail,
            addedBy: username,
            playlistItemId: playlistItem.id,
            isPlaying: true,
            trackPosition: 0,
            updatedAt: Date.now()
          }
        });
        setActiveTab('lyrics');
        return;
      }

      const newQueueItem = { ...createPlaylistItem(track, username), addedById: userId, voters: [userId] };

      broadcastRoomState({
        ...currentRoom,
        queue: [...(currentRoom.queue || []), newQueueItem],
        playlist: [...(currentRoom.playlist || []), newQueueItem]
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
      const target = (currentRoom.queue || []).find((item) => item.id === itemId);
      if (!target) return;
      const hasVoted = (target.voters || []).includes(userId);
      const updatedQueue = (currentRoom.queue || [])
        .map((item) => {
          if (item.id !== itemId) return item;
          const voters = item.voters || [];
          return hasVoted
            ? { ...item, votes: Math.max(0, (item.votes || 0) - 1), voters: voters.filter((id) => id !== userId) }
            : { ...item, votes: (item.votes || 0) + 1, voters: [...voters, userId] };
        })
        .sort((a, b) => (b.votes || 0) - (a.votes || 0));

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

  const handleRemoveTrack = (itemId) => {
    if (isHostRef.current) {
      handleHostProcessGuestAction({ type: 'REMOVE_TRACK', itemId, senderId: userId });
    } else {
      syncServiceRef.current?.sendAction({ type: 'REMOVE_TRACK', itemId, senderId: userId });
    }
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Escolha um arquivo de imagem válido.');
      return;
    }
    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setErrorMsg('A imagem original deve ter até 5 MB.');
      return;
    }
    try {
      handleAvatarChange(await compressAvatarImage(file));
      setErrorMsg('');
    } catch (error) {
      setErrorMsg(error.message || 'Não foi possível usar essa imagem.');
    }
  };

  const handleSendChat = (text = chatInput) => {
    const messageText = text.trim().slice(0, MAX_CHAT_CHARACTERS);
    if (!messageText) return;
    const currentRoom = roomStateRef.current;
    if (!currentRoom) return;
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderId: userId,
      senderName: username.trim(),
      text: messageText
    };
    if (isHostRef.current) handleHostProcessGuestAction({ type: 'CHAT_MESSAGE', message });
    else syncServiceRef.current?.sendAction({ type: 'CHAT_MESSAGE', message });
    setChatInput('');
    setChatError('');
  };

  const handleSendGif = async (selectedGif = null) => {
    if (isSendingGif) return;
    setIsSendingGif(true);
    setChatError('');
    try {
      let gif = selectedGif;
      if (!gif) {
        const pastedLink = normalizeTenorGifUrl(gifInput);
        if (!pastedLink) throw new Error('Cole um link válido do Tenor ou um link direto de GIF.');
        if (pastedLink.kind === 'image') gif = { gifUrl: pastedLink.url };
        else {
          const response = await fetch(`/api/tenor-gifs?url=${encodeURIComponent(pastedLink.url)}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Não foi possível resolver o link do Tenor.');
          gif = data;
        }
      }

      const playableGif = normalizeTenorGifUrl(gif?.gifUrl || '');
      if (playableGif?.kind !== 'image') throw new Error('O link do Tenor não retornou um GIF compatível.');
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: userId,
        senderName: username.trim(),
        type: 'gif',
        gifKind: 'image',
        gifUrl: playableGif.url
      };
      if (isHostRef.current) handleHostProcessGuestAction({ type: 'CHAT_MESSAGE', message });
      else syncServiceRef.current?.sendAction({ type: 'CHAT_MESSAGE', message });
      setGifInput('');
      setGifSearchQuery('');
      setGifResults([]);
      setShowGifInput(false);
    } catch (error) {
      setChatError(error.message || 'Não foi possível inserir este GIF.');
    } finally {
      setIsSendingGif(false);
    }
  };

  // Sair da sala mantendo a sala aberta para retorno a qualquer momento
  const leaveRoom = () => {
    const currentRoom = roomStateRef.current;
    if (isHostRef.current && currentRoom) {
      // O admin sai da sala, mas a sala permanece ativa para os membros ou para reentrar
      const updatedMembers = (currentRoom.members || []).filter((m) => m.id !== userId);
      const remainingNonHost = updatedMembers.filter((m) => m.id !== currentRoom.hostId);
      const shouldClear = remainingNonHost.length === 0;

      broadcastRoomState({
        ...currentRoom,
        members: updatedMembers,
        chat: shouldClear ? [] : currentRoom.chat,
        queue: shouldClear ? [] : currentRoom.queue,
        playlist: shouldClear ? [] : currentRoom.playlist,
        playback: shouldClear ? { ...INITIAL_PLAYBACK_STATE, updatedAt: Date.now() } : currentRoom.playback
      });
    } else {
      syncServiceRef.current?.sendAction({ type: 'USER_LEFT', userId });
    }

    syncServiceRef.current?.destroy();
    syncServiceRef.current = null;
    setInRoom(false);
    joinedRoomConfirmedRef.current = false;
    setRoomBrokerIndex(null);
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
  };

  // Exclusão definitiva da sala pelo anfitrião
  const deleteRoom = () => {
    if (!window.confirm('Tem certeza de que deseja excluir permanentemente esta sala? Todos os membros serão desconectados.')) return;
    const currentRoom = roomStateRef.current;
    if (currentRoom) {
      const closedState = {
        ...currentRoom,
        chat: [],
        queue: [],
        playlist: [],
        members: [],
        closedAt: Date.now(),
        playback: { ...INITIAL_PLAYBACK_STATE, updatedAt: Date.now() }
      };
      broadcastRoomState(closedState);
      try {
        localStorage.removeItem(`party_room_${currentRoom.roomId}`);
        localStorage.removeItem(`party_admin_room_${currentRoom.roomId}`);
      } catch {}
      syncServiceRef.current?.clearRetainedState?.();
    }
    syncServiceRef.current?.sendAction({ type: 'USER_LEFT', userId });
    syncServiceRef.current?.destroy();
    syncServiceRef.current = null;
    setInRoom(false);
    joinedRoomConfirmedRef.current = false;
    setRoomBrokerIndex(null);
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
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
  seekLyricRef.current = handleSeekToLyric;

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

  const playlistToDisplay = roomState ? [
    ...(roomState.playlist || []).filter((item) => item.status === 'playing'),
    ...(roomState.queue || []).map((item) => ({ ...item, status: 'queued' })),
    ...(roomState.playlist || []).filter((item) => item.status === 'played')
  ] : [];
  const isTrackActive = (videoId) => roomState?.playback?.videoId === videoId || (roomState?.playlist || []).some((item) =>
    item.videoId === videoId && ['queued', 'playing'].includes(item.status)
  );
  const isDirectInvite = Boolean(new URLSearchParams(window.location.search).get('room') && new URLSearchParams(window.location.search).get('pin'));

  // ============================================================================
  // TELA 1: LOGIN / LOBBY COM FUNDO MOSAICO DE ÁLBUNS ESTILO NETFLIX & SPOTIFY
  // ============================================================================
  if (!inRoom) {
    return (
      <div className="relative min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Mosaico Diagonal de Capas de Álbuns Famosos ao Fundo */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute -inset-[15%] grid h-[130%] w-[130%] grid-cols-4 auto-rows-fr sm:grid-cols-6 md:grid-cols-8 gap-3 p-4 opacity-55 scale-110 -rotate-6 transform origin-center">
            {ALBUM_MOSAIC_COVERS.map((coverUrl, index) => (
              <div
                key={index}
                className="aspect-square rounded-xl overflow-hidden shadow-lg bg-zinc-900 border border-white/5"
              >
                <img
                  src={coverUrl}
                  alt=""
                  className="h-full w-full object-cover saturate-125 contrast-105"
                  loading={index < 8 ? 'eager' : 'lazy'}
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
          {/* Vinheta Gradiente Estilo Netflix / Spotify sobre as capas */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-zinc-950/55 to-zinc-950/65" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,#09090b_85%)]" />
        </div>

        {/* Card Central de Entrada */}
        <div className="relative z-10 w-full max-w-md bg-zinc-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl shadow-black/80">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="flex items-center gap-3.5 min-w-0">
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
                Seu perfil na Festa
              </span>
              <input
                type="text"
                placeholder="Digite seu Nickname..."
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full mt-0.5 bg-transparent text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none border-b border-zinc-800 focus:border-red-500 pb-0.5"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                handleAvatarChange(getRandomCuteAvatar('party_' + Math.random().toString(36).substring(2, 10)));
                setErrorMsg('');
              }}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title="Escolher outro avatar antes de entrar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title="Anexar avatar do computador"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
          </div>
          <p className="-mt-3 mb-4 px-1 text-[11px] text-zinc-500">
            Nome e avatar ficam bloqueados durante a party. Imagens de até 5 MB são redimensionadas e comprimidas antes do envio.
          </p>

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
            ) : isDirectInvite ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-3 text-xs text-zinc-300">
                Entrando na sala <strong className="text-white">{roomCodeInput}</strong> com o PIN do convite.
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

            {mode === 'create' || !isDirectInvite ? <div>
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
            </div> : null}

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
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setShowNews(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2.5 text-xs font-semibold text-amber-300 hover:bg-zinc-700"
            >
              <Bell className="h-4 w-4" /> Novidades
            </button>
            <button
              type="button"
              onClick={handleInstallApp}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              <Download className="w-4 h-4" /> {installPrompt ? 'Instalar' : 'Instalar / sidebar'}
            </button>
          </div>
          {showNews && <NewsPanel onClose={() => setShowNews(false)} />}
          {showInstallHelp && <InstallHelpPanel onClose={() => setShowInstallHelp(false)} />}
        </div>
      </div>
    );
  }

  // ============================================================================
  // TELA 2: SALA ATIVA (PLAYER SINCRONIZADO + BETTERLYRICS + BUSCA YT MUSIC)
  // ============================================================================
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col relative overflow-hidden">
      {/* Capa do álbum desfocada; troca com crossfade quando a faixa muda. */}
      <AlbumBackdrop src={roomState.playback.thumbnail} />

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
              {(roomState.members || []).length} na festa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold"
            title="Instalar o app ou ver opções de sidebar"
          >
            <Download className="w-3.5 h-3.5" /> {installPrompt ? 'Instalar' : 'Adicionar'}
          </button>
          <button
            onClick={() => setShowNews(true)}
            title="Novidades"
            aria-label="Abrir novidades"
            className="relative rounded-xl bg-zinc-800 p-2 text-amber-300 hover:bg-zinc-700"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
          </button>
          <button
            onClick={() => {
              const inviteUrl = new URL(window.location.href);
              inviteUrl.search = new URLSearchParams({ room: roomState.roomId, pin: roomState.pinCode }).toString();
              const markCopied = () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              };
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(inviteUrl.toString()).then(markCopied).catch(() => window.prompt('Copie o link do convite:', inviteUrl.toString()));
              } else {
                window.prompt('Copie o link do convite:', inviteUrl.toString());
              }
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
            onClick={leaveRoom}
            title={isHost ? 'Sair da sala (mantém a sala aberta para retorno)' : 'Sair da sala'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>

          {isHost && (
            <button
              onClick={deleteRoom}
              title="Excluir sala permanentemente para todos"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-900/50 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Sala
            </button>
          )}
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

            <button
              type="button"
              onClick={handleResyncPlayer}
              disabled={!roomState.playback.videoId || isResyncingPlayer}
              title="Recarregar a música atual e sincronizar este player com a sala"
              className="mt-3 flex self-end items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-red-500/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isResyncingPlayer ? 'animate-spin text-red-400' : ''}`} />
              {isResyncingPlayer ? 'Sincronizando...' : 'Sincronizar player'}
            </button>
          </div>

          {/* Lista de Participantes com Fotos Fofas Aleatórias */}
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 shadow-xl">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-red-500" /> Galera na Party ({(roomState.members || []).length})
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {(roomState.members || []).map((m) => (
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
                  {isHost && m.id !== userId && (
                    <button
                      type="button"
                      title={`Remover ${m.name} da party`}
                      onClick={() => handleHostProcessGuestAction({ type: 'KICK_MEMBER', userId: m.id, senderId: userId })}
                      className="text-zinc-500 hover:text-red-400 transition"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Abas (Buscar Música | Fila Colaborativa | BetterLyrics) */}
        <div className="lg:col-span-7 flex h-[620px] min-h-0 flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3.5 mb-4 gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${activeTab === 'search'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
              >
                <Search className="w-3.5 h-3.5" /> Buscar Música
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${activeTab === 'queue'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
              >
                <ListMusic className="w-3.5 h-3.5" /> Playlist ({roomState.playlist?.length ?? roomState.queue.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('lyrics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${activeTab === 'lyrics'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
              >
                <Mic2 className="w-3.5 h-3.5" /> Letra (BetterLyrics)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${activeTab === 'chat'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
              >
                <MessageCircle className="w-3.5 h-3.5" /> Chat ({roomState.chat?.length || 0})
                {unreadChatCount > 0 && activeTab !== 'chat' && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-black text-white bg-red-600 rounded-full shadow-lg shadow-red-600/50 animate-pulse border border-zinc-900">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ABA 1: BUSCA DO YOUTUBE MUSIC (INICIA VAZIA) */}
          {activeTab === 'search' && (
            <div className="flex min-h-0 flex-1 flex-col">
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

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
                        disabled={isTrackActive(track.videoId)}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-600/40 text-xs font-bold transition shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isTrackActive(track.videoId) ? 'Já na playlist' : !roomState.playback.videoId ? 'Tocar Agora' : 'Na Fila'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA 2: PLAYLIST DA FESTA (MANTÉM AS FAIXAS ATÉ O FIM DA SESSÃO) */}
          {activeTab === 'queue' && (
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
              {playlistToDisplay.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 flex flex-col items-center">
                  <PartyTogetherLogo className="w-12 h-12 mb-3 opacity-60" iconSize="w-6 h-6" />
                  <p className="text-sm font-medium text-zinc-300">A playlist está vazia no momento</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="mt-3 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-red-400 font-semibold transition cursor-pointer"
                  >
                    + Buscar músicas no YouTube Music
                  </button>
                </div>
              ) : (
                playlistToDisplay.map((item, idx) => (
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

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'queued' ? (
                        <>
                          <button
                            onClick={() => handleVoteTrack(item.id)}
                            aria-pressed={(item.voters || []).includes(userId)}
                            title={(item.voters || []).includes(userId) ? 'Retirar curtida' : 'Curtir música'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${(item.voters || []).includes(userId) ? 'bg-red-950/50 border-red-500/60 text-red-300' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'}`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${(item.voters || []).includes(userId) ? 'fill-red-400 text-red-400' : 'text-red-400'}`} />
                            <span>{item.votes || 0}</span>
                          </button>
                          {(isHost || item.addedById === userId || (!item.addedById && item.addedBy === username)) && (
                            <button onClick={() => handleRemoveTrack(item.id)} title="Remover da fila" className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : item.status === 'played' ? (
                        <button
                          onClick={() => handleAddTrack(item)}
                          disabled={isTrackActive(item.videoId)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300 disabled:opacity-50"
                        >
                          {isTrackActive(item.videoId) ? 'Na playlist' : 'Tocar novamente'}
                        </button>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide font-bold text-emerald-400">Tocando</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 3: LETRAS SINCRONIZADAS ESTILO BETTERLYRICS */}
          {activeTab === 'lyrics' && (
            <div
              ref={lyricsContainerRef}
              className="better-lyrics-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-950/90 via-zinc-950/60 to-zinc-950/90 px-4 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                <SyncedLyricsList
                  lines={lyricsData.synced}
                  activeIndex={activeLyricIndex}
                  isHost={isHost}
                  activeLineRef={activeLyricRef}
                  seekRef={seekLyricRef}
                />
              ) : lyricsData.plain ? (
                <div className="better-lyrics-plain mx-auto max-w-2xl whitespace-pre-line break-words px-4 text-center">
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

          {activeTab === 'chat' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs text-zinc-500">{roomState.chat?.length || 0}/{MAX_CHAT_MESSAGES} mensagens</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChatMuted((muted) => {
                        const next = !muted;
                        try {
                          localStorage.setItem('party_chat_muted', String(next));
                        } catch {}
                        return next;
                      });
                    }}
                    title={isChatMuted ? 'Ativar alerta sonoro de novas mensagens' : 'Silenciar alerta sonoro de novas mensagens'}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                      isChatMuted
                        ? 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                        : 'border-red-500/40 bg-red-600/10 text-red-400 hover:bg-red-600/20'
                    }`}
                  >
                    {isChatMuted ? (
                      <>
                        <BellOff className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Silenciado</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 text-red-400" />
                        <span>Som ativo</span>
                      </>
                    )}
                  </button>
                  <span className="hidden sm:inline text-[10px] text-zinc-600">Histórico temporário da sessão</span>
                </div>
              </div>
              <div
                ref={chatMessagesContainerRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {(roomState.chat || []).length === 0 ? (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-zinc-500 text-sm">
                    <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p>O chat da party começa por aqui.</p>
                  </div>
                ) : (roomState.chat || []).map((message) => <ChatMessageBubble key={message.id} message={message} />)}
              </div>
              <div className="border-t border-zinc-800 pt-3">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {CHAT_REACTIONS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => handleSendChat(emoji)} className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-base" aria-label={`Enviar ${emoji}`}>
                      {emoji}
                    </button>
                  ))}
                  <button type="button" onClick={() => { setShowGifInput((open) => !open); setChatError(''); }} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${showGifInput ? 'bg-red-600 text-white' : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800'}`}>
                    GIF
                  </button>
                </div>
                {chatError && !showGifInput && <p className="mb-2 text-xs text-red-300">{chatError}</p>}
                <form onSubmit={(event) => { event.preventDefault(); handleSendChat(); }} className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    maxLength={MAX_CHAT_CHARACTERS}
                    placeholder="Escreva uma mensagem ou emoji..."
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-red-500"
                  />
                  <span className="self-center text-[10px] text-zinc-600">{chatInput.length}/{MAX_CHAT_CHARACTERS}</span>
                  <button type="submit" disabled={!chatInput.trim()} className="px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white flex items-center gap-2 text-xs font-bold">
                    <Send className="w-4 h-4" /> Enviar
                  </button>
                </form>
                <p className="mt-2 text-[10px] text-zinc-600">Até {MAX_CHAT_CHARACTERS} caracteres por mensagem; GIFs aparecem em formato sticker.</p>
              </div>
            </div>
          )}
        </div>
      </main>
      {activeTab === 'chat' && showGifInput && (
        <TenorGifModal
          query={gifSearchQuery}
          onQueryChange={setGifSearchQuery}
          results={gifResults}
          isSearching={isSearchingGifs}
          error={chatError}
          manualLink={gifInput}
          onManualLinkChange={setGifInput}
          isSending={isSendingGif}
          onChoose={handleSendGif}
          onSendLink={() => handleSendGif()}
          onClose={closeTenorGifModal}
        />
      )}
      {showNews && <NewsPanel onClose={() => setShowNews(false)} />}
      {showInstallHelp && <InstallHelpPanel onClose={() => setShowInstallHelp(false)} />}
    </div>
  );
}
