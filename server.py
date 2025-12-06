import threading
import time
import requests
import os
import random
import string
import uuid
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import func, or_, and_
from werkzeug.security import generate_password_hash, check_password_hash

# --- КОНФИГУРАЦИЯ ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

basedir = os.path.abspath(os.path.dirname(__file__))

# НАСТРОЙКА БАЗЫ ДАННЫХ ДЛЯ RENDER
# Render выдает URL базы данных в переменной окружения DATABASE_URL
# Он начинается с postgres://, но SQLAlchemy требует postgresql://
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///' + os.path.join(basedir, 'neural.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- МОДЕЛИ ---

friends_table = db.Table('friends',
    db.Column('user_id', db.String(36), db.ForeignKey('user.id'), primary_key=True),
    db.Column('friend_id', db.String(36), db.ForeignKey('user.id'), primary_key=True)
)

class FriendRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class PostLike(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), unique=True, nullable=False)
    handle = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=True)
    secret_code = db.Column(db.String(20), unique=True, nullable=False)
    avatar = db.Column(db.String(200), default="https://i.pravatar.cc/150?img=12")
    bio = db.Column(db.String(200), default="Neural node active.")
    status = db.Column(db.String(100), default="") 
    is_verified = db.Column(db.Boolean, default=False)
    is_admin = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    friends = db.relationship(
        'User', secondary=friends_table,
        primaryjoin=(friends_table.c.user_id == id),
        secondaryjoin=(friends_table.c.friend_id == id),
        backref=db.backref('friend_of', lazy='dynamic'),
        lazy='dynamic'
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_reputation(self):
        total = 0
        posts = Post.query.filter_by(user_id=self.id).all()
        for p in posts:
            total += p.likes_relations.count()
        return total

    def get_posts_count(self):
        return Post.query.filter_by(user_id=self.id).count()

    def to_dict(self, current_user=None):
        friend_status = 'none'
        if current_user and current_user.id != self.id:
            if current_user.friends.filter_by(id=self.id).first():
                friend_status = 'friends'
            elif FriendRequest.query.filter_by(sender_id=current_user.id, receiver_id=self.id).first():
                friend_status = 'pending_sent'
            elif FriendRequest.query.filter_by(sender_id=self.id, receiver_id=current_user.id).first():
                friend_status = 'pending_received'

        return {
            'id': self.id,
            'name': self.name,
            'handle': self.handle,
            'avatar': self.avatar,
            'bio': self.bio,
            'status': self.status,
            'reputation': self.get_reputation(),
            'postsCount': self.get_posts_count(),
            'isVerified': self.is_verified,
            'isAdmin': self.is_admin,
            'lastSeen': self.last_seen.isoformat() if self.last_seen else None,
            'friendStatus': friend_status,
            'friendsCount': self.friends.count()
        }

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    author = db.relationship('User', backref='posts')
    likes_relations = db.relationship('PostLike', backref='post', lazy='dynamic', cascade="all, delete-orphan")
    comments = db.relationship('Comment', backref='post', lazy=True, cascade="all, delete-orphan")

    def to_dict(self, current_user_id=None):
        is_liked = False
        if current_user_id:
            is_liked = self.likes_relations.filter_by(user_id=current_user_id).first() is not None

        return {
            'id': str(self.id),
            'author': self.author.to_dict(),
            'content': self.content,
            'imageUrl': self.image_url,
            'timestamp': self.timestamp.strftime("%H:%M • %d.%m"),
            'likes': self.likes_relations.count(),
            'isLiked': is_liked,
            'comments': [c.to_dict() for c in self.comments]
        }

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'author': self.user.name,
            'handle': self.user.handle,
            'avatar': self.user.avatar
        }

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True) 
    text = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    sender = db.relationship('User', foreign_keys=[sender_id])
    recipient = db.relationship('User', foreign_keys=[recipient_id])

    def to_dict(self, current_user_id):
        return {
            'id': str(self.id),
            'senderId': self.sender_id,
            'senderName': self.sender.name,
            'senderAvatar': self.sender.avatar,
            'text': self.text,
            'timestamp': self.timestamp.isoformat(),
            'isOwn': self.sender_id == current_user_id
        }

# --- МУЗЫКА И ИЗБРАННОЕ ---
class TrackLike(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'), nullable=False)

class Track(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    artist = db.Column(db.String(100), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    cover = db.Column(db.String(500), default="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop")
    genre = db.Column(db.String(50), default="User Added")
    added_by = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True)
    
    likes = db.relationship('TrackLike', backref='track', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self, current_user_id=None):
        is_liked = False
        if current_user_id:
            is_liked = self.likes.filter_by(user_id=current_user_id).first() is not None
        
        return {
            'id': self.id,
            'title': self.title,
            'artist': self.artist,
            'url': self.url,
            'cover': self.cover,
            'genre': self.genre,
            'isLiked': is_liked
        }

# --- MIDDLEWARE (LAST SEEN) ---
@app.before_request
def update_last_seen():
    token = request.headers.get('Authorization')
    if token:
        user = User.query.filter_by(secret_code=token).first()
        if user:
            user.last_seen = datetime.utcnow()
            db.session.commit()

# --- ФУНКЦИИ ---
def generate_invite_code():
    chars = string.ascii_uppercase + string.digits
    return f"NEURAL-{''.join(random.choice(chars) for _ in range(4))}-{''.join(random.choice(chars) for _ in range(4))}"

def find_user_by_handle(handle_str):
    if not handle_str: return None
    u = User.query.filter_by(handle=handle_str).first()
    if u: return u
    if not handle_str.startswith('@'):
        u = User.query.filter_by(handle='@' + handle_str).first()
    return u

def seed_music_db():
    if Track.query.first(): return
    # ПРОВЕРЕННЫЕ HTTPS ПОТОКИ
    stations = [
        {"title": "Lofi Hip Hop", "artist": "Lofi Girl", "url": "https://play.streamafrica.net/lofi", "genre": "Lofi"},
        {"title": "Ibiza Global", "artist": "Electronic", "url": "https://ibizaglobalradio.streaming-pro.com:8024/ibizaglobalradio.mp3", "genre": "House"},
        {"title": "Classical FM", "artist": "Orchestra", "url": "https://media-ice.musicradio.com/ClassicFMMP3", "genre": "Classic"},
        {"title": "Dance Hits", "artist": "Energy", "url": "https://stream.zeno.fm/f3wvbbqmdg8uv", "genre": "Dance"},
        {"title": "Jazz Lounge", "artist": "Relax", "url": "https://0n-jazz.radionetz.de/0n-jazz.mp3", "genre": "Jazz"}
    ]
    for s in stations:
        t = Track(title=s['title'], artist=s['artist'], url=s['url'], genre=s['genre'], cover=f"https://source.unsplash.com/random/300x300?{s['genre']}")
        db.session.add(t)
    db.session.commit()
    print("--- MUSIC DATABASE SEEDED ---")

# --- ENDPOINTS ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    password = data.get('password')
    
    if not name: return jsonify({'error': 'Name is required'}), 400
    
    if name.startswith("Guest-"):
        pass 
    elif User.query.filter_by(name=name).first():
        return jsonify({'error': 'Это имя уже занято.'}), 409
    
    base_handle = "@" + name.lower().replace(" ", "_")
    handle = base_handle
    counter = 1
    while User.query.filter_by(handle=handle).first():
        handle = f"{base_handle}{counter}"
        counter += 1
    
    secret_code = generate_invite_code()
    avatar_url = f"https://i.pravatar.cc/150?img={random.randint(1, 70)}"

    is_admin = False
    is_verified = False
    if name == "313":
        is_admin = True
        is_verified = True

    new_user = User(name=name, handle=handle, secret_code=secret_code, avatar=avatar_url, is_admin=is_admin, is_verified=is_verified)
    
    if password:
        new_user.set_password(password)
        
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'secret_code': secret_code, 'handle': handle})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    code = data.get('code')
    login_name = data.get('login')
    password = data.get('password')

    user = None

    if code:
        user = User.query.filter_by(secret_code=code).first()
    elif login_name and password:
        user = find_user_by_handle(login_name)
        if not user:
            user = User.query.filter_by(name=login_name).first()
        if user and not user.check_password(password):
            user = None

    if not user: 
        return jsonify({'error': 'Неверные учетные данные.'}), 401
    
    if user.name == "313":
        user.is_admin = True
        user.is_verified = True
        db.session.commit()

    return jsonify({'user': user.to_dict(), 'token': user.secret_code})

@app.route('/api/search', methods=['GET'])
def search_users():
    query = request.args.get('q', '').strip()
    if not query: return jsonify([])
    
    users = User.query.filter(
        or_(
            User.name.ilike(f'%{query}%'),
            User.handle.ilike(f'%{query}%')
        )
    ).limit(10).all()
    
    return jsonify([{'name': u.name, 'handle': u.handle, 'avatar': u.avatar} for u in users])

@app.route('/api/posts', methods=['GET', 'POST'])
def handle_posts():
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401

    if request.method == 'GET':
        posts = Post.query.order_by(Post.timestamp.desc()).all()
        return jsonify([p.to_dict(user.id) for p in posts])
    
    if request.method == 'POST':
        data = request.json
        new_post = Post(user_id=user.id, content=data['content'], image_url=data.get('imageUrl'))
        db.session.add(new_post)
        db.session.commit()
        return jsonify(new_post.to_dict(user.id))

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def toggle_like(post_id):
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    post = Post.query.get_or_404(post_id)
    
    existing = PostLike.query.filter_by(user_id=user.id, post_id=post_id).first()
    if existing:
        db.session.delete(existing)
        liked = False
    else:
        db.session.add(PostLike(user_id=user.id, post_id=post_id))
        liked = True
    db.session.commit()
    return jsonify({'likes': post.likes_relations.count(), 'isLiked': liked})

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def add_comment(post_id):
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    content = request.json.get('content')
    if not content: return jsonify({'error': 'Empty'}), 400
    new_comment = Comment(content=content, user_id=user.id, post_id=post_id)
    db.session.add(new_comment)
    db.session.commit()
    return jsonify(new_comment.to_dict())

@app.route('/api/me/update', methods=['POST'])
def update_profile():
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    if 'bio' in data: user.bio = data['bio']
    if 'avatar' in data: user.avatar = data['avatar']
    if 'status' in data: user.status = data['status']
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/admin/verify_toggle', methods=['POST'])
def verify_toggle():
    token = request.headers.get('Authorization')
    admin = User.query.filter_by(secret_code=token).first()
    if not admin or not admin.is_admin: return jsonify({'error': 'Forbidden'}), 403

    target_handle = request.json.get('handle')
    target_user = find_user_by_handle(target_handle)
    if not target_user: return jsonify({'error': 'User not found'}), 404

    target_user.is_verified = not target_user.is_verified
    db.session.commit()
    return jsonify({'isVerified': target_user.is_verified})

@app.route('/api/friends/request', methods=['POST'])
def send_request():
    token = request.headers.get('Authorization')
    sender = User.query.filter_by(secret_code=token).first()
    if not sender: return jsonify({'error': 'Unauthorized'}), 401
    
    target_handle = request.json.get('handle')
    receiver = find_user_by_handle(target_handle)
    
    if not receiver: return jsonify({'error': 'User not found'}), 404
    if sender.id == receiver.id: return jsonify({'error': 'Cannot add self'}), 400
    
    existing = FriendRequest.query.filter_by(sender_id=sender.id, receiver_id=receiver.id).first()
    if existing: return jsonify({'status': 'pending_sent'})

    if sender.friends.filter_by(id=receiver.id).first():
        return jsonify({'status': 'friends'})

    req = FriendRequest(sender_id=sender.id, receiver_id=receiver.id)
    db.session.add(req)
    db.session.commit()
    return jsonify({'status': 'pending_sent'})

@app.route('/api/friends/requests', methods=['GET'])
def get_requests():
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401

    requests = FriendRequest.query.filter_by(receiver_id=user.id).all()
    result = []
    for req in requests:
        sender = User.query.get(req.sender_id)
        result.append({
            'requestId': req.id,
            'senderName': sender.name,
            'senderHandle': sender.handle,
            'senderAvatar': sender.avatar
        })
    return jsonify(result)

@app.route('/api/friends/respond', methods=['POST'])
def respond_request():
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401

    req_id = request.json.get('requestId')
    action = request.json.get('action') 
    
    freq = FriendRequest.query.get(req_id)
    if not freq or freq.receiver_id != user.id:
        return jsonify({'error': 'Invalid request'}), 404

    if action == 'accept':
        sender = User.query.get(freq.sender_id)
        user.friends.append(sender)
        sender.friends.append(user)
        db.session.delete(freq)
    elif action == 'reject':
        db.session.delete(freq)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/friends/remove', methods=['POST'])
def remove_friend():
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401

    target_handle = request.json.get('handle')
    target_user = find_user_by_handle(target_handle)
    if not target_user: return jsonify({'error': 'Not found'}), 404

    if target_user in user.friends:
        user.friends.remove(target_user)
        target_user.friends.remove(user)
        db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/users/<string:handle>', methods=['GET'])
def get_user_profile(handle):
    token = request.headers.get('Authorization')
    current_user = User.query.filter_by(secret_code=token).first() if token else None
    
    target_user = find_user_by_handle(handle)
    if not target_user: return jsonify({'error': 'User not found'}), 404
    
    user_posts = Post.query.filter_by(user_id=target_user.id).order_by(Post.timestamp.desc()).all()
    liked_posts = db.session.query(Post).join(PostLike).filter(PostLike.user_id == target_user.id).order_by(PostLike.timestamp.desc()).limit(5).all()
    friends_list = [{'id': f.id, 'name': f.name, 'handle': f.handle, 'avatar': f.avatar} for f in target_user.friends]

    response = target_user.to_dict(current_user)
    response['posts'] = [p.to_dict(current_user.id if current_user else None) for p in user_posts]
    response['likedPosts'] = [p.to_dict(current_user.id if current_user else None) for p in liked_posts]
    response['friendsList'] = friends_list
    
    return jsonify(response)

@app.route('/api/messages', methods=['GET', 'POST', 'DELETE'])
def handle_messages():
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401

    if request.method == 'DELETE':
        msg_id = request.args.get('id')
        msg = Message.query.get(msg_id)
        if msg and msg.sender_id == user.id:
            db.session.delete(msg)
            db.session.commit()
            return jsonify({'success': True})
        return jsonify({'error': 'Forbidden'}), 403

    if request.method == 'GET':
        partner_id = request.args.get('partner_id')
        
        if partner_id:
            msgs = Message.query.filter(
                or_(
                    and_(Message.sender_id == user.id, Message.recipient_id == partner_id),
                    and_(Message.sender_id == partner_id, Message.recipient_id == user.id)
                )
            ).order_by(Message.timestamp).all()
        else:
            msgs = Message.query.filter(Message.recipient_id == None).order_by(Message.timestamp).limit(100).all()
            
        return jsonify([m.to_dict(user.id) for m in msgs])

    if request.method == 'POST':
        data = request.json
        if not data.get('text'): return jsonify({}), 400
        
        recipient_id = data.get('recipientId')
        
        msg = Message(sender_id=user.id, recipient_id=recipient_id, text=data['text'])
        db.session.add(msg)
        db.session.commit()
        return jsonify(msg.to_dict(user.id))

@app.route('/api/music', methods=['GET', 'POST'])
def handle_music():
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        tracks = Track.query.all()
        return jsonify([t.to_dict(user.id) for t in tracks])

    if request.method == 'POST':
        data = request.json
        if not data.get('url') or not data.get('title'):
             return jsonify({'error': 'Missing data'}), 400
        
        new_track = Track(
            title=data['title'],
            artist=data.get('artist', 'Unknown'),
            url=data['url'],
            genre=data.get('genre', 'User Added'),
            added_by=user.id
        )
        db.session.add(new_track)
        db.session.commit()
        return jsonify(new_track.to_dict(user.id))

@app.route('/api/music/<int:track_id>/like', methods=['POST'])
def like_track(track_id):
    token = request.headers.get('Authorization')
    user = User.query.filter_by(secret_code=token).first()
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    
    existing = TrackLike.query.filter_by(user_id=user.id, track_id=track_id).first()
    if existing:
        db.session.delete(existing)
        liked = False
    else:
        db.session.add(TrackLike(user_id=user.id, track_id=track_id))
        liked = True
    db.session.commit()
    return jsonify({'isLiked': liked})

# --- НОВЫЙ ENDPOINT ДЛЯ KEEP-ALIVE ---
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

# --- ФУНКЦИЯ SELF-PING (БОТ ДЛЯ АКТИВНОСТИ) ---
# Эта функция должна быть "прижата" к левому краю (без отступов)
def keep_alive_ping():
    """
    Фоновый процесс, который отправляет запрос на сервер каждые 14 минут.
    """
    base_url = os.environ.get('RENDER_EXTERNAL_URL') or "https://neural-upqo.onrender.com"
    ping_url = f"{base_url}/api/health"

    print(f"--- Keep-Alive Bot started targeting: {ping_url} ---")
    
    while True:
        time.sleep(840) # 14 минут
        try:
            response = requests.get(ping_url)
            print(f"Ping sent to keep alive: Status {response.status_code}")
        except Exception as e:
            print(f"Ping failed: {e}")

# --- ЗАПУСК СЕРВЕРА ---
# Этот блок тоже должен быть "прижат" к левому краю
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_music_db()
    
    # Запускаем бота
    threading.Thread(target=keep_alive_ping, daemon=True).start()

    print("--- NEURAL SERVER STARTED ON PORT 5000 ---")
    app.run(debug=True, port=5000)
