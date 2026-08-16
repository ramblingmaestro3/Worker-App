"""Allow open job requests before worker assignment

Revision ID: 9b1c4f7a2d3e
Revises: e67dc15df1bb
Create Date: 2026-07-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '9b1c4f7a2d3e'
down_revision = 'e67dc15df1bb'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.alter_column(
            'worker_id',
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade():
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.alter_column(
            'worker_id',
            existing_type=sa.Integer(),
            nullable=False,
        )
