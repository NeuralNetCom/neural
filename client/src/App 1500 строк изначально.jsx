import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client'; // ВАЖНО: Импорт для запуска приложения
import { 
  User, MessageSquare, Home, Settings, Shield, Send, MoreHorizontal, 
  Heart, Share2, Activity, LogOut, Globe, Lock, Bell, X, Edit3, 
  Image as ImageIcon, Users, UserPlus, UserMinus, Star, Check, UserCheck, 
  Trash2, Crown, Smartphone, Menu, ChevronLeft, Search, PlusCircle,
  Music, Play, Pause, SkipBack, SkipForward, Volume2, Volume1, Radio, FileAudio, List, Signal, Box
} from 'lucide-react';
import axios from 'axios';

// --- КОНФИГУРАЦИЯ ---
// ИСПРАВЛЕНО: Используем window.location вместо import.meta для совместимости
// Если адрес сайта localhost, то используем локальный сервер. Иначе - сервер на Render.
const API_URL = (window.location.hostname === 'https://neural-upqo.onrender.com' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://neural-upqo.onrender.com/api'; // <-- ВАЖНО: Сюда вставь URL своего сервера с Render после деплоя

/**
 * --- УТИЛИТЫ ---
 */
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ИСПРАВЛЕНИЕ: Форматирование времени с учетом часового пояса
// Добавляем 'Z' в конец строки, чтобы парсер JS считал это временем UTC
const formatLastSeen = (isoString) => {
    if (!isoString) return "Не в сети";
    
    // Принудительно трактуем время как UTC
    const date = new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000); 

    if (diffSeconds < 60) return "В сети";
    if (diffSeconds < 300) return "был(а) 5 минут назад";
    if (diffSeconds < 3600) return `был(а) ${Math.floor(diffSeconds / 60)} мин. назад`;
    if (diffSeconds < 86400) return `был(а) ${Math.floor(diffSeconds / 3600)} ч. назад`;
    if (diffSeconds < 604800) return `был(а) ${Math.floor(diffSeconds / 86400)} дн. назад`;
    return `Был(а) в сети ${date.toLocaleDateString()}`;
};

/**
 * --- КОМПОНЕНТЫ ---
 */

// 3D Куб компонент
const Cube3D = ({ size = "128px", small = false }) => {
    return (
        <div className={cn("perspective-800 relative mx-auto", small ? "w-16 h-16 my-2" : "w-32 h-32 my-8 animate-[float_6s_ease-in-out_infinite]")}>
            <style jsx>{`
                .cube {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    transform-style: preserve-3d;
                    animation: rotate 20s infinite linear;
                }
                .face {
                    position: absolute;
                    width: ${small ? '64px' : '128px'};
                    height: ${small ? '64px' : '128px'};
                    border: 1px solid rgba(0, 255, 255, 0.3);
                    background: rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${small ? '1rem' : '2rem'};
                    color: rgba(6, 182, 212, 0.8);
                    box-shadow: 0 0 20px rgba(6, 182, 212, 0.1) inset;
                }
                /* Вычисления для смещения граней (половина ширины) */
                .front  { transform: rotateY(0deg) translateZ(${small ? '32px' : '64px'}); }
                .right  { transform: rotateY(90deg) translateZ(${small ? '32px' : '64px'}); }
                .back   { transform: rotateY(180deg) translateZ(${small ? '32px' : '64px'}); }
                .left   { transform: rotateY(-90deg) translateZ(${small ? '32px' : '64px'}); }
                .top    { transform: rotateX(90deg) translateZ(${small ? '32px' : '64px'}); }
                .bottom { transform: rotateX(-90deg) translateZ(${small ? '32px' : '64px'}); }
                
                @keyframes rotate {
                    from { transform: rotateX(0deg) rotateY(0deg); }
                    to { transform: rotateX(360deg) rotateY(360deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
            `}</style>
            <div className="cube">
                <div className="face front"><Shield /></div>
                <div className="face back"><Globe /></div>
                <div className="face right"><Activity /></div>
                <div className="face left"><Lock /></div>
                <div className="face top"><User /></div>
                <div className="face bottom"><Radio /></div>
            </div>
        </div>
    );
};

const Toast = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-4 right-4 bg-gray-900/90 backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-right duration-300 border border-cyan-500/50">
            <div className="p-2 bg-cyan-500/20 rounded-full">
                <Bell size={18} className="text-cyan-400" />
            </div>
            <div>
                <p className="font-bold text-sm">Уведомление</p>
                <p className="text-xs text-gray-300">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 hover:text-cyan-400">
                <X size={14}/>
            </button>
        </div>
    );
};

/**
 * --- CONTEXT ---
 */
const AppContext = createContext(null);

const AppProvider = ({ children }) => {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('neural_token'));
  const [viewedProfile, setViewedProfile] = useState(null);
  const [notification, setNotification] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  
  // Состояние музыки
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState([]); // Треки из БД
  const [volume, setVolume] = useState(0.5);
  
  const [activeChat, setActiveChat] = useState(null);
  const lastMsgIdRef = useRef(null);

  useEffect(() => {
    if (token) {
        axios.post(`${API_URL}/login`, { code: token })
            .then(res => {
                setUser(res.data.user);
                setView('feed');
            })
            .catch(() => {
                logout();
            });
    }
  }, []);

  // --- KEEP ALIVE (КРОН ЗАДАЧА В КОДЕ) ---
  // Автоматически отправляет запрос на сервер каждые 10 минут (600,000 мс)
  useEffect(() => {
      const keepAliveInterval = setInterval(() => {
          console.log("⏰ Keep-alive ping...");
          const endpoint = token ? '/users/me' : '/health'; 
          const headers = token ? { Authorization: token } : {};
          
          axios.get(`${API_URL}${endpoint}`, { headers })
               .then(() => console.log("✅ Server active"))
               .catch(err => console.error("⚠️ Keep-alive failed", err));
      }, 600000); // 10 минут

      return () => clearInterval(keepAliveInterval);
  }, [token]);

  useEffect(() => {
      if (!token || !user) return;
      const runPolling = async () => {
          try {
              const msgRes = await axios.get(`${API_URL}/messages`, { headers: { Authorization: token } });
              const msgs = msgRes.data;
              if (msgs.length > 0) {
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsgIdRef.current && lastMsg.id !== lastMsgIdRef.current && !lastMsg.isOwn && !activeChat) {
                      setNotification(`Сообщение от ${lastMsg.senderName}: ${lastMsg.text.substring(0, 30)}...`);
                  }
                  lastMsgIdRef.current = lastMsg.id;
              }
              const reqRes = await axios.get(`${API_URL}/friends/requests`, { headers: { Authorization: token } });
              setFriendRequests(reqRes.data);
          } catch (e) { console.error("Polling error", e); }
      };
      const interval = setInterval(runPolling, 3000); 
      return () => clearInterval(interval);
  }, [token, user, activeChat]);

  // Загрузка музыки
  const fetchMusic = () => {
    if (token && view !== 'login') {
        axios.get(`${API_URL}/music`, { headers: { Authorization: token } })
            .then(res => setPlaylist(res.data))
            .catch(e => console.error(e));
    }
  }

  useEffect(() => {
      fetchMusic();
  }, [token, view]);

  const login = async (credentials) => {
    try {
      const res = await axios.post(`${API_URL}/login`, credentials);
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('neural_token', res.data.token);
      setView('feed');
      return true;
    } catch (e) {
      alert("Ошибка доступа: Неверные данные");
      return false;
    }
  };

  const register = async (name, password) => {
    try {
      const res = await axios.post(`${API_URL}/register`, { name, password });
      return res.data; 
    } catch (e) {
        if (e.response && e.response.status === 409) {
            alert("Это имя уже занято.");
        } else {
            alert("Ошибка регистрации.");
        }
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('neural_token');
    setView('login');
    setActiveChat(null);
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  const goToProfile = async (handle) => {
      if (!token) return;
      if (user && handle === user.handle) {
          setView('profile');
          return;
      }
      try {
          const res = await axios.get(`${API_URL}/users/${handle}`, { headers: { Authorization: token } });
          setViewedProfile(res.data);
          setView('user_profile');
      } catch (e) { console.error("Profile load failed", e); }
  }

  const startChat = (targetUser) => {
      setActiveChat(targetUser);
      setView('messages');
  };

  const respondToRequest = async (requestId, action) => {
      try {
          await axios.post(`${API_URL}/friends/respond`, { requestId, action }, { headers: { Authorization: token } });
          setFriendRequests(prev => prev.filter(r => r.requestId !== requestId));
          setNotification(action === 'accept' ? "Заявка принята!" : "Заявка отклонена");
      } catch (e) { console.error(e); }
  }

  // Управление музыкой
  const playTrack = (track) => {
      if (currentTrack?.url === track.url) { 
          setIsPlaying(!isPlaying);
      } else {
          setCurrentTrack(track);
          setIsPlaying(true);
      }
  };

  return (
    <AppContext.Provider value={{ 
        view, setView, user, setUser, token, login, register, logout, 
        viewedProfile, setViewedProfile, goToProfile, 
        friendRequests, respondToRequest,
        activeChat, setActiveChat, startChat,
        setNotification,
        // Музыка
        playlist, fetchMusic, currentTrack, isPlaying, setIsPlaying, playTrack, volume, setVolume
    }}>
      {children}
      {notification && <Toast message={notification} onClose={() => setNotification(null)} />}
    </AppContext.Provider>
  );
};

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

/**
 * --- UI КОМПОНЕНТЫ ---
 */
const MinimalButton = ({ children, variant = 'primary', className, ...props }) => {
  return (
    <button 
      className={cn(
        "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2",
        variant === 'primary' 
          ? "bg-gray-900 text-white shadow-lg hover:shadow-cyan-500/20 hover:bg-black" 
          : "border border-gray-300 text-gray-700 hover:border-gray-900 hover:text-black bg-white/50 backdrop-blur-sm",
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
};

const CreatePostWidget = ({ onPost }) => {
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);

    const handleSubmit = () => {
        if (!content.trim() && !imageUrl.trim()) return;
        onPost(content, imageUrl);
        setContent('');
        setImageUrl('');
        setShowImageInput(false);
    };

    return (
        <div className="mb-8 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-sm">
            <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Транслировать мысль в сеть..."
                className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none h-16 placeholder-gray-400 outline-none"
            />
            {showImageInput && (
                <input 
                    type="text" 
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Вставьте ссылку на изображение..."
                    className="w-full bg-white/50 text-xs p-2 rounded-lg border border-gray-200 mb-2"
                />
            )}
            <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
                <button onClick={() => setShowImageInput(!showImageInput)} className="text-gray-400 hover:text-cyan-600 transition-colors">
                    <ImageIcon size={18} />
                </button>
                <MinimalButton onClick={handleSubmit} className="px-4 py-1.5 text-xs h-8">Отправить</MinimalButton>
            </div>
        </div>
    );
}

const PostCard = ({ post, onLikeUpdate }) => {
  const { goToProfile, token } = useApp();
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState(post.comments || []);

  const handleLike = async () => {
    if (isLiking || !token) return;
    setIsLiking(true);
    try {
        const res = await axios.post(`${API_URL}/posts/${post.id}/like`, {}, {
            headers: { Authorization: token }
        });
        if (onLikeUpdate) {
            onLikeUpdate(post.id, res.data.likes, res.data.isLiked);
        }
    } catch (e) { console.error(e); } finally { setIsLiking(false); }
  };

  const handleComment = async () => {
      if(!commentText.trim()) return;
      try {
          const res = await axios.post(`${API_URL}/posts/${post.id}/comments`, { content: commentText }, {
              headers: { Authorization: token }
          });
          setLocalComments([...localComments, res.data]);
          setCommentText('');
      } catch (e) { console.error(e); }
  };

  return (
    <div className="mb-6 group">
      <div className="relative bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-gray-100 transition-all duration-300 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5">
        <div className="flex items-start gap-4">
          <div className="relative cursor-pointer" onClick={() => goToProfile(post.author.handle)}>
            <img src={post.author.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                  <h3 
                    className="font-semibold text-gray-900 flex items-center cursor-pointer hover:text-cyan-600 transition-colors"
                    onClick={() => goToProfile(post.author.handle)}
                  >
                    {post.author.name}
                    {post.author.name === '313' && <Crown size={14} className="text-yellow-500 ml-1 fill-yellow-500" />}
                    {post.author.isVerified && <span className="text-cyan-500 ml-1"><Check size={12}/></span>}
                  </h3>
                  <span className="text-[10px] text-cyan-600">{post.author.status}</span>
              </div>
              <span className="text-xs text-gray-400 font-mono shrink-0">{post.timestamp}</span>
            </div>
            
            <p className="text-gray-700 leading-relaxed mb-4 mt-2 font-light text-sm md:text-base break-words">
              {post.content}
            </p>

            {post.imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-100">
                    <img src={post.imageUrl} alt="Content" className="w-full h-auto object-cover max-h-96" />
                </div>
            )}
            
            <div className="flex items-center gap-6 pt-2 border-t border-gray-100/50">
              <button onClick={handleLike} className={cn("flex items-center gap-1.5 text-xs transition-colors duration-200", post.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500")}>
                <Heart size={14} fill={post.isLiked ? "currentColor" : "none"} /> {post.likes}
              </button>
              <button 
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-600 transition-colors"
              >
                <MessageSquare size={14} /> {localComments.length}
              </button>
            </div>

            {showComments && (
                <div className="mt-4 pt-3 border-t border-gray-100 animate-in fade-in">
                    <div className="space-y-3 mb-3">
                        {localComments.map((c) => (
                            <div key={c.id} className="bg-white/50 p-2 rounded-lg text-xs">
                                <span className="font-bold cursor-pointer hover:text-cyan-600 mr-2" onClick={() => goToProfile(c.handle)}>
                                    {c.author}:
                                </span>
                                <span className="text-gray-700">{c.content}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs" placeholder="Написать комментарий..." />
                        <button onClick={handleComment} className="bg-gray-900 text-white rounded-lg px-3 py-1.5 text-xs">OK</button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- КОМПОНЕНТ ПЛЕЕРА ---
const MusicPlayer = () => {
    const { currentTrack, isPlaying, setIsPlaying, volume, setVolume } = useApp();
    const audioRef = useRef(null);

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = volume;
    }, [volume]);

    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;
        
        audioRef.current.src = currentTrack.url;
        
        if (isPlaying) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Auto-play prevented", e);
                    setIsPlaying(false);
                });
            }
        } else {
            audioRef.current.pause();
        }
    }, [currentTrack]); 

    useEffect(() => {
        if (!audioRef.current) return;
        if(isPlaying) audioRef.current.play().catch(()=>{});
        else audioRef.current.pause();
    }, [isPlaying]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    }

    if (!currentTrack) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-200 z-50 px-4 py-3 flex items-center justify-between md:pl-72 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe-area-bottom md:pb-3 h-20 md:h-auto">
            <audio 
                ref={audioRef} 
                onEnded={() => setIsPlaying(false)}
                onError={() => { alert("Ошибка воспроизведения потока"); setIsPlaying(false); }}
            />
            
            <div className="flex items-center gap-3 w-1/3">
                <img src={currentTrack.cover} alt="cover" className="w-10 h-10 rounded-lg object-cover shadow-sm animate-spin-slow" style={{animationPlayState: isPlaying ? 'running' : 'paused'}} />
                <div className="overflow-hidden">
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{currentTrack.title}</p>
                    <p className="text-[10px] text-gray-500 truncate max-w-[100px]">{currentTrack.artist}</p>
                    {currentTrack.genre === 'Radio' && <span className="text-[9px] text-red-500 flex items-center gap-1 animate-pulse"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> LIVE</span>}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1"/>}
                </button>
            </div>

            <div className="w-1/3 flex justify-end items-center gap-2">
                 <Volume2 size={16} className="text-gray-400 hidden md:block" />
                 <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer hidden md:block [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                 />
            </div>
        </div>
    );
};

const MusicView = () => {
    const { playlist, playTrack, currentTrack, isPlaying, token, fetchMusic } = useApp();
    const [tab, setTab] = useState('all'); // all, favorites
    
    const toggleLike = async (e, trackId) => {
        if(e) e.stopPropagation();
        try {
            await axios.post(`${API_URL}/music/${trackId}/like`, {}, { headers: { Authorization: token } });
            fetchMusic();
        } catch(e) { console.error(e); }
    }

    const tracksToShow = tab === 'favorites' ? playlist.filter(t => t.isLiked) : playlist;

    return (
        <div className="max-w-4xl mx-auto pt-8 pb-32 px-4 md:px-0 animate-in fade-in">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light flex items-center gap-2">
                    <Music className="text-cyan-500" /> Медиатека
                </h2>
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setTab('all')} className={cn("pb-2 text-sm font-medium transition-colors whitespace-nowrap", tab === 'all' ? "text-cyan-600 border-b-2 border-cyan-500" : "text-gray-500")}>Все станции</button>
                <button onClick={() => setTab('favorites')} className={cn("pb-2 text-sm font-medium transition-colors whitespace-nowrap", tab === 'favorites' ? "text-cyan-600 border-b-2 border-cyan-500" : "text-gray-500")}>Избранное</button>
            </div>

            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm overflow-hidden">
                <div className="p-4 space-y-2">
                    {tracksToShow.map((track, i) => (
                        <div 
                            key={track.id} 
                            onClick={() => playTrack(track)}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border border-transparent group",
                                currentTrack?.url === track.url 
                                    ? "bg-cyan-50 border-cyan-200 shadow-sm" 
                                    : "hover:bg-white/50 hover:border-gray-100"
                            )}
                        >
                            <span className="text-xs text-gray-400 w-4 font-mono">{i + 1}</span>
                            <div className="relative w-12 h-12 shrink-0">
                                <img src={track.cover} className="w-full h-full rounded-lg object-cover" />
                                {currentTrack?.url === track.url && (
                                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                                        {isPlaying ? (
                                            <div className="flex gap-0.5 items-end h-4">
                                                <div className="w-1 bg-cyan-400 animate-[bounce_1s_infinite] h-2"></div>
                                                <div className="w-1 bg-cyan-400 animate-[bounce_1.2s_infinite] h-4"></div>
                                                <div className="w-1 bg-cyan-400 animate-[bounce_0.8s_infinite] h-3"></div>
                                            </div>
                                        ) : <Pause size={16} className="text-white"/>}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className={cn("font-bold text-sm truncate", currentTrack?.url === track.url ? "text-cyan-700" : "text-gray-900")}>
                                    {track.title}
                                </p>
                                <p className="text-xs text-gray-500">{track.artist}</p>
                            </div>

                            <button onClick={(e) => toggleLike(e, track.id)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Heart size={16} className={track.isLiked ? "fill-red-500 text-red-500" : "text-gray-400"} />
                            </button>

                            <span className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-500 border border-gray-200 min-w-[60px] text-center hidden md:block">
                                {track.genre}
                            </span>
                        </div>
                    ))}
                    {tracksToShow.length === 0 && <div className="text-center py-10 text-gray-400">Список пуст...</div>}
                </div>
            </div>
        </div>
    );
};

/**
 * --- ЭКРАНЫ (VIEWS) ---
 */

const LoginView = () => {
  const { login, register } = useApp();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [mode, setMode] = useState('login_pass'); 
  const [regData, setRegData] = useState(null);

  const handleSubmit = async () => {
    if (mode === 'register') {
        if(!name || !password) return alert("Заполните все поля");
        const data = await register(name, password);
        if (data) setRegData(data);
    } else if (mode === 'login_pass') {
        if(!name || !password) return alert("Заполните все поля");
        await login({ login: name, password });
    } else if (mode === 'login_code') {
        if(!secretCode) return alert("Введите код");
        await login({ code: secretCode });
    }
  };

  if (regData) {
      return (
          <div className="h-screen flex items-center justify-center relative z-20 px-4">
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border border-cyan-200 animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                      <Shield size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Узел создан!</h2>
                  <p className="text-sm text-gray-500 mb-6">Ваш секретный ключ (альтернативный вход):</p>
                  
                  <div className="bg-gray-100 p-4 rounded-xl font-mono text-lg font-bold tracking-widest text-center border border-gray-200 select-all mb-6 break-all">
                      {regData.secret_code}
                  </div>
                  
                  <MinimalButton onClick={() => { setRegData(null); setMode('login_code'); setSecretCode(regData.secret_code); }}>
                      Войти
                  </MinimalButton>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center relative z-10 px-4 overflow-hidden">
      {/* 3D CUBE VISUALIZATION */}
      <div className="mb-10 scale-75 md:scale-100">
          <Cube3D />
      </div>

      <div className="w-full max-w-md bg-white/20 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl relative">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light tracking-tight text-gray-900 mb-2">NEURAL<span className="font-bold">NET</span></h1>
          <p className="text-xs uppercase tracking-widest text-gray-500">Private Protocol v2.5</p>
        </div>

        <div className="space-y-4">
            {mode === 'login_code' ? (
                <div>
                    <input 
                        type="text" 
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                        placeholder="Секретный код доступа"
                        className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-center font-mono text-sm mb-2"
                    />
                </div>
            ) : (
                <>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Логин (Имя)"
                        className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-2"
                    />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Пароль"
                        className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-2"
                    />
                </>
            )}
          
          <MinimalButton onClick={handleSubmit} className="w-full mt-4">
            {mode === 'register' ? 'Создать узел' : 'Войти в сеть'}
          </MinimalButton>

          <div className="flex flex-col gap-2 mt-4 text-center">
             {mode !== 'login_code' && (
                 <button onClick={() => setMode('login_code')} className="text-xs text-cyan-600 hover:underline">
                     Вход по секретному ключу
                 </button>
             )}
             {mode === 'login_code' && (
                 <button onClick={() => setMode('login_pass')} className="text-xs text-cyan-600 hover:underline">
                     Вход по Логину и Паролю
                 </button>
             )}
             
             <button 
                onClick={() => setMode(mode === 'register' ? 'login_pass' : 'register')}
                className="text-[10px] text-gray-500 hover:text-gray-900 uppercase tracking-wider mt-2"
             >
                {mode === 'register' ? "Есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { setView, view, logout, user, friendRequests, goToProfile, token } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (e) => {
      setSearchQuery(e.target.value);
      if (e.target.value.length > 1) {
          try {
              const res = await axios.get(`${API_URL}/search?q=${e.target.value}`, { headers: { Authorization: token } });
              setSearchResults(res.data);
          } catch(e) {}
      } else {
          setSearchResults([]);
      }
  }

  const NavItem = ({ icon: Icon, label, id, active, badge }) => (
    <button 
      onClick={() => setView(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
        active ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:bg-white/40 hover:text-gray-700"
      )}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full" />}
      <Icon size={18} className={cn("transition-colors", active ? "text-cyan-600" : "group-hover:text-gray-900")} />
      <span className="font-medium text-sm">{label}</span>
      {badge > 0 && (
          <span className="absolute right-4 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
              {badge}
          </span>
      )}
    </button>
  );

  return (
    <div className="w-64 hidden md:flex flex-col h-[85vh] fixed top-[7.5vh] left-6 bg-white/60 backdrop-blur-lg border border-white/50 rounded-3xl p-6 shadow-xl z-20">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">N</div>
        <span className="font-bold tracking-tight text-lg">NEURAL</span>
      </div>

      <div className="relative mb-6">
          <div className="absolute left-3 top-2.5 text-gray-400"><Search size={14}/></div>
          <input 
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Поиск людей..." 
            className="w-full bg-white/50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-400"
          />
          {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white rounded-xl shadow-lg mt-2 p-2 z-50 border border-gray-100 max-h-40 overflow-y-auto">
                  {searchResults.map(u => (
                      <div key={u.handle} onClick={() => {goToProfile(u.handle); setSearchResults([]); setSearchQuery('')}} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <img src={u.avatar} className="w-6 h-6 rounded-full"/>
                          <span className="text-xs font-bold truncate">{u.name}</span>
                      </div>
                  ))}
              </div>
          )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        <NavItem icon={Home} label="Лента" id="feed" active={view === 'feed'} />
        <NavItem icon={User} label="Профиль" id="profile" active={view === 'profile'} />
        <NavItem icon={MessageSquare} label="Сообщения" id="messages" active={view === 'messages'} />
        <NavItem icon={Music} label="Музыка" id="music" active={view === 'music'} />
        <NavItem icon={Bell} label="Уведомления" id="notifications" active={view === 'notifications'} badge={friendRequests.length} />
        <NavItem icon={Settings} label="Настройки" id="settings" active={view === 'settings'} />
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-200/50">
        <div className="flex items-center gap-3 p-3 bg-white/40 rounded-xl mb-4 border border-white">
          <img src={user?.avatar} alt="me" className="w-8 h-8 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">
               {user?.name}
               {user?.name === '313' && <Crown size={12} className="inline ml-1 text-yellow-500 fill-yellow-500" />}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{user?.status || "В сети"}</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 px-3 transition-colors">
          <LogOut size={14} /> Отключиться
        </button>
      </div>
    </div>
  );
};

const MobileSearchView = () => {
    const { goToProfile, token } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async (e) => {
        setSearchQuery(e.target.value);
        if (e.target.value.length > 1) {
            try {
                const res = await axios.get(`${API_URL}/search?q=${e.target.value}`, { headers: { Authorization: token } });
                setSearchResults(res.data);
            } catch(e) {}
        } else {
            setSearchResults([]);
        }
    }

    return (
        <div className="max-w-md mx-auto pt-4 px-4 animate-in fade-in pb-32">
            <h2 className="text-2xl font-light mb-6">Поиск пользователей</h2>
            <div className="relative mb-6">
                <div className="absolute left-3 top-3 text-gray-400"><Search size={18}/></div>
                <input 
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Введите имя или @handle..." 
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-cyan-400 shadow-sm"
                    autoFocus
                />
            </div>
            
            <div className="space-y-2">
                {searchResults.map(u => (
                    <div key={u.handle} onClick={() => goToProfile(u.handle)} className="flex items-center gap-4 p-4 bg-white/70 rounded-xl cursor-pointer shadow-sm border border-gray-100 hover:border-cyan-200 transition-all">
                        <img src={u.avatar} className="w-12 h-12 rounded-full object-cover"/>
                        <div>
                            <span className="text-sm font-bold block">{u.name}</span>
                            <span className="text-xs text-gray-500">{u.handle}</span>
                        </div>
                    </div>
                ))}
                {searchResults.length === 0 && searchQuery.length > 1 && (
                    <div className="text-center text-gray-400 py-10">Пользователи не найдены</div>
                )}
            </div>
        </div>
    );
};

const FeedView = () => {
  const { token } = useApp();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
      try {
          const res = await axios.get(`${API_URL}/posts`, { headers: { Authorization: token || '' } });
          setPosts(res.data);
          setLoading(false);
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 3000); 
    return () => clearInterval(interval);
  }, [token]);

  const handleCreatePost = async (content, imageUrl) => {
    try {
        await axios.post(`${API_URL}/posts`, { content, imageUrl }, { headers: { Authorization: token || '' } });
        fetchPosts(); 
    } catch (e) { alert("Ошибка отправки сигнала"); }
  };

  const handleLikeUpdate = (postId, newLikes, isLiked) => {
     setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes, isLiked } : p));
  };

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-32 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <CreatePostWidget onPost={handleCreatePost} />
      
      <div className="space-y-4">
        {loading ? (
             <div className="text-center p-10 text-gray-400">Загрузка потока...</div>
        ) : (
            posts.map(post => <PostCard key={post.id} post={post} onLikeUpdate={handleLikeUpdate} />)
        )}
      </div>
    </div>
  );
};

const NotificationsView = () => {
    const { friendRequests, respondToRequest, goToProfile } = useApp();

    return (
        <div className="max-w-2xl mx-auto pt-8 px-4 animate-in fade-in pb-32">
            <h2 className="text-2xl font-light mb-6">Центр уведомлений</h2>
            {friendRequests.length === 0 ? (
                <div className="text-center text-gray-400 py-10 bg-white/40 rounded-3xl border border-white/40">
                    Нет новых уведомлений
                </div>
            ) : (
                <div className="space-y-3">
                    {friendRequests.map(req => (
                        <div key={req.requestId} className="bg-white/70 p-4 rounded-xl flex items-center justify-between shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => goToProfile(req.senderHandle)}>
                                <img src={req.senderAvatar} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <p className="font-bold text-sm">{req.senderName}</p>
                                    <p className="text-xs text-gray-500">Хочет добавить вас в друзья</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => respondToRequest(req.requestId, 'accept')} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => respondToRequest(req.requestId, 'reject')} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MessagesView = () => {
  const { token, user, activeChat, setActiveChat, goToProfile } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatList, setChatList] = useState([]); 
  const chatEndRef = useRef(null);

  useEffect(() => {
      axios.get(`${API_URL}/users/${user.handle.replace('@','')}`, {headers: {Authorization: token}})
           .then(res => setChatList(res.data.friendsList))
           .catch(e => console.error(e));
  }, []);

  const fetchMessages = async () => {
      try {
          const url = activeChat 
            ? `${API_URL}/messages?partner_id=${activeChat.id}` 
            : `${API_URL}/messages`; 
          
          const res = await axios.get(url, {
              headers: { Authorization: token }
          });
          setMessages(res.data);
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [activeChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChat]);

  const handleSend = async () => {
      if(!input.trim()) return;
      try {
          const payload = {
              text: input,
              recipientId: activeChat ? activeChat.id : null 
          };
          await axios.post(`${API_URL}/messages`, payload, {
              headers: { Authorization: token }
          });
          setInput('');
          fetchMessages();
      } catch (e) { console.error(e); }
  }

  const handleDeleteMessage = async (msgId) => {
      if(!confirm("Удалить сообщение?")) return;
      try {
          await axios.delete(`${API_URL}/messages?id=${msgId}`, {
              headers: { Authorization: token }
          });
          fetchMessages();
      } catch(e) { console.error(e); }
  }

  // ИСПРАВЛЕНИЕ: Увеличиваем высоту контейнера для мобильных устройств, чтобы убрать эффект "кусочка"
  return (
    <div className="h-[calc(100vh-140px)] md:h-[80vh] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500 pb-2 md:pb-0">
      {/* Список чатов (Скрывается на мобильном если чат активен) */}
      <div className={cn(
          "w-full md:w-80 bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 overflow-hidden shadow-sm shrink-0 flex flex-col",
          activeChat ? "hidden md:flex" : "flex h-full"
      )}>
        <div className="p-5 border-b border-gray-100 bg-white/40">
          <h3 className="font-bold text-gray-900">Ваши чаты</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
            <div 
                onClick={() => setActiveChat(null)}
                className={cn(
                    "p-4 cursor-pointer flex items-center gap-3 border-b border-gray-100/50 hover:bg-white/50 transition-colors",
                    !activeChat && "bg-white/80 border-l-4 border-l-cyan-400"
                )}
            >
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
                    <Globe size={20} />
                </div>
                <div>
                    <span className="font-bold text-sm text-gray-900 block">Общая Сеть</span>
                    <span className="text-[10px] text-gray-500">Глобальный канал</span>
                </div>
            </div>

            {chatList.map(friend => (
                <div 
                    key={friend.id}
                    onClick={() => setActiveChat(friend)}
                    className={cn(
                        "p-4 cursor-pointer flex items-center gap-3 border-b border-gray-100/50 hover:bg-white/50 transition-colors",
                        activeChat?.id === friend.id && "bg-white/80 border-l-4 border-l-cyan-400"
                    )}
                >
                    <img src={friend.avatar} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <span className="font-bold text-sm text-gray-900 block">{friend.name}</span>
                        <span className="text-[10px] text-gray-500">{friend.handle}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Окно чата (Скрывается на мобильном если чат НЕ активен) */}
      <div className={cn(
          "flex-1 bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm overflow-hidden flex flex-col h-full",
          !activeChat && "hidden md:flex" 
      )}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/40">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveChat(null)} className="md:hidden p-2 rounded-full hover:bg-gray-200">
                <ChevronLeft size={24} />
            </button>
            
            {activeChat ? (
                <>
                    <img src={activeChat.avatar} className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-bold text-gray-800">{activeChat.name}</span>
                </>
            ) : (
                <>
                    <div className="w-8 h-8 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="font-bold text-gray-800">Global Neural Link</span>
                </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex items-end gap-2 max-w-[85%]", msg.isOwn ? "ml-auto flex-row-reverse" : "mr-auto")}>
               <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => !msg.isOwn && goToProfile("@"+msg.senderName)}>
                   <img src={msg.senderAvatar || 'https://i.pravatar.cc/150'} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
               </div>
               <div className={cn("flex flex-col", msg.isOwn ? "items-end" : "items-start")}>
                    {!msg.isOwn && <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.senderName}</span>}
                    <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm border relative group break-all",
                        msg.isOwn ? "bg-gray-900 text-white border-gray-900 rounded-br-none" : "bg-white text-gray-800 border-gray-200 rounded-bl-none"
                    )}>
                        {msg.text}
                        {msg.isOwn && (
                            <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
               </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white/40 border-t border-gray-100">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Сообщение..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400"
            />
            <button type="submit" className="w-10 h-10 bg-cyan-400 text-white rounded-xl flex items-center justify-center hover:bg-cyan-500 shadow-lg shrink-0">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ProfileViewGeneric = ({ profileUser, isOwn }) => {
    const { token, user, setUser, setView, goToProfile, friendRequests, respondToRequest, startChat } = useApp();
    const [posts, setPosts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [statusData, setStatusData] = useState({ 
        isFriend: false, 
        isPendingSent: false, 
        isPendingReceived: false, 
        isAdmin: false, 
        isVerified: false,
        lastSeen: null,
        reputation: 0,
        postsCount: 0
    });
    
    const [isEditing, setIsEditing] = useState(false);
    const [editBio, setEditBio] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [editStatus, setEditStatus] = useState('');

    const loadProfileData = async () => {
        if(!profileUser) return;
        try {
            const res = await axios.get(`${API_URL}/users/${profileUser.handle}`, { 
                headers: {Authorization: token || ''}
            });
            const d = res.data;
            setPosts(d.posts);
            setFriends(d.friendsList);
            // setLikedPosts(d.likedPosts || []); // Удалено Избранное
            
            setStatusData({
                isFriend: d.friendStatus === 'friends',
                isPendingSent: d.friendStatus === 'pending_sent',
                isPendingReceived: d.friendStatus === 'pending_received',
                isAdmin: d.isAdmin,
                isVerified: d.isVerified,
                lastSeen: d.lastSeen,
                reputation: d.reputation,
                postsCount: d.postsCount
            });

            if(isOwn) {
                setEditBio(d.bio || '');
                setEditAvatar(d.avatar || '');
                setEditStatus(d.status || '');
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadProfileData();
    }, [profileUser, isOwn]);

    const handleProfileLikeUpdate = (postId, newLikes, isLiked) => {
         setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes, isLiked } : p));
    };

    const handleSaveProfile = async () => {
        try {
            const res = await axios.post(`${API_URL}/me/update`, {
                bio: editBio,
                avatar: editAvatar,
                status: editStatus
            }, { headers: { Authorization: token } });
            
            setUser(res.data);
            setIsEditing(false);
            loadProfileData();
            alert("Профиль обновлен");
        } catch (e) { alert("Ошибка обновления"); }
    };

    const handleFriendAction = async () => {
        try {
            await axios.post(`${API_URL}/friends/request`, { handle: profileUser.handle }, { headers: { Authorization: token } });
            loadProfileData();
        } catch (e) { console.error(e); }
    };

    const handleRemoveFriend = async () => {
        if(!confirm("Удалить пользователя из друзей?")) return;
        try {
            await axios.post(`${API_URL}/friends/remove`, { handle: profileUser.handle }, { headers: { Authorization: token } });
            loadProfileData();
        } catch (e) { console.error(e); }
    }

    const handleAdminVerify = async () => {
        try {
            await axios.post(`${API_URL}/admin/verify_toggle`, { handle: profileUser.handle }, { headers: { Authorization: token } });
            loadProfileData();
        } catch (e) { alert("Ошибка прав"); }
    }

    const handleCreateWallPost = async (content, imageUrl) => {
        try {
            await axios.post(`${API_URL}/posts`, { content, imageUrl }, { headers: { Authorization: token } });
            loadProfileData(); 
        } catch (e) { alert("Ошибка публикации"); }
    }

    const handleAcceptFromProfile = async () => {
        const req = friendRequests.find(r => r.senderHandle === profileUser.handle);
        if (req) {
            await respondToRequest(req.requestId, 'accept');
            loadProfileData();
        } else {
            alert("Зайдите в уведомления для подтверждения");
        }
    }
    
    const handleRejectFromProfile = async () => {
        const req = friendRequests.find(r => r.senderHandle === profileUser.handle);
        if (req) {
            await respondToRequest(req.requestId, 'reject');
            loadProfileData();
        }
    }

    const handleWriteMessage = () => {
        startChat({
            id: profileUser.id, 
            name: profileUser.name,
            avatar: profileUser.avatar,
            handle: profileUser.handle
        });
    }

    if(!profileUser) return <div>Loading Profile...</div>;

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-32 md:pb-0 px-2 md:px-0">
      
      {/* Модальное окно редактирования */}
      {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in">
                  <h3 className="text-xl font-bold mb-4">Редактирование профиля</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-gray-500 font-bold ml-1">Аватар (URL)</label>
                          <input value={editAvatar} onChange={e => setEditAvatar(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-cyan-400 outline-none" placeholder="https://..." />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500 font-bold ml-1">Статус</label>
                          <input value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-cyan-400 outline-none" placeholder="Ваш статус..." />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500 font-bold ml-1">О себе</label>
                          <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm h-32 resize-none focus:border-cyan-400 outline-none" placeholder="Расскажите о себе..." />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Отмена</button>
                          <button onClick={handleSaveProfile} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black">Сохранить</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        <div className="col-span-1 md:col-span-4 space-y-6">
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm p-8 text-center relative overflow-hidden group">
                
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-100/50 to-transparent pointer-events-none"></div>

                <div className="relative inline-block mb-4 mt-2">
                     {/* 3D элемент в профиле (ВОЗВРАЩЕНО) */}
                     <div className="absolute top-0 right-0 opacity-50 pointer-events-none">
                         <Cube3D small />
                     </div>

                    <img src={profileUser.avatar} alt="Profile" className="w-28 h-28 rounded-full border-4 border-white shadow-xl object-cover relative z-10" />
                    {statusData.isVerified && <div className="absolute bottom-1 right-1 bg-white p-1.5 rounded-full text-cyan-500 shadow-md z-10"><Shield size={18} fill="currentColor" /></div>}
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2 relative z-10">
                    {profileUser.name}
                    {profileUser.name === '313' && <Crown size={20} className="text-yellow-500 fill-yellow-500" />}
                </h2>
                <p className="text-sm text-gray-500 font-mono mb-3 relative z-10">{profileUser.handle}</p>
                
                <div className="text-[11px] font-medium text-gray-400 mb-4 relative z-10 flex items-center justify-center gap-2">
                   <div className={cn("w-2 h-2 rounded-full", statusData.lastSeen?.includes('В сети') || statusData.lastSeen?.includes('только что') ? "bg-green-500" : "bg-gray-300")}></div>
                   {formatLastSeen(statusData.lastSeen)}
                </div>
                
                <div className="flex justify-center gap-4 mb-6 relative z-10 bg-white/50 p-2 rounded-2xl mx-auto max-w-[200px]">
                    <div className="flex flex-col items-center px-4 border-r border-gray-200">
                        <span className="font-bold text-gray-900 text-lg">{statusData.postsCount}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Публ.</span>
                    </div>
                    <div className="flex flex-col items-center px-4">
                        <span className="font-bold text-gray-900 text-lg flex items-center gap-1">
                            {statusData.reputation} <Star size={12} className="text-yellow-500 fill-yellow-500 mb-1"/>
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Реп.</span>
                    </div>
                </div>
                
                <p className="text-sm text-gray-700 italic mb-6 relative z-10 px-4 leading-relaxed opacity-80">
                    "{profileUser.bio}"
                </p>

                {isOwn ? (
                    // ИСПРАВЛЕНИЕ: Темная кнопка редактирования
                    <MinimalButton onClick={() => setIsEditing(true)} className="w-full text-xs relative z-10 bg-gray-900 text-white hover:bg-black shadow-lg">
                        <Edit3 size={14} /> Редактировать профиль
                    </MinimalButton>
                ) : (
                    <div className="space-y-2 relative z-10">
                        {statusData.isFriend ? (
                            <div className="flex gap-2">
                                <div className="flex-1 py-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex justify-center items-center gap-2 border border-green-100">
                                    <UserCheck size={16} /> Вы друзья
                                </div>
                                <button onClick={handleRemoveFriend} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100">
                                    <UserMinus size={18}/>
                                </button>
                            </div>
                        ) : statusData.isPendingSent ? (
                            <div className="w-full py-2.5 bg-yellow-50 text-yellow-700 rounded-xl text-xs text-center border border-yellow-100">
                                Запрос отправлен
                            </div>
                        ) : statusData.isPendingReceived ? (
                            <div className="flex gap-2">
                                <MinimalButton onClick={handleAcceptFromProfile} className="flex-1 text-xs bg-green-500 hover:bg-green-600">
                                    <Check size={14} /> Принять
                                </MinimalButton>
                                <MinimalButton onClick={handleRejectFromProfile} className="flex-1 text-xs bg-red-500 hover:bg-red-600">
                                    <X size={14} />
                                </MinimalButton>
                            </div>
                        ) : (
                            <MinimalButton onClick={handleFriendAction} className="w-full text-xs bg-cyan-500 hover:bg-cyan-600 shadow-cyan-200">
                                <UserPlus size={14} /> Добавить в друзья
                            </MinimalButton>
                        )}
                        
                        <MinimalButton onClick={handleWriteMessage} variant="outline" className="w-full text-xs hover:bg-gray-900 hover:text-white border-gray-300">
                            <Send size={14} /> Написать сообщение
                        </MinimalButton>

                        {user?.isAdmin && (
                            <MinimalButton onClick={handleAdminVerify} className="w-full text-xs bg-purple-600 hover:bg-purple-700 mt-2">
                                <Shield size={14} /> {statusData.isVerified ? "Снять галочку" : "Выдать галочку"}
                            </MinimalButton>
                        )}
                    </div>
                )}
            </div>

            {/* БЛОК ИЗБРАННЫХ (ЛАЙКНУТЫХ) ПОСТОВ УДАЛЕН ПО ЗАПРОСУ */}

            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={16} /> Друзья <span className="text-gray-400 text-xs">({friends.length})</span>
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {friends.slice(0, 8).map((f, i) => (
                        <div key={i} className="flex flex-col items-center cursor-pointer group" onClick={() => goToProfile(f.handle)}>
                            <img src={f.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover group-hover:ring-2 ring-cyan-400 transition-all" />
                            <span className="text-[10px] text-gray-600 truncate w-full text-center mt-1">{f.name.split(' ')[0]}</span>
                        </div>
                    ))}
                    {friends.length === 0 && <span className="text-xs text-gray-400 col-span-4">Список друзей пуст</span>}
                </div>
            </div>
        </div>

        <div className="col-span-1 md:col-span-8 space-y-6">
          <div className="flex justify-between items-center mb-4 px-2 md:px-0">
              <h2 className="text-xl font-light">Стена публикаций</h2>
          </div>

          {isOwn && <CreatePostWidget onPost={handleCreateWallPost} />}
          
          {posts.map(post => <PostCard key={post.id} post={post} onLikeUpdate={handleProfileLikeUpdate} />)}
          {posts.length === 0 && <div className="text-center text-gray-400 py-10 bg-white/40 rounded-3xl border border-white/40">На стене пока пусто.</div>}
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => (
  <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 p-8">
    <h2 className="text-2xl font-light mb-6">Конфигурация системы</h2>
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl">
        <div>
          <p className="font-medium text-gray-900">Приватный режим</p>
          <p className="text-xs text-gray-500">Скрыть активность узла от глобальной сети</p>
        </div>
        <div className="w-12 h-6 bg-cyan-400 rounded-full relative cursor-pointer">
          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * --- MAIN LAYOUT ---
 */
const MainLayout = () => {
  const { view, user, viewedProfile } = useApp();

  return (
    <div className="flex min-h-screen pt-[7.5vh] md:pl-72 pr-0 md:pr-8">
      <Sidebar />
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto pb-32 md:pb-24">
        {view === 'feed' && <FeedView />}
        {view === 'messages' && <MessagesView />}
        {view === 'notifications' && <NotificationsView />}
        {view === 'music' && <MusicView />}
        {view === 'profile' && <ProfileViewGeneric profileUser={user} isOwn={true} />}
        {view === 'user_profile' && <ProfileViewGeneric profileUser={viewedProfile} isOwn={false} />}
        {view === 'settings' && <SettingsView />}
        {view === 'search' && <MobileSearchView />}
      </main>
      
      {/* Глобальный плеер */}
      <MusicPlayer />
    </div>
  );
};

const MobileNav = () => {
    const { setView, view, currentTrack, isPlaying } = useApp();
    const icons = [
        { id: 'feed', icon: Home },
        { id: 'messages', icon: MessageSquare },
        { id: 'search', icon: Search }, // ДОБАВЛЕНО: Кнопка поиска
        { id: 'music', icon: Music },
        { id: 'profile', icon: User },
        { id: 'notifications', icon: Bell }
    ];

    // ИСПРАВЛЕНИЕ: Поднимаем меню, если плеер активен
    return (
        <div className={cn(
            "md:hidden fixed left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-6 py-4 rounded-full shadow-2xl z-40 flex gap-4 transition-all duration-300",
            currentTrack ? "bottom-24" : "bottom-6"
        )}>
            {icons.map((item) => (
                <button 
                    key={item.id} 
                    onClick={() => setView(item.id)}
                    className={cn("transition-colors", view === item.id ? "text-cyan-400" : "text-gray-400")}
                >
                    <item.icon size={22} />
                </button>
            ))}
        </div>
    );
}

const AppContent = () => {
  const { user } = useApp();
  return (
    <div className="relative min-h-screen bg-[#f3f4f6] text-gray-800 font-sans overflow-x-hidden selection:bg-cyan-200">
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none bg-gradient-to-br from-gray-50 to-gray-200"></div>
      {!user ? (
        <LoginView />
      ) : (
        <>
          <MainLayout />
          <MobileNav />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}