"""
Migration: add meal_type to meal_plan_entries
Run automatically at startup via main.py lifespan.
"""
import logging
from sqlalchemy import text
from .database import engine

logger = logging.getLogger(__name__)


def migrate():
    """Apply incremental schema migrations."""
    with engine.connect() as conn:
        _add_meal_type_column(conn)
        conn.commit()


def _add_meal_type_column(conn):
    """Add meal_type column and update unique constraint on meal_plan_entries."""
    # Check if meal_type column already exists
    result = conn.execute(text("PRAGMA table_info(meal_plan_entries)"))
    columns = [row[1] for row in result.fetchall()]

    if 'meal_type' in columns:
        logger.debug("meal_type column already exists — skipping migration")
        return

    logger.info("Migrating: adding meal_type column to meal_plan_entries")

    # Step 1: Add the new column with default 'dinner'
    conn.execute(text(
        "ALTER TABLE meal_plan_entries ADD COLUMN meal_type VARCHAR NOT NULL DEFAULT 'dinner'"
    ))

    # Step 2: SQLite can't drop/modify unique constraints via ALTER TABLE.
    # We need to recreate the table to change the unique constraint.
    # First, rename old table
    conn.execute(text("ALTER TABLE meal_plan_entries RENAME TO meal_plan_entries_old"))

    # Step 3: Create new table with composite unique constraint
    conn.execute(text("""
        CREATE TABLE meal_plan_entries (
            id INTEGER NOT NULL PRIMARY KEY,
            date DATE NOT NULL,
            meal_type VARCHAR NOT NULL DEFAULT 'dinner',
            meal_name VARCHAR NOT NULL,
            notes VARCHAR DEFAULT '',
            recipe_id INTEGER,
            created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
            updated_at DATETIME,
            UNIQUE (date, meal_type)
        )
    """))

    # Step 4: Copy data from old table
    conn.execute(text("""
        INSERT INTO meal_plan_entries (id, date, meal_type, meal_name, notes, recipe_id, created_at, updated_at)
        SELECT id, date, meal_type, meal_name, notes, recipe_id, created_at, updated_at
        FROM meal_plan_entries_old
    """))

    # Step 5: Drop old table
    conn.execute(text("DROP TABLE meal_plan_entries_old"))

    # Step 6: Recreate index on date
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meal_plan_entries_date ON meal_plan_entries (date)"))

    logger.info("Migration complete: meal_type column added, unique constraint updated to (date, meal_type)")
