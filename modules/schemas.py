# modules/schemas.py

from pydantic import BaseModel

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True # Replaced orm_mode = True

class UserProfile(BaseModel):
    full_name: str | None = None
    class_name: str | None = None

class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    class_name: str | None = None

class Submission(BaseModel):
    id: int
    assignment_name: str
    student_name: str | None = None
    score: int | None = None
    max_score: int | None = None
    created_at: str | None = None
    remarks: str | None = None

    class Config:
        from_attributes = True

class ProfileResponse(BaseModel):
    email: str
    profile: UserProfile
    assignments: list[str]
    submissions: list[Submission]

class ClassCreate(BaseModel):
    name: str
    section: str | None = None

class ClassOut(BaseModel):
    id: int
    name: str
    section: str | None = None
    class Config:
        from_attributes = True

class StudentCreate(BaseModel):
    name: str
    email: str | None = None
    roll_number: str | None = None

class StudentOut(BaseModel):
    id: int
    name: str
    email: str | None = None
    roll_number: str | None = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class GenerationResponse(BaseModel):
    questions: str
    answers: str

class RefineRequest(BaseModel):
    previous_questions: str
    previous_answers: str
    feedback: str

class SaveRequest(BaseModel):
    assignment_name: str
    questions: str
    answers: str
    source_file_path: str | None = None
    reference_answers_path: str | None = None

class GradeResponse(BaseModel):
    legibility_report: str
    ocr_text: str
    evaluation: dict
    fairness_check: str

class GradeRequest(BaseModel):
    assignment_name: str
    class_id: int | None = None
    student_id: int | None = None