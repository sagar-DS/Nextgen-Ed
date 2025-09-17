# app.py (Final, Complete, and Corrected Version)

from sqlalchemy.orm import Session
from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from modules import crud, schemas, database
import os
import json
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from modules import security
from modules import crud, schemas, database, security
from modules.document_parser import DocumentParser
from modules.ai_core import AICore
from modules import database
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

# --- A single class to manage the application's state and logic ---
class AppState:
   # In app.py, replace the __init__ function inside the AppState class

    def __init__(self):
        self.doc_parser = DocumentParser()
        self.ai_core = None
        self.db_file = "questions.json"
    
        # This part is NEW: It reads the key from the server environment
        api_key = os.getenv("GEMINI_API_KEY")
    
        try:
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable not found.")
            self.ai_core = AICore(api_key=api_key)
        except (FileNotFoundError, ValueError) as e:
            print(f"CRITICAL ERROR: {e}. The AI Core could not be initialized.")
    
        self.question_bank = self._load_question_bank()

    def _load_question_bank(self):
        try:
            with open(self.db_file, 'r') as f:
                # If file is empty, this will raise an error and jump to the 'except' block
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            print("INFO: 'questions.json' not found or is empty. Creating a new one with sample data.")
            db = {"Sample: Water Cycle": {"questions": "1. What is the water cycle?", "answers": "The water cycle is the continuous movement of water on Earth."}}
            self._save_question_bank(db)
            return db

    def _save_question_bank(self, db_instance):
        with open(self.db_file, 'w') as f:
            json.dump(db_instance, f, indent=4)

# --- Create a single global instance of our app state ---
state = AppState()

# --- FastAPI Application ---
app = FastAPI(title="Nextgen Ed API")
database.create_db_and_tables() # <-- ADD THIS LINE

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"🔍 Request: {request.method} {request.url}")
    print(f"🔍 Headers: {dict(request.headers)}")
    response = await call_next(request)
    print(f"🔍 Response: {response.status_code}")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000", 
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",  # Live Server default port
        "http://localhost:5500",
        "https://nextgen-ed.netlify.app",  # Your actual Netlify URL
        "*"  # Fallback for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = security.SECRET_KEY
ALGORITHM = security.ALGORITHM

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

from jose import JWTError, jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user
        
# --- Helper Function ---
def parse_any_file(file_path: str) -> str:
    file_type = file_path.split('.')[-1].lower()
    if file_type in ['pdf', 'pptx']:
        return state.doc_parser.parse(file_path, file_type)
    elif file_type in ['png', 'jpg', 'jpeg', 'webp']:
        img = Image.open(file_path)
        return state.ai_core.extract_text_from_image(img)
    else:
        return f"Error: Unsupported file type '.{file_type}'."

# --- API Endpoints ---
@app.get("/", tags=["Status"])
def read_root():
    return {"status": "Nextgen Ed API is running!"}

@app.get("/cors-test", tags=["Debug"])
async def cors_test():
    return {"message": "CORS is working!", "timestamp": datetime.now().isoformat()}

@app.options("/{path:path}", tags=["CORS"])
async def options_handler(path: str):
    """Handle preflight OPTIONS requests for CORS"""
    return {"message": "OK"}

@app.post("/users/", response_model=schemas.User, tags=["Users"])
def create_user_endpoint(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

# In app.py, add this new endpoint

from modules import security # Make sure to import the new security module

@app.post("/token", response_model=schemas.Token, tags=["Users"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/verify-password", tags=["Users"]) 
async def verify_password_endpoint(password: str = Form(...), db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    user = crud.get_user_by_email(db, email=current_user.email)
    if not user or not security.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"status": "ok"}
    
@app.post("/generate-assignment", response_model=schemas.GenerationResponse, tags=["Teacher Workbench"])
async def generate_assignment_endpoint(source_file: UploadFile = File(...)):
    if not state.ai_core: raise HTTPException(status_code=500, detail="AI Core not initialized.")
    temp_file_path = f"temp_{source_file.filename}"
    with open(temp_file_path, "wb") as buffer: buffer.write(await source_file.read())
    context = parse_any_file(temp_file_path)
    os.remove(temp_file_path)
    if "Error" in context: raise HTTPException(status_code=400, detail=context)
    assignment_json = state.ai_core.generate_assignment(context)
    if not assignment_json: raise HTTPException(status_code=500, detail="AI failed to generate content.")
    return schemas.GenerationResponse(questions=assignment_json.get("questions", ""), answers=assignment_json.get("answers", ""))

@app.post("/refine-content", response_model=schemas.GenerationResponse, tags=["Teacher Workbench"])
async def refine_content_endpoint(request: schemas.RefineRequest):
    if not state.ai_core: raise HTTPException(status_code=500, detail="AI Core not initialized.")
    refined_questions = state.ai_core.refine_content(request.previous_questions, f"Refine the questions: {request.feedback}")
    refined_answers = state.ai_core.refine_content(request.previous_answers, f"Refine the answers: {request.feedback}")
    return schemas.GenerationResponse(questions=refined_questions, answers=refined_answers)

@app.post("/save-assignment", tags=["Teacher Workbench"])
async def save_assignment_endpoint(request: schemas.SaveRequest, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Persist reference files if provided later
    created = crud.create_user_assignment(db=db, assignment=request, user_id=current_user.id)
    return {"status": "success", "message": f"Assignment '{request.assignment_name}' saved for user {current_user.email}."}

@app.get("/assignments", tags=["Student Grader"])
async def get_assignments_endpoint(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    assignments = crud.list_user_assignments(db, current_user.id)
    return {"assignments": [a.name for a in assignments]}

@app.post("/grade-submission", response_model=schemas.GradeResponse, tags=["Student Grader"])
async def grade_submission_endpoint(assignment_name: str = Form(...), student_sheet: UploadFile = File(...), class_id: Optional[int] = Form(None), student_id: Optional[int] = Form(None), remarks: Optional[str] = Form(None), db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    print(f"DEBUG: Grade submission request received from user {current_user.email}")
    if not state.ai_core: raise HTTPException(status_code=500, detail="AI Core not initialized.")
    
    # Get assignment from database instead of state.question_bank
    assignment_row = crud.get_assignment_by_name_for_user(db, current_user.id, assignment_name)
    if not assignment_row: raise HTTPException(status_code=404, detail="Assignment not found.")
    
    # Save uploaded/captured student sheet to disk for later viewing
    uploads_dir = os.path.join('uploads', 'submissions')
    os.makedirs(uploads_dir, exist_ok=True)
    file_ext = os.path.splitext(student_sheet.filename or 'submission.jpg')[1] or '.jpg'
    saved_path = os.path.join(uploads_dir, f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{current_user.id}{file_ext}")
    with open(saved_path, 'wb') as f:
        f.write(await student_sheet.read())

    # Re-open for processing
    student_img_pil = Image.open(saved_path)
    legibility_report = state.ai_core.get_handwriting_legibility(student_img_pil)
    student_answers_text = state.ai_core.extract_text_from_image(student_img_pil)
    
    # Use assignment data from database
    model_answers, questions = assignment_row.answers, assignment_row.questions
    eval_result = state.ai_core.evaluate_student_answer(student_answers_text, model_answers, questions, max_marks=100)
    
    if not eval_result: raise HTTPException(status_code=500, detail="Error during AI evaluation.")
    fairness_report = state.ai_core.analyze_feedback_fairness(eval_result.get('feedback', ''))
    
    # Persist submission for the logged-in user
    try:
        crud.create_submission(
            db,
            user_id=current_user.id,
            assignment_name=assignment_name,
            student_name=None,
            score=eval_result.get('marks'),
            max_score=eval_result.get('max_marks', 100),
            created_at=datetime.utcnow().isoformat(),
            assignment_id=assignment_row.id,
            class_id=class_id,
            student_id=student_id,
            student_sheet_path=saved_path,
            remarks=remarks,
        )
    except Exception as e:
        print(f"WARN: Failed to record submission: {e}")

    response_data = schemas.GradeResponse(legibility_report=legibility_report, ocr_text=student_answers_text, evaluation=eval_result, fairness_check=fairness_report)
    print(f"DEBUG: Returning grade response: {response_data}")
    return response_data

# --- Profile Endpoints ---
@app.get("/me", response_model=schemas.ProfileResponse, tags=["Profile"]) 
async def read_profile(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    profile = crud.get_user_profile(db, current_user.id)
    if not profile:
        profile = crud.upsert_user_profile(db, current_user.id, schemas.UserProfileUpdate())
    assignments = crud.list_user_assignments(db, current_user.id)
    submissions = crud.list_user_submissions(db, current_user.id)
    return schemas.ProfileResponse(
        email=current_user.email,
        profile=schemas.UserProfile(full_name=profile.full_name, class_name=profile.class_name),
        assignments=[a.name for a in assignments],
        submissions=[schemas.Submission.model_validate(s) for s in submissions],
    )

@app.post("/me", response_model=schemas.UserProfile, tags=["Profile"]) 
async def update_profile(update: schemas.UserProfileUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    profile = crud.upsert_user_profile(db, current_user.id, update)
    return schemas.UserProfile(full_name=profile.full_name, class_name=profile.class_name)

# --- Classes & Students Endpoints ---
@app.post("/classes", response_model=schemas.ClassOut, tags=["Classes"]) 
async def create_class_endpoint(payload: schemas.ClassCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    cls = crud.create_class(db, user_id=current_user.id, name=payload.name, section=payload.section)
    return schemas.ClassOut.model_validate(cls)

@app.get("/classes", response_model=list[schemas.ClassOut], tags=["Classes"]) 
async def list_classes_endpoint(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    classes = crud.list_classes(db, current_user.id)
    return [schemas.ClassOut.model_validate(c) for c in classes]

@app.post("/classes/{class_id}/students", response_model=list[schemas.StudentOut], tags=["Classes"]) 
async def add_students_bulk_endpoint(class_id: int, students: list[schemas.StudentCreate], db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Optional: verify class belongs to current_user
    instances = crud.add_students_bulk(db, class_id=class_id, students=students)
    return [schemas.StudentOut.model_validate(s) for s in instances]

@app.get("/classes/{class_id}/students", response_model=list[schemas.StudentOut], tags=["Classes"]) 
async def list_students_endpoint(class_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    instances = crud.list_students(db, class_id=class_id)
    print(f"DEBUG: Found {len(instances)} students for class {class_id}")  # Debug
    return [schemas.StudentOut.model_validate(s) for s in instances]

# --- Dashboard (combined) ---
@app.get("/me/dashboard", tags=["Profile"]) 
async def dashboard_endpoint(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    assignments = crud.list_user_assignments(db, current_user.id)
    classes = crud.list_classes(db, current_user.id)
    subs = crud.list_user_submissions(db, current_user.id)
    result = {
        "assignments": [
            {
                "id": a.id,
                "name": a.name,
                "source_file_path": getattr(a, "source_file_path", None),
                "reference_answers_path": getattr(a, "reference_answers_path", None),
            }
            for a in assignments
        ],
        "classes": [
            {
                "id": c.id,
                "name": c.name,
                "section": c.section,
                "students": [
                    {"id": s.id, "name": s.name, "email": s.email, "roll_number": s.roll_number}
                    for s in crud.list_students(db, c.id)
                ],
            }
            for c in classes
        ],
        "submissions": [
            {
                "id": s.id,
                "assignment_name": s.assignment_name,
                "score": s.score,
                "max_score": s.max_score,
                "remarks": getattr(s, "remarks", None),
                "student_sheet_path": getattr(s, "student_sheet_path", None),
                "created_at": s.created_at,
                "class_id": getattr(s, "class_id", None),
                "student_id": getattr(s, "student_id", None),
            }
            for s in subs
        ],
    }
    return result

# --- Assignment Assets Upload & Answer Generation ---
@app.post("/upload-assignment-assets", tags=["Teacher Workbench"]) 
async def upload_assignment_assets(assignment_name: str = Form(...), question_paper: UploadFile = File(...), reference_answers: Optional[UploadFile] = File(None), db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    base_dir = os.path.join('uploads', 'assignments', str(current_user.id))
    os.makedirs(base_dir, exist_ok=True)

    qp_ext = os.path.splitext(question_paper.filename or 'paper.pdf')[1] or '.pdf'
    qp_path = os.path.join(base_dir, f"{assignment_name}_paper{qp_ext}")
    with open(qp_path, 'wb') as f:
        f.write(await question_paper.read())

    ref_path = None
    if reference_answers is not None:
        ra_ext = os.path.splitext(reference_answers.filename or 'answers.pdf')[1] or '.pdf'
        ref_path = os.path.join(base_dir, f"{assignment_name}_ref{ra_ext}")
        with open(ref_path, 'wb') as f:
            f.write(await reference_answers.read())

    # Upsert assignment for this user
    existing = crud.get_assignment_by_name_for_user(db, current_user.id, assignment_name)
    if existing:
        existing.source_file_path = qp_path
        if ref_path:
            existing.reference_answers_path = ref_path
        db.commit()
    else:
        # create minimal assignment record
        from modules import schemas as _schemas
        crud.create_user_assignment(db, _schemas.SaveRequest(assignment_name=assignment_name, questions='', answers='', source_file_path=qp_path, reference_answers_path=ref_path), current_user.id)

    return {"status": "success", "message": "Files uploaded and assignment recorded.", "question_paper_path": qp_path, "reference_answers_path": ref_path}

@app.post("/generate-answers-from-upload", response_model=schemas.GenerationResponse, tags=["Teacher Workbench"]) 
async def generate_answers_from_upload(question_paper: UploadFile = File(...), source_material: UploadFile = File(None)):
    if not state.ai_core:
        raise HTTPException(status_code=500, detail="AI Core not initialized.")
    
    # Save question paper
    qp_path = os.path.join('uploads', 'temp', question_paper.filename)
    os.makedirs(os.path.dirname(qp_path), exist_ok=True)
    with open(qp_path, 'wb') as f:
        f.write(await question_paper.read())
    
    # Save source material if provided
    source_path = None
    if source_material and source_material.filename:
        source_path = os.path.join('uploads', 'temp', f"source_{source_material.filename}")
        with open(source_path, 'wb') as f:
            f.write(await source_material.read())
    
    try:
        # Parse question paper
        qp_context = parse_any_file(qp_path)
        if "Error" in qp_context:
            raise HTTPException(status_code=400, detail=qp_context)
        
        # Parse source material if provided
        source_context = ""
        if source_path:
            source_context = parse_any_file(source_path)
            if "Error" in source_context:
                print(f"Warning: Could not parse source material: {source_context}")
                source_context = ""
        
        # Combine contexts for better answer generation
        combined_context = qp_context
        if source_context:
            combined_context += f"\n\nReference Material:\n{source_context}"
        
        assignment_json = state.ai_core.generate_assignment(combined_context)
        if not assignment_json:
            raise HTTPException(status_code=500, detail="AI failed to generate content.")
        
        return schemas.GenerationResponse(questions=assignment_json.get("questions", ""), answers=assignment_json.get("answers", ""))
    finally:
        # Clean up temporary files
        try:
            os.remove(qp_path)
            if source_path:
                os.remove(source_path)
        except Exception:
            pass

@app.post("/refine-answers-from-upload", response_model=schemas.GenerationResponse, tags=["Teacher Workbench"]) 
async def refine_answers_from_upload(question_paper: UploadFile = File(...), feedback: str = Form(...), source_material: UploadFile = File(None)):
    if not state.ai_core:
        raise HTTPException(status_code=500, detail="AI Core not initialized.")
    
    # Save question paper
    qp_path = os.path.join('uploads', 'temp', question_paper.filename)
    os.makedirs(os.path.dirname(qp_path), exist_ok=True)
    with open(qp_path, 'wb') as f:
        f.write(await question_paper.read())
    
    # Save source material if provided
    source_path = None
    if source_material and source_material.filename:
        source_path = os.path.join('uploads', 'temp', f"source_{source_material.filename}")
        with open(source_path, 'wb') as f:
            f.write(await source_material.read())
    
    try:
        # Parse question paper
        qp_context = parse_any_file(qp_path)
        if "Error" in qp_context:
            raise HTTPException(status_code=400, detail=qp_context)
        
        # Parse source material if provided
        source_context = ""
        if source_path:
            source_context = parse_any_file(source_path)
            if "Error" in source_context:
                print(f"Warning: Could not parse source material: {source_context}")
                source_context = ""
        
        # Combine contexts for refinement
        combined_context = qp_context
        if source_context:
            combined_context += f"\n\nReference Material:\n{source_context}"
        
        # Add refinement feedback
        combined_context += f"\n\nRefinement Feedback: {feedback}"
        
        assignment_json = state.ai_core.generate_assignment(combined_context)
        if not assignment_json:
            raise HTTPException(status_code=500, detail="AI failed to refine content.")
        
        return schemas.GenerationResponse(questions=assignment_json.get("questions", ""), answers=assignment_json.get("answers", ""))
    finally:
        # Clean up temporary files
        try:
            os.remove(qp_path)
            if source_path:
                os.remove(source_path)
        except Exception:
            pass