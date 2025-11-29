import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  User, MessageSquare, Home, Settings, Shield, Send, MoreHorizontal, 
  Heart, Share2, Activity, LogOut, Globe, Lock, Bell, X, Edit3, 
  Image as ImageIcon, Users, UserPlus, UserMinus, Star, Check, UserCheck, 
  Trash2, Crown, Smartphone, Menu, ChevronLeft,
  Music, Play, Pause, SkipBack, SkipForward, Volume2
} from 'lucide-react';
import axios from 'axios';

// --- КОНФИГУРАЦИЯ ---
const API_URL = 'http://localhost:5000/api';

/**
 * --- УТИЛИТЫ ---
 */
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Функция форматирования времени
const formatLastSeen = (isoString) => {
    if (!isoString) return "Не в сети";
    const date = new Date(isoString);
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const diffSeconds = Math.floor((now.getTime() - date.getTime() - offset) / 1000); 

    if (diffSeconds < 60) return "В сети";
    if (diffSeconds < 3600) return `Был(а) в сети ${Math.floor(diffSeconds / 60)} мин. назад`;
    if (diffSeconds < 86400) return `Был(а) в сети ${Math.floor(diffSeconds / 3600)} ч. назад`;
    if (diffSeconds < 604800) return `Был(а) в сети ${Math.floor(diffSeconds / 86400)} дн. назад`;
    return `Был(а) в сети ${date.toLocaleDateString()}`;
};

/**
 * --- КОМПОНЕНТ УВЕДОМЛЕНИЙ (TOAST) ---
 */
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
  const [playlist, setPlaylist] = useState([]);
  
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
  useEffect(() => {
      if (token && view !== 'login') {
          axios.get(`${API_URL}/music`, { headers: { Authorization: token } })
              .then(res => setPlaylist(res.data))
              .catch(e => console.error(e));
      }
  }, [token, view]);

  const login = async (code) => {
    try {
      const res = await axios.post(`${API_URL}/login`, { code });
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('neural_token', res.data.token);
      setView('feed');
      return true;
    } catch (e) {
      alert("Ошибка доступа: Неверный код");
      return false;
    }
  };

  const register = async (name) => {
    try {
      const res = await axios.post(`${API_URL}/register`, { name });
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
      if (currentTrack?.id === track.id) {
          setIsPlaying(!isPlaying);
      } else {
          setCurrentTrack(track);
          setIsPlaying(true);
      }
  };

  const nextTrack = () => {
      if (!currentTrack || playlist.length === 0) return;
      const idx = playlist.findIndex(t => t.id === currentTrack.id);
      const nextIdx = (idx + 1) % playlist.length;
      setCurrentTrack(playlist[nextIdx]);
      setIsPlaying(true);
  };

  const prevTrack = () => {
      if (!currentTrack || playlist.length === 0) return;
      const idx = playlist.findIndex(t => t.id === currentTrack.id);
      const prevIdx = (idx - 1 + playlist.length) % playlist.length;
      setCurrentTrack(playlist[prevIdx]);
      setIsPlaying(true);
  };

  return (
    <AppContext.Provider value={{ 
        view, setView, user, setUser, token, login, register, logout, 
        viewedProfile, setViewedProfile, goToProfile, 
        friendRequests, respondToRequest,
        activeChat, setActiveChat, startChat,
        setNotification,
        // Музыка
        playlist, currentTrack, isPlaying, setIsPlaying, playTrack, nextTrack, prevTrack
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
 * --- ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ---
 */
const CableBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();
    
    const nodes = [];
    const nodeCount = 6;
    const cableY = height * 0.85;
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (width / (nodeCount + 1)) * (i + 1),
        y: cableY + (Math.random() * 50 - 25),
      });
    }
    
    let time = 0;
    const animate = () => {
      ctx.fillStyle = '#f1f5f9'; 
      ctx.fillRect(0, 0, width, height);
      time += 0.005;

      ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }

      nodes.forEach((node, i) => {
        const floatY = node.y + Math.sin(time * 2 + i) * 10;
        if (i < nodes.length - 1) {
          const next = nodes[i + 1];
          const nextFloatY = next.y + Math.sin(time * 2 + (i + 1)) * 10;
          ctx.beginPath();
          ctx.moveTo(node.x, floatY);
          const cx = (node.x + next.x) / 2;
          const cy = Math.max(floatY, nextFloatY) + 50 + Math.sin(time + i) * 20;
          ctx.quadraticCurveTo(cx, cy, next.x, nextFloatY);
          
          const gradient = ctx.createLinearGradient(node.x, floatY, next.x, nextFloatY);
          gradient.addColorStop(0, 'rgba(100, 100, 100, 0.1)');
          gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
          gradient.addColorStop(1, 'rgba(100, 100, 100, 0.1)');
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.arc(node.x, floatY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(node.x, floatY, 8 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      requestAnimationFrame(animate);
    };
    animate();
    return () => window.removeEventListener('resize', resize);
  }, []);
  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none" />;
};

const ThreeDObject = ({ className }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const edges = [[0,1], [1,2], [2,3], [3,0], [4,5], [5,6], [6,7], [7,4], [0,4], [1,5], [2,6], [3,7]];
    let angleX = 0;
    let angleY = 0;
    const animate = () => {
      if(!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      angleX += 0.01;
      angleY += 0.015;
      const projectedVertices = vertices.map(v => {
        let x = v[0], y = v[1], z = v[2];
        let dy = y * Math.cos(angleX) - z * Math.sin(angleX);
        let dz = y * Math.sin(angleX) + z * Math.cos(angleX);
        y = dy; z = dz;
        let dx = x * Math.cos(angleY) - z * Math.sin(angleY);
        dz = x * Math.sin(angleY) + z * Math.cos(angleY);
        x = dx; z = dz;
        const fov = 300;
        const scale = fov / (fov + z * 100);
        return { x: cx + x * 60 * scale, y: cy + y * 60 * scale };
      });
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      edges.forEach(edge => {
        const v1 = projectedVertices[edge[0]];
        const v2 = projectedVertices[edge[1]];
        ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.stroke();
      });
      projectedVertices.forEach(v => {
        ctx.beginPath(); ctx.arc(v.x, v.y, 2, 0, Math.PI * 2); ctx.fillStyle = '#06b6d4'; ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
  }, []);
  return <canvas ref={canvasRef} width={200} height={200} className={cn("opacity-60", className)} />;
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

const VerifiedBadge = () => (
  <span className="inline-flex ml-1 text-cyan-500" title="Verified Node">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </span>
);

const FriendsBlock = ({ friends, onProfileClick }) => (
    <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={16} /> Друзья <span className="text-gray-400 text-xs">({friends.length})</span>
        </h3>
        <div className="grid grid-cols-4 gap-2">
            {friends.slice(0, 8).map((f, i) => (
                <div key={i} className="flex flex-col items-center cursor-pointer group" onClick={() => onProfileClick(f.handle)}>
                    <img src={f.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover group-hover:ring-2 ring-cyan-400 transition-all" />
                    <span className="text-[10px] text-gray-600 truncate w-full text-center mt-1">{f.name.split(' ')[0]}</span>
                </div>
            ))}
            {friends.length === 0 && <span className="text-xs text-gray-400 col-span-4">Список друзей пуст</span>}
        </div>
    </div>
);

const RecentLikesBlock = ({ posts, onProfileClick }) => (
    <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Heart size={16} className="text-red-500" /> Последние лайки
        </h3>
        <div className="space-y-3">
            {posts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex gap-3 items-center border-b border-gray-100 pb-2 last:border-0">
                    <img src={p.author.avatar} className="w-8 h-8 rounded-full object-cover cursor-pointer" onClick={() => onProfileClick(p.author.handle)}/>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate cursor-pointer hover:text-cyan-600" onClick={() => onProfileClick(p.author.handle)}>{p.author.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{p.content}</p>
                    </div>
                </div>
            ))}
            {posts.length === 0 && <span className="text-xs text-gray-400">Пока нет лайков</span>}
        </div>
    </div>
);

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
        <div className="absolute -left-3 top-8 w-3 h-[1px] bg-cyan-200 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    {post.author.isVerified && <VerifiedBadge />}
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
    const { currentTrack, isPlaying, setIsPlaying, nextTrack, prevTrack } = useApp();
    const audioRef = useRef(null);

    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;
        if (isPlaying) {
            audioRef.current.play().catch(e => console.log("Auto-play prevented", e));
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, currentTrack]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    }

    if (!currentTrack) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200 z-50 px-4 py-3 flex items-center justify-between md:pl-72 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <audio 
                ref={audioRef} 
                src={currentTrack.url} 
                onEnded={nextTrack}
            />
            
            <div className="flex items-center gap-3 w-1/3">
                <img src={currentTrack.cover} alt="cover" className="w-10 h-10 rounded-lg object-cover shadow-sm animate-spin-slow" style={{animationPlayState: isPlaying ? 'running' : 'paused'}} />
                <div className="hidden md:block overflow-hidden">
                    <p className="text-xs font-bold text-gray-900 truncate">{currentTrack.title}</p>
                    <p className="text-[10px] text-gray-500 truncate">{currentTrack.artist}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button onClick={prevTrack} className="text-gray-400 hover:text-gray-900 transition-colors"><SkipBack size={20}/></button>
                <button onClick={togglePlay} className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1"/>}
                </button>
                <button onClick={nextTrack} className="text-gray-400 hover:text-gray-900 transition-colors"><SkipForward size={20}/></button>
            </div>

            <div className="w-1/3 flex justify-end items-center gap-2">
                 <Volume2 size={16} className="text-gray-400" />
                 <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan-400 w-2/3"></div>
                 </div>
            </div>
        </div>
    );
};

const MusicView = () => {
    const { playlist, playTrack, currentTrack, isPlaying } = useApp();

    return (
        <div className="max-w-4xl mx-auto pt-8 pb-32 px-4 md:px-0 animate-in fade-in">
            <h2 className="text-2xl font-light mb-6 flex items-center gap-2">
                <Music className="text-cyan-500" /> Нейро-Радио
            </h2>

            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white mb-4">
                    <h3 className="text-xl font-bold">Избранные волны</h3>
                    <p className="text-xs text-gray-400">Частоты для синхронизации мозговых волн</p>
                </div>
                
                <div className="p-4 space-y-2">
                    {playlist.map((track, i) => (
                        <div 
                            key={track.id} 
                            onClick={() => playTrack(track)}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                                currentTrack?.id === track.id 
                                    ? "bg-cyan-50 border-cyan-200 shadow-sm" 
                                    : "hover:bg-white/50 hover:border-gray-100"
                            )}
                        >
                            <span className="text-xs text-gray-400 w-4 font-mono">{i + 1}</span>
                            <div className="relative w-12 h-12 shrink-0">
                                <img src={track.cover} className="w-full h-full rounded-lg object-cover" />
                                {currentTrack?.id === track.id && (
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
                                <p className={cn("font-bold text-sm truncate", currentTrack?.id === track.id ? "text-cyan-700" : "text-gray-900")}>
                                    {track.title}
                                </p>
                                <p className="text-xs text-gray-500">{track.artist}</p>
                            </div>

                            <span className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                {track.genre}
                            </span>
                        </div>
                    ))}
                    {playlist.length === 0 && <div className="text-center py-10 text-gray-400">Нет доступных сигналов...</div>}
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
  const [inputVal, setInputVal] = useState('');
  const [mode, setMode] = useState('login');
  const [regData, setRegData] = useState(null);

  const handleSubmit = async () => {
    if (!inputVal.trim()) return;

    if (mode === 'login') {
        const success = await login(inputVal);
        if (!success) setInputVal('');
    } else {
        const data = await register(inputVal);
        if (data) {
            setRegData(data);
            setInputVal('');
        }
    }
  };

  const handleRecovery = async () => {
      const guestName = `Guest-${Math.floor(Math.random() * 10000)}`;
      const data = await register(guestName);
      if (data) {
          await login(data.secret_code);
          alert("Вы вошли во временный аккаунт. Найдите Администратора 313 (@313) и напишите ему для восстановления доступа.");
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
                  <p className="text-sm text-gray-500 mb-6">Сохраните этот ключ доступа. Без него вход невозможен.</p>
                  
                  <div className="bg-gray-100 p-4 rounded-xl font-mono text-lg font-bold tracking-widest text-center border border-gray-200 select-all mb-6 break-all">
                      {regData.secret_code}
                  </div>
                  
                  <MinimalButton onClick={() => { setRegData(null); setMode('login'); setInputVal(regData.secret_code); }}>
                      Перейти ко входу
                  </MinimalButton>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center relative z-10 px-4">
      <div className="absolute top-1/4 animate-float">
        <ThreeDObject />
      </div>
      
      <div className="w-full max-w-md bg-white/20 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light tracking-tight text-gray-900 mb-2">NEURAL<span className="font-bold">NET</span></h1>
          <p className="text-xs uppercase tracking-widest text-gray-500">Private Protocol v2.0</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-2 uppercase">
                {mode === 'login' ? 'ACCESS CODE' : 'NODE NAME'}
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={mode === 'login' ? "NEURAL-XXXX-XXXX" : "Enter your name"}
                className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              <Lock size={14} className="absolute right-4 top-3.5 text-gray-400" />
            </div>
          </div>
          
          <MinimalButton onClick={handleSubmit} className="w-full mt-4">
            {mode === 'login' ? 'Initialize Session' : 'Register Node'}
          </MinimalButton>

          <div className="flex justify-between items-center mt-4 px-2">
             <button 
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setInputVal(''); }}
                className="text-[10px] text-cyan-600 hover:underline uppercase tracking-wider"
             >
                {mode === 'login' ? "Нет кода? Регистрация" : "Уже есть код? Войти"}
             </button>
             
             <button onClick={handleRecovery} className="text-[10px] text-red-500 hover:underline uppercase tracking-wider">
                 Забыли код?
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { setView, view, logout, user, friendRequests } = useApp();

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
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">N</div>
        <span className="font-bold tracking-tight text-lg">NEURAL</span>
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem icon={Home} label="Лента" id="feed" active={view === 'feed'} />
        <NavItem icon={User} label="Профиль" id="profile" active={view === 'profile'} />
        <NavItem icon={MessageSquare} label="Сообщения" id="messages" active={view === 'messages'} />
        <NavItem icon={Music} label="Музыка" id="music" active={view === 'music'} />
        <NavItem icon={Bell} label="Уведомления" id="notifications" active={view === 'notifications'} badge={friendRequests.length} />
        <NavItem icon={Settings} label="Настройки" id="settings" active={view === 'settings'} />
      </nav>

      <div className="mt-auto">
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

  return (
    <div className="h-[82vh] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500 pb-32 md:pb-0">
      <div className={cn(
          "w-full md:w-80 bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 overflow-hidden shadow-sm shrink-0 flex flex-col",
          activeChat ? "hidden md:flex" : "flex"
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

      <div className={cn(
          "flex-1 bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm overflow-hidden flex flex-col",
          !activeChat && "hidden md:flex" 
      )}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/40">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveChat(null)} className="md:hidden p-1 rounded-full hover:bg-gray-200">
                <ChevronLeft size={20} />
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex items-end gap-2 max-w-[85%]", msg.isOwn ? "ml-auto flex-row-reverse" : "mr-auto")}>
               <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => !msg.isOwn && goToProfile("@"+msg.senderName)}>
                   <img src={msg.senderAvatar || 'https://i.pravatar.cc/150'} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
               </div>
               <div className={cn("flex flex-col", msg.isOwn ? "items-end" : "items-start")}>
                    {!msg.isOwn && <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.senderName}</span>}
                    <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm border relative group",
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
              placeholder="Введите сообщение..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400"
            />
            <button type="submit" className="w-10 h-10 bg-cyan-400 text-white rounded-xl flex items-center justify-center hover:bg-cyan-500 shadow-lg">
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
    const [likedPosts, setLikedPosts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [statusData, setStatusData] = useState({ 
        isFriend: false, 
        isPendingSent: false, 
        isPendingReceived: false, 
        isAdmin: false, 
        isVerified: false,
        lastSeen: null
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
            setLikedPosts(d.likedPosts);
            
            setStatusData({
                isFriend: d.friendStatus === 'friends',
                isPendingSent: d.friendStatus === 'pending_sent',
                isPendingReceived: d.friendStatus === 'pending_received',
                isAdmin: d.isAdmin,
                isVerified: d.isVerified,
                lastSeen: d.lastSeen
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
            avatar: profileUser.avatar
        });
    }

    if(!profileUser) return <div>Loading Profile...</div>;

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-32 md:pb-0">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        <div className="col-span-1 md:col-span-4 space-y-6">
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm p-8 text-center relative overflow-hidden">
                
                <div className="absolute top-0 left-0 w-full h-40 opacity-50 pointer-events-none">
                    <ThreeDObject />
                </div>

                {!isEditing ? (
                    <>
                        <div className="relative inline-block mb-4 mt-6">
                            <img src={profileUser.avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover relative z-10" />
                            {statusData.isVerified && <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full text-cyan-500 z-10"><Shield size={16} fill="currentColor" /></div>}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2 relative z-10">
                            {profileUser.name}
                            {profileUser.name === '313' && <Crown size={18} className="text-yellow-500 fill-yellow-500" />}
                        </h2>
                        {profileUser.name === '313' && <span className="block text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-1 relative z-10">Основатель</span>}
                        
                        <p className="text-xs text-gray-500 font-mono mb-2 relative z-10">{profileUser.handle}</p>
                        
                        <div className="text-[10px] text-gray-400 mb-4 relative z-10">
                            {formatLastSeen(statusData.lastSeen)}
                        </div>
                        
                        <div className="inline-block px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium mb-4 relative z-10">
                            {profileUser.status || "В сети"}
                        </div>

                        <div className="flex items-center justify-center gap-1 mb-6 text-yellow-500 font-bold relative z-10">
                            <Star size={16} fill="currentColor" />
                            <span>Репутация: {profileUser.reputation || 0}</span>
                        </div>
                        
                        <p className="text-sm text-gray-700 italic mb-6 border-t border-b border-gray-100 py-2 relative z-10">{profileUser.bio}</p>
                    </>
                ) : (
                    <div className="space-y-3 mb-4 text-left relative z-10 mt-6">
                        <div>
                            <label className="text-xs text-gray-500">URL Аватарки</label>
                            <input value={editAvatar} onChange={e => setEditAvatar(e.target.value)} className="w-full text-xs p-2 border rounded" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Статус</label>
                            <input value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full text-xs p-2 border rounded" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">О себе</label>
                            <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full text-xs p-2 border rounded h-20" />
                        </div>
                    </div>
                )}

                {isOwn ? (
                    !isEditing ? (
                        <MinimalButton onClick={() => setIsEditing(true)} className="w-full text-xs relative z-10">
                            <Edit3 size={14} /> Редактировать
                        </MinimalButton>
                    ) : (
                        <div className="flex gap-2 relative z-10">
                            <MinimalButton onClick={handleSaveProfile} className="flex-1 text-xs bg-green-600 hover:bg-green-700">Сохранить</MinimalButton>
                            <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 underline">Отмена</button>
                        </div>
                    )
                ) : (
                    <div className="space-y-2 relative z-10">
                        {statusData.isFriend ? (
                            <div className="flex gap-2">
                                <div className="flex-1 py-2 bg-green-100 text-green-700 rounded-xl text-xs flex justify-center items-center gap-2">
                                    <UserCheck size={14} /> Вы друзья
                                </div>
                                <button onClick={handleRemoveFriend} className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200">
                                    <UserMinus size={16}/>
                                </button>
                            </div>
                        ) : statusData.isPendingSent ? (
                            <div className="w-full py-2 bg-yellow-100 text-yellow-700 rounded-xl text-xs text-center">
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
                            <MinimalButton onClick={handleFriendAction} className="w-full text-xs bg-cyan-500 hover:bg-cyan-600">
                                <UserPlus size={14} /> Добавить в друзья
                            </MinimalButton>
                        )}
                        
                        <MinimalButton onClick={handleWriteMessage} variant="outline" className="w-full text-xs">
                            <Send size={14} /> Написать
                        </MinimalButton>

                        {user?.isAdmin && (
                            <MinimalButton onClick={handleAdminVerify} className="w-full text-xs bg-purple-600 hover:bg-purple-700">
                                <Shield size={14} /> {statusData.isVerified ? "Снять галочку" : "Выдать галочку"}
                            </MinimalButton>
                        )}
                    </div>
                )}
            </div>

            <FriendsBlock friends={friends} onProfileClick={goToProfile} />
            <RecentLikesBlock posts={likedPosts} onProfileClick={goToProfile} />
        </div>

        <div className="col-span-1 md:col-span-8 space-y-6">
          <div className="flex justify-between items-center mb-4 px-2 md:px-0">
              <h2 className="text-xl font-light">Стена публикаций</h2>
              <span className="text-xs text-gray-400">Всего записей: {posts.length}</span>
          </div>

          {isOwn && <CreatePostWidget onPost={handleCreateWallPost} />}
          
          {posts.map(post => <PostCard key={post.id} post={post} />)}
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
    <div className="flex min-h-screen pt-[7.5vh] md:pl-72 pr-4 md:pr-8">
      <Sidebar />
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto pb-32 md:pb-24">
        {view === 'feed' && <FeedView />}
        {view === 'messages' && <MessagesView />}
        {view === 'notifications' && <NotificationsView />}
        {view === 'music' && <MusicView />}
        {view === 'profile' && <ProfileViewGeneric profileUser={user} isOwn={true} />}
        {view === 'user_profile' && <ProfileViewGeneric profileUser={viewedProfile} isOwn={false} />}
        {view === 'settings' && <SettingsView />}
      </main>
      
      {/* Глобальный плеер */}
      <MusicPlayer />
    </div>
  );
};

const MobileNav = () => {
    const { setView, view } = useApp();
    const icons = [
        { id: 'feed', icon: Home },
        { id: 'messages', icon: MessageSquare },
        { id: 'music', icon: Music },
        { id: 'profile', icon: User },
        { id: 'notifications', icon: Bell }
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-6 py-4 rounded-full shadow-2xl z-40 flex gap-6">
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
      <CableBackground />
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