"""Add durable customer-worker conversations and message delivery metadata.

Revision ID: c3a4e9b2d1f0
Revises: 9b1c4f7a2d3e
Create Date: 2026-07-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3a4e9b2d1f0'
down_revision = '9b1c4f7a2d3e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('worker_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('last_message', sa.Text(), nullable=True),
        sa.Column('last_message_time', sa.DateTime(), nullable=True),
        sa.Column('unread_count_user', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('unread_count_worker', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', 'worker_id', name='uq_conversation_user_worker'),
    )
    op.create_index('ix_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('ix_conversations_worker_id', 'conversations', ['worker_id'])
    op.create_index('ix_conversation_latest_activity', 'conversations', ['last_message_time'])
    with op.batch_alter_table('messages') as batch:
        batch.add_column(sa.Column('conversation_id', sa.Integer(), nullable=True))
        batch.add_column(sa.Column('sender_type', sa.String(length=20), nullable=True))
        batch.add_column(sa.Column('receiver_type', sa.String(length=20), nullable=True))
        batch.add_column(sa.Column('status', sa.String(length=20), nullable=False, server_default='sent'))
        batch.create_foreign_key('fk_messages_conversation', 'conversations', ['conversation_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])
    op.create_index('ix_messages_status', 'messages', ['status'])


def downgrade():
    op.drop_index('ix_messages_status', table_name='messages')
    op.drop_index('ix_messages_conversation_id', table_name='messages')
    with op.batch_alter_table('messages') as batch:
        batch.drop_constraint('fk_messages_conversation', type_='foreignkey')
        batch.drop_column('status')
        batch.drop_column('receiver_type')
        batch.drop_column('sender_type')
        batch.drop_column('conversation_id')
    op.drop_table('conversations')
