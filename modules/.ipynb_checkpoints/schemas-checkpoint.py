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

class GradeResponse(BaseModel):
    legibility_report: str
    ocr_text: str
    evaluation: dict
    fairness_check: str