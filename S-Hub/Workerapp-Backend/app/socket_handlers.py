"""Socket.IO transport for real-time messaging and account presence."""
from collections import defaultdict
from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import SocketIO, disconnect, emit, join_room
from app.models import db, User
from app.services import MessageService

# eventlet/gevent can be selected in deployment; threading keeps local Flask development simple.
socketio = SocketIO(cors_allowed_origins='*', async_mode='threading', ping_interval=25, ping_timeout=60)
_connections = defaultdict(set)
_socket_users = {}


def _user_from_socket(auth):
    cached_id = _socket_users.get(request.sid)
    if cached_id:
        return db.session.get(User, cached_id)
    token = (auth or {}).get('token') or request.args.get('token')
    if not token:
        return None
    try:
        claims = decode_token(token)
        return db.session.get(User, claims['sub'])
    except Exception:
        return None


def _room(user_id):
    return f'user:{user_id}'


def emit_new_message(message):
    """Emit only after commit so receivers never receive a message that later rolls back."""
    payload = message.to_dict()
    socketio.emit('message:new', payload, room=_room(message.receiver_id))
    socketio.emit('conversation:updated', message.conversation.to_dict(message.receiver_id), room=_room(message.receiver_id))
    socketio.emit('conversation:updated', message.conversation.to_dict(message.sender_id), room=_room(message.sender_id))


def emit_read_receipt(message):
    socketio.emit('message:read', {'messageId': message.id, 'conversationId': message.conversation_id, 'readAt': message.read_at.isoformat() if message.read_at else None}, room=_room(message.sender_id))


@socketio.on('connect')
def connect(auth):
    user = _user_from_socket(auth)
    if not user or not user.is_active:
        return False
    _connections[user.id].add(request.sid)
    _socket_users[request.sid] = user.id
    join_room(_room(user.id))
    delivered = MessageService.mark_delivered_for_user(user.id)
    for message in delivered:
        socketio.emit('message:delivered', {'messageId': message.id, 'conversationId': message.conversation_id, 'deliveredAt': message.delivered_at.isoformat()}, room=_room(message.sender_id))
    socketio.emit('presence:online', {'userId': user.id}, broadcast=True)


@socketio.on('disconnect')
def disconnect_handler():
    user = _user_from_socket(None)
    if not user:
        return
    _connections[user.id].discard(request.sid)
    _socket_users.pop(request.sid, None)
    if not _connections[user.id]:
        _connections.pop(user.id, None)
        socketio.emit('presence:offline', {'userId': user.id}, broadcast=True)


@socketio.on('message:send')
def send_message(payload):
    user = _user_from_socket(None)
    if not user:
        disconnect()
        return
    payload = payload or {}
    message, error = MessageService.send_message(
        sender_id=user.id, receiver_id=payload.get('receiverId'), conversation_id=payload.get('conversationId'),
        content=payload.get('message'), message_type=payload.get('messageType', 'text'))
    if error:
        emit('message:error', {'error': error})
        return
    emit_new_message(message)
    emit('message:sent', message.to_dict())


@socketio.on('typing:start')
def typing_start(payload):
    user = _user_from_socket(None)
    conversation_id = (payload or {}).get('conversationId')
    result, error = MessageService.get_messages(user.id, conversation_id, 1, 1) if user else (None, 'unauthorized')
    if error:
        return
    conversation = result['conversation']
    recipient_id = conversation['workerId'] if conversation['userId'] == user.id else conversation['userId']
    socketio.emit('typing:start', {'conversationId': conversation_id, 'userId': user.id}, room=_room(recipient_id))


@socketio.on('typing:stop')
def typing_stop(payload):
    user = _user_from_socket(None)
    conversation_id = (payload or {}).get('conversationId')
    result, error = MessageService.get_messages(user.id, conversation_id, 1, 1) if user else (None, 'unauthorized')
    if error:
        return
    conversation = result['conversation']
    recipient_id = conversation['workerId'] if conversation['userId'] == user.id else conversation['userId']
    socketio.emit('typing:stop', {'conversationId': conversation_id, 'userId': user.id}, room=_room(recipient_id))


@socketio.on('message:read')
def read_message(payload):
    user = _user_from_socket(None)
    if not user:
        return
    message, error = MessageService.mark_message_as_read((payload or {}).get('messageId'), user.id)
    if not error:
        emit_read_receipt(message)
