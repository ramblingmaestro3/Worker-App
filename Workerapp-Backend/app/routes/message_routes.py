"""Versioned messaging routes.  All handlers derive identity from JWT."""
from flask import Blueprint
from app.controllers import MessageController

message_bp = Blueprint('messages', __name__, url_prefix='/api')

# Required public contract
message_bp.add_url_rule('/conversations', view_func=MessageController.list_conversations, methods=['GET'])
message_bp.add_url_rule('/conversations/<int:conversation_id>/messages', view_func=MessageController.get_messages, methods=['GET'])
message_bp.add_url_rule('/conversations/<int:conversation_id>/read', view_func=MessageController.mark_conversation_as_read, methods=['PATCH'])
message_bp.add_url_rule('/messages', view_func=MessageController.send_message, methods=['POST'])
message_bp.add_url_rule('/messages/<int:message_id>/read', view_func=MessageController.mark_as_read, methods=['PATCH'])
message_bp.add_url_rule('/messages/<int:message_id>', view_func=MessageController.delete_message, methods=['DELETE'])

# Compatibility for clients using the prior URL for conversation listing.
message_bp.add_url_rule('/messages/conversations', view_func=MessageController.list_conversations, methods=['GET'])
