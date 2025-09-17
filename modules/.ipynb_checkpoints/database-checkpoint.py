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