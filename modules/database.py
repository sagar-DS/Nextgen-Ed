# modules/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base # Import the Base from our models file

# The database URL for a local SQLite file named 'test.db'
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Create the SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_db_and_tables():
    # This function will create the database tables based on our models
    Base.metadata.create_all(bind=engine)
    _apply_sqlite_migrations()

def _apply_sqlite_migrations():
    """Lightweight, idempotent schema migrations for SQLite in dev.
    Adds new columns to existing tables when they are missing.
    """
    try:
        with engine.connect() as conn:
            # Ensure new columns exist on 'submissions'
            existing_cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(submissions)")}
            cols_to_add = []
            if 'assignment_id' not in existing_cols:
                cols_to_add.append("ALTER TABLE submissions ADD COLUMN assignment_id INTEGER")
            if 'class_id' not in existing_cols:
                cols_to_add.append("ALTER TABLE submissions ADD COLUMN class_id INTEGER")
            if 'student_id' not in existing_cols:
                cols_to_add.append("ALTER TABLE submissions ADD COLUMN student_id INTEGER")
            if 'remarks' not in existing_cols:
                cols_to_add.append("ALTER TABLE submissions ADD COLUMN remarks TEXT")
            if 'student_sheet_path' not in existing_cols:
                cols_to_add.append("ALTER TABLE submissions ADD COLUMN student_sheet_path TEXT")
            for stmt in cols_to_add:
                conn.exec_driver_sql(stmt)
            # Ensure new columns exist on 'assignments'
            a_cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(assignments)")}
            a_add = []
            if 'source_file_path' not in a_cols:
                a_add.append("ALTER TABLE assignments ADD COLUMN source_file_path TEXT")
            if 'reference_answers_path' not in a_cols:
                a_add.append("ALTER TABLE assignments ADD COLUMN reference_answers_path TEXT")
            for stmt in a_add:
                conn.exec_driver_sql(stmt)
    except Exception as e:
        # Non-fatal; log to console
        print(f"SQLite migration warning: {e}")