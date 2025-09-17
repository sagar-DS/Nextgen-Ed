# modules/crud.py

from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext

# Setup for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    # Ensure an empty profile row exists
    if not db_user.profile:
        profile = models.UserProfile(user_id=db_user.id, full_name=None, class_name=None)
        db.add(profile)
        db.commit()
    return db_user

def create_user_assignment(db: Session, assignment: schemas.SaveRequest, user_id: int):
    db_assignment = models.Assignment(
        name=assignment.assignment_name,
        questions=assignment.questions,
        answers=assignment.answers,
        owner_id=user_id,
        source_file_path=getattr(assignment, 'source_file_path', None),
        reference_answers_path=getattr(assignment, 'reference_answers_path', None),
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

def get_user_profile(db: Session, user_id: int):
    return db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()

def upsert_user_profile(db: Session, user_id: int, update: schemas.UserProfileUpdate):
    profile = get_user_profile(db, user_id)
    if not profile:
        profile = models.UserProfile(user_id=user_id)
        db.add(profile)
    if update.full_name is not None:
        profile.full_name = update.full_name
    if update.class_name is not None:
        profile.class_name = update.class_name
    db.commit()
    db.refresh(profile)
    return profile

def list_user_assignments(db: Session, user_id: int):
    return db.query(models.Assignment).filter(models.Assignment.owner_id == user_id).all()

def get_assignment_by_name_for_user(db: Session, user_id: int, name: str):
    return (
        db.query(models.Assignment)
        .filter(models.Assignment.owner_id == user_id, models.Assignment.name == name)
        .first()
    )

def create_submission(db: Session, *, user_id: int, assignment_name: str, student_name: str | None, score: int | None, max_score: int | None, created_at: str | None, assignment_id: int | None = None, class_id: int | None = None, student_id: int | None = None, student_sheet_path: str | None = None, remarks: str | None = None):
    sub = models.Submission(
        user_id=user_id,
        assignment_name=assignment_name,
        assignment_id=assignment_id,
        class_id=class_id,
        student_id=student_id,
        student_name=student_name,
        score=score,
        max_score=max_score,
        created_at=created_at,
        student_sheet_path=student_sheet_path,
        remarks=remarks,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

def list_user_submissions(db: Session, user_id: int):
    return db.query(models.Submission).filter(models.Submission.user_id == user_id).all()

# --- Classes & Students ---
def create_class(db: Session, *, user_id: int, name: str, section: str | None):
    cls = models.ClassRoom(name=name, section=section, teacher_id=user_id)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls

def list_classes(db: Session, user_id: int):
    return db.query(models.ClassRoom).filter(models.ClassRoom.teacher_id == user_id).all()

def add_students_bulk(db: Session, class_id: int, students: list[schemas.StudentCreate]):
    instances = []
    for s in students:
        inst = models.Student(name=s.name, email=s.email, roll_number=s.roll_number, class_id=class_id)
        db.add(inst)
        instances.append(inst)
    db.commit()
    for inst in instances:
        db.refresh(inst)
    return instances

def list_students(db: Session, class_id: int):
    return db.query(models.Student).filter(models.Student.class_id == class_id).all()