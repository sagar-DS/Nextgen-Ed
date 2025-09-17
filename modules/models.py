# modules/models.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    assignments = relationship("Assignment", back_populates="owner")
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    submissions = relationship("Submission", back_populates="user")
    classes = relationship("ClassRoom", back_populates="teacher")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    questions = Column(Text, nullable=False)
    answers = Column(Text, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    source_file_path = Column(String, nullable=True)
    reference_answers_path = Column(String, nullable=True)

    owner = relationship("User", back_populates="assignments")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    full_name = Column(String, nullable=True)
    class_name = Column(String, nullable=True)

    user = relationship("User", back_populates="profile")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    assignment_name = Column(String, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student_name = Column(String, nullable=True)
    score = Column(Integer, nullable=True)
    max_score = Column(Integer, nullable=True)
    created_at = Column(String, nullable=True)
    remarks = Column(Text, nullable=True)
    student_sheet_path = Column(String, nullable=True)

    user = relationship("User", back_populates="submissions")
    
class ClassRoom(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    section = Column(String, nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), index=True)

    teacher = relationship("User", back_populates="classes")
    students = relationship("Student", back_populates="class_room")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    roll_number = Column(String, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), index=True)

    class_room = relationship("ClassRoom", back_populates="students")