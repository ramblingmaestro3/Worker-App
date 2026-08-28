"""Add image URLs to job requests.

Revision ID: f4d8e2c1a6b9
Revises: c3a4e9b2d1f0
Create Date: 2026-07-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'f4d8e2c1a6b9'
down_revision = 'c3a4e9b2d1f0'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_urls', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.drop_column('image_urls')
