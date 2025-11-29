import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import { 
  User, 
  MessageSquare, 
  Home, 
  Settings, 
  Shield, 
  Send, 
  MoreHorizontal, 
  Heart, 
  Share2, 
  Activity,
  LogOut,
  Globe,
  Lock
} from 'lucide-react';

/**
 * --- TYPES & INTERFACES ---
 */

interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  isVerified: boolean;
}

interface Post {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

type View = 'login' | 'feed' | 'profile' | 'messages' | 'settings';

/**
 * --- MOCK DATA ---
 */
const CURRENT_USER: User = {
  id: 'u1',
  name: 'Alexei Void',
  handle: '@avoid',
  avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  isVerified: true
};

const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    author: { id: 'u2', name: 'Elena Flux', handle: '@flux_state', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', isVerified: true },
    content: 'Синтез реальности и цифры завершен. Мы наблюдаем новые паттерны в сети. #arthouse #digital',
    timestamp: '20 мин назад',
    likes: 42,
    comments: 5
  },
  {
    id: 'p2',
    author: { id: 'u3', name: 'System Node', handle: '@root_access', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', isVerified: false },
    content: 'Обновление протоколов безопасности. Пожалуйста, проверьте ваши ключи шифрования.',
    timestamp: '1 час назад',
    likes: 128,
    comments: 12
  }
];

const MOCK_CHATS = [
  { id: 'c1', user: 'Elena Flux', lastMsg: 'Ты видел новый протокол?', unread: 2 },
  { id: 'c2', user: 'Design DAO', lastMsg: 'Встреча перенесена на 19:00', unread: 0 },
];

/**
 * --- UTILS ---
 */
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

/**
 * --- CONTEXT / STATE MANAGEMENT ---
 */
const AppContext = createContext<{
  view: View;
  setView: (v: View) => void;
  user: User | null;
  login: () => void;
  logout: () => void;
  messages: Message[];
  sendMessage: (text: string) => void;
} | null>(null);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', senderId: 'u2', text: 'Привет, доступ к узлу получен?', timestamp: new Date(Date.now() - 100000), isOwn: false }
  ]);

  const login = () => {
    // Simulate API Call
    setTimeout(() => {
      setUser(CURRENT_USER);
      setView('feed');
    }, 800);
  };

  const logout = () => {
    setUser(null);
    setView('login');
  };

  const sendMessage = (text: string) => {
    const newMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: CURRENT_USER.id,
      text,
      timestamp: new Date(),
      isOwn: true
    };
    setMessages(prev => [...prev, newMsg]);
    
    // Simulate WebSocket reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        senderId: 'system',
        text: 'Сообщение зашифровано и доставлено.',
        timestamp: new Date(),
        isOwn: false
      }]);
    }, 1500);
  };

  return (
    <AppContext.Provider value={{ view, setView, user, login, logout, messages, sendMessage }}>
      {children}
    </AppContext.Provider>
  );
};

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

/**
 * --- VISUAL COMPONENTS (Canvas & 3D) ---
 */

// 1. Canvas Background: Moving Cables & Glowing Nodes
const CableBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Node configuration
    const nodes: { x: number; y: number; connection: number[] }[] = [];
    const nodeCount = 6;
    const cableY = height * 0.85; // Base line for cables

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (width / (nodeCount + 1)) * (i + 1),
        y: cableY + (Math.random() * 50 - 25),
        connection: [i - 1, i + 1] // Connect to neighbors
      });
    }

    let time = 0;

    const animate = () => {
      ctx.fillStyle = '#f3f4f6'; // Light gray background
      ctx.fillRect(0, 0, width, height);

      time += 0.005;

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Cables
      nodes.forEach((node, i) => {
        // Floating effect for nodes
        const floatY = node.y + Math.sin(time * 2 + i) * 10;

        // Draw connections (Cables)
        if (i < nodes.length - 1) {
          const nextNode = nodes[i + 1];
          const nextFloatY = nextNode.y + Math.sin(time * 2 + (i + 1)) * 10;
          
          ctx.beginPath();
          ctx.moveTo(node.x, floatY);
          
          // Bezier curve for "slack" cable look
          const cx = (node.x + nextNode.x) / 2;
          const cy = Math.max(floatY, nextFloatY) + 50 + Math.sin(time + i) * 20; // Drooping cable

          ctx.quadraticCurveTo(cx, cy, nextNode.x, nextFloatY);
          
          // Gradient for cable
          const gradient = ctx.createLinearGradient(node.x, floatY, nextNode.x, nextFloatY);
          gradient.addColorStop(0, 'rgba(100, 100, 100, 0.1)');
          gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
          gradient.addColorStop(1, 'rgba(100, 100, 100, 0.1)');
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Data packets (Light pulses)
          const packetPos = (time * (1 + i * 0.2)) % 1;
          // Simple lerp approximation for packet on curve (imperfect but fast)
          const px = (1 - packetPos) * (1 - packetPos) * node.x + 2 * (1 - packetPos) * packetPos * cx + packetPos * packetPos * nextNode.x;
          const py = (1 - packetPos) * (1 - packetPos) * floatY + 2 * (1 - packetPos) * packetPos * cy + packetPos * packetPos * nextFloatY;

          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#06b6d4'; // Cyan glow
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#06b6d4';
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Draw Node (The Glowing End)
        ctx.beginPath();
        ctx.arc(node.x, floatY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#111827';
        ctx.fill();
        
        // Inner light
        ctx.beginPath();
        ctx.arc(node.x, floatY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee'; // Cyan
        ctx.fill();

        // Glow ring
        ctx.beginPath();
        ctx.arc(node.x, floatY, 8 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
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

// 2. 3D Object: Minimalist rotating wireframe (Projection engine)
const ThreeDObject = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    
    // Define edges for a cube (indices of vertices)
    const edges = [
      [0,1], [1,2], [2,3], [3,0], // back face
      [4,5], [5,6], [6,7], [7,4], // front face
      [0,4], [1,5], [2,6], [3,7]  // connecting lines
    ];

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

        // Rotation X
        let dy = y * Math.cos(angleX) - z * Math.sin(angleX);
        let dz = y * Math.sin(angleX) + z * Math.cos(angleX);
        y = dy; z = dz;

        // Rotation Y
        let dx = x * Math.cos(angleY) - z * Math.sin(angleY);
        dz = x * Math.sin(angleY) + z * Math.cos(angleY);
        x = dx; z = dz;

        // Projection
        const fov = 300;
        const scale = fov / (fov + z * 100);
        return {
          x: cx + x * 60 * scale, // 60 is size
          y: cy + y * 60 * scale
        };
      });

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;

      edges.forEach(edge => {
        const v1 = projectedVertices[edge[0]];
        const v2 = projectedVertices[edge[1]];
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.stroke();
      });

      // Draw "Nodes" on vertices
      projectedVertices.forEach(v => {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return <canvas ref={canvasRef} width={200} height={200} className={cn("opacity-80", className)} />;
};

/**
 * --- UI COMPONENTS ---
 */

const MinimalButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }> = ({ children, variant = 'primary', className, ...props }) => {
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

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white/60 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md", className)}>
    {children}
  </div>
);

const VerifiedBadge = () => (
  <span className="inline-flex ml-1 text-cyan-500" title="Verified Node">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </span>
);

const PostCard: React.FC<{ post: Post }> = ({ post }) => (
  <div className="mb-6 group">
    <div className="relative bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-gray-100 transition-all duration-300 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5">
      {/* Decorative connecting line */}
      <div className="absolute -left-3 top-8 w-3 h-[1px] bg-cyan-200 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start gap-4">
        <div className="relative">
          <img src={post.author.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-white"></div>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center">
              {post.author.name}
              {post.author.isVerified && <VerifiedBadge />}
            </h3>
            <span className="text-xs text-gray-400 font-mono">{post.timestamp}</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{post.author.handle}</p>
          <p className="text-gray-700 leading-relaxed mb-4 font-light text-sm md:text-base">
            {post.content}
          </p>
          
          <div className="flex items-center gap-6 pt-2 border-t border-gray-100/50">
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors">
              <Heart size={14} /> {post.likes}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-600 transition-colors">
              <MessageSquare size={14} /> {post.comments}
            </button>
            <button className="ml-auto text-gray-400 hover:text-gray-900">
              <Share2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * --- VIEWS ---
 */

const LoginView = () => {
  const { login } = useApp();
  const [inviteCode, setInviteCode] = useState('ARTH-8X29-NODE');

  return (
    <div className="h-screen flex flex-col items-center justify-center relative z-10 px-4">
      <div className="absolute top-1/4 animate-float">
        <ThreeDObject />
      </div>
      
      <div className="w-full max-w-md bg-white/20 backdrop-blur-xl border border-white/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light tracking-tight text-gray-900 mb-2">NEURAL<span className="font-bold">NET</span></h1>
          <p className="text-xs uppercase tracking-widest text-gray-500">Private Protocol v2.0</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-2 uppercase">Invite Code</label>
            <div className="relative">
              <input 
                type="text" 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
              />
              <Lock size={14} className="absolute right-4 top-3.5 text-gray-400" />
            </div>
          </div>
          
          <MinimalButton onClick={login} className="w-full mt-4">
            Initialize Session
          </MinimalButton>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-400">
            SECURE HANDSHAKE REQUIRED. <br/>
            UNAUTHORIZED ACCESS IS MONITORED.
          </p>
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { setView, view, logout, user } = useApp();

  const NavItem = ({ icon: Icon, label, id, active }: any) => (
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
        <NavItem icon={Globe} label="Сеть" id="friends" active={view === 'friends'} />
        <div className="h-px bg-gray-200 my-4 mx-2"></div>
        <NavItem icon={Settings} label="Настройки" id="settings" active={view === 'settings'} />
      </nav>

      <div className="mt-auto">
        <div className="flex items-center gap-3 p-3 bg-white/40 rounded-xl mb-4 border border-white">
          <img src={user?.avatar} alt="me" className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.handle}</p>
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
  return (
    <div className="max-w-2xl mx-auto pt-8 pb-24 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-light text-gray-900">Поток данных</h2>
          <p className="text-xs text-gray-400 mt-1">Синхронизация узлов...</p>
        </div>
        <MinimalButton className="text-xs px-4 py-2">
          + Новый сигнал
        </MinimalButton>
      </header>
      
      <div className="space-y-4">
        {MOCK_POSTS.map(post => <PostCard key={post.id} post={post} />)}
        
        {/* Loading State Simulation */}
        <div className="h-32 rounded-xl bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessagesView = () => {
  const { messages, sendMessage } = useApp();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-[85vh] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      {/* Contact List */}
      <div className="w-full md:w-80 flex flex-col bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 overflow-hidden shadow-sm shrink-0">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Диалоги</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_CHATS.map(chat => (
            <div key={chat.id} className="p-4 hover:bg-white/50 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm text-gray-900">{chat.user}</span>
                {chat.unread > 0 && <span className="bg-cyan-400 text-white text-[10px] px-1.5 py-0.5 rounded-full">{chat.unread}</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">{chat.lastMsg}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-bold text-gray-800">Elena Flux</span>
          </div>
          <MoreHorizontal size={18} className="text-gray-400 cursor-pointer" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col max-w-[70%]", msg.isOwn ? "ml-auto items-end" : "mr-auto items-start")}>
               <div className={cn(
                 "px-4 py-2.5 rounded-2xl text-sm shadow-sm border",
                 msg.isOwn 
                  ? "bg-gray-900 text-white border-gray-900 rounded-br-none" 
                  : "bg-white text-gray-800 border-gray-200 rounded-bl-none"
               )}>
                 {msg.text}
               </div>
               <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white/40 border-t border-gray-100">
          <form 
            onSubmit={(e) => { e.preventDefault(); if(input.trim()) { sendMessage(input); setInput(''); } }}
            className="flex gap-3"
          >
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Введите сообщение..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <button 
              type="submit"
              className="w-10 h-10 bg-cyan-400 text-white rounded-xl flex items-center justify-center hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-400/30"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ProfileView = () => {
  const { user } = useApp();
  if(!user) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="col-span-1">
          <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-white/40 shadow-sm p-8 text-center relative overflow-hidden">
             {/* 3D Object embedded in profile */}
             <div className="absolute -top-10 -right-10 opacity-30 pointer-events-none">
               <ThreeDObject className="w-40 h-40" />
             </div>

             <div className="relative inline-block mb-4">
               <img src={user.avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-md" />
               {user.isVerified && <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full text-cyan-500"><Shield size={16} fill="currentColor" /></div>}
             </div>
             
             <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
             <p className="text-sm text-gray-500 font-mono mb-6">{user.handle}</p>
             
             <div className="flex justify-center gap-6 mb-8 text-sm">
               <div className="text-center">
                 <span className="block font-bold text-gray-900">42</span>
                 <span className="text-gray-400 text-xs">Nodes</span>
               </div>
               <div className="text-center">
                 <span className="block font-bold text-gray-900">1.2k</span>
                 <span className="text-gray-400 text-xs">Signals</span>
               </div>
             </div>

             <div className="space-y-3">
               <MinimalButton className="w-full text-xs">Редактировать</MinimalButton>
               <MinimalButton variant="outline" className="w-full text-xs">Настройки приватности</MinimalButton>
             </div>
          </div>
          
          <div className="mt-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl p-6 text-white shadow-lg shadow-cyan-500/20 relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-bold mb-1">PRO Status Active</h3>
               <p className="text-xs text-white/80 mb-4">Полный доступ к нейро-узлам открыт.</p>
               <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                 <div className="h-full w-3/4 bg-white"></div>
               </div>
             </div>
             <Activity className="absolute bottom-4 right-4 text-white/20 w-24 h-24 -rotate-12" />
          </div>
        </div>

        {/* Content Area */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="flex gap-4 mb-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Медиа', 'Текст', 'Ссылки', 'Архив'].map((tab, i) => (
               <button key={tab} className={cn("px-4 py-1.5 rounded-full text-xs transition-colors", i === 0 ? "bg-gray-900 text-white" : "bg-white/40 text-gray-600 hover:bg-white")}>
                 {tab}
               </button>
            ))}
          </div>
          
          {MOCK_POSTS.map(post => <PostCard key={post.id} post={{...post, author: user}} />)}
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
      
      <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl">
        <div>
          <p className="font-medium text-gray-900">Уведомления</p>
          <p className="text-xs text-gray-500">Прямое подключение к нейроинтерфейсу</p>
        </div>
        <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer">
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
         <h3 className="text-sm font-bold text-gray-900 mb-4">Безопасность</h3>
         <button className="text-red-500 text-sm hover:underline">Сбросить ключи шифрования</button>
      </div>
    </div>
  </div>
);

/**
 * --- MAIN LAYOUT ---
 */

const MainLayout = () => {
  const { view } = useApp();

  return (
    <div className="flex min-h-screen pt-[7.5vh] md:pl-72 pr-4 md:pr-8">
      <Sidebar />
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto">
        {view === 'feed' && <FeedView />}
        {view === 'messages' && <MessagesView />}
        {view === 'profile' && <ProfileView />}
        {view === 'settings' && <SettingsView />}
        {view === 'friends' && <div className="text-center mt-20 text-gray-400">Поиск активных узлов...</div>}
      </main>
    </div>
  );
};

const MobileNav = () => {
    const { setView, view } = useApp();
    const icons = [
        { id: 'feed', icon: Home },
        { id: 'friends', icon: Globe },
        { id: 'messages', icon: MessageSquare },
        { id: 'profile', icon: User },
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl z-50 flex gap-8">
            {icons.map((item) => (
                <button 
                    key={item.id} 
                    onClick={() => setView(item.id as View)}
                    className={cn("transition-colors", view === item.id ? "text-cyan-400" : "text-gray-400")}
                >
                    <item.icon size={20} />
                </button>
            ))}
        </div>
    );
}

/**
 * --- APP ENTRY POINT ---
 */

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