"""
Startup data seeding for WorkerApp.
"""

import logging

logger = logging.getLogger(__name__)


def ensure_default_service_categories(app):
    """
    Idempotently seed the services table with the same worker-category
    vocabulary the AI photo-analysis feature recommends from, so a worker's
    declared area of expertise and the AI's recommendations always agree.
    """
    from app.models import db, Service
    from app.services.ai_service import WORKER_CATEGORIES

    with app.app_context():
        try:
            if Service.query.count() > 0:
                return

            for name in WORKER_CATEGORIES:
                if name == 'Other':
                    continue
                slug = name.lower().replace(' ', '-')
                db.session.add(Service(name=name, slug=slug))

            db.session.commit()
            logger.info('Seeded default service categories')
        except Exception as exc:
            db.session.rollback()
            logger.warning('Skipped service category seeding: %s', exc)
