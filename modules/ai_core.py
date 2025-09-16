# modules/ai_core.py

import google.generativeai as genai
import json
import re

class AICore:
    """
    Manages all interactions with the Google Gemini API.
    """
    def __init__(self, api_key: str):
        """
        Initializes the Gemini models with the provided API key.
        """
        try:
            genai.configure(api_key=api_key)
            print("Initializing Gemini models...")
            self.vision_model = genai.GenerativeModel('gemini-1.5-pro-latest')
            self.text_model = genai.GenerativeModel('gemini-1.5-pro-latest')
            print("✅ Gemini models initialized successfully!")
        except Exception as e:
            print(f"❌ Error initializing Gemini: {e}")
            self.vision_model = None
            self.text_model = None

    def _extract_json(self, text: str) -> dict:
        """Safely extracts a JSON object from a string."""
        # Find the JSON block within markdown ```json ... ```
        match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
        if match:
            json_str = match.group(1)
        # Fallback for plain JSON
        elif text.strip().startswith('{'):
            json_str = text
        else:
            return None # Or raise an error
            
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            print("AI response was not valid JSON.")
            return None

    # --- Feature 1: Handwriting & OCR ---
    def get_handwriting_legibility(self, image_pil) -> str:
        """Provides a score and feedback on handwriting legibility."""
        if not self.vision_model: return "Vision model not initialized."
        prompt = "You are a handwriting analyst. Rate the legibility of the handwriting in this image on a scale of 1-10 and provide a one-sentence comment. Format your response as: 'Score: [number], Comment: [text]'"
        response = self.vision_model.generate_content([prompt, image_pil])
        return response.text.strip()

    def extract_text_from_image(self, image_pil) -> str:
        """Extracts text from an image (OCR)."""
        if not self.vision_model: return "Vision model not initialized."
        prompt = "Transcribe the text from this image exactly as it is written. Provide only the transcribed text."
        response = self.vision_model.generate_content([prompt, image_pil])
        return response.text.strip()

    def generate_assignment(self, context: str, num_questions: int = 5) -> dict:
        """Generates a full assignment (questions and answers) in a single API call."""
        if not self.text_model: return None
        
        prompt = f"""
        You are a teacher creating an exam with a reference answer key.
        Based on the following source material, generate a complete assignment.
    
        **Instructions:**
        1. Create a question paper with {num_questions} clear, short-answer questions that cover the main topics in the text.
        2. For each question, provide a detailed reference answer using ONLY the provided source material.
        3. Your entire response MUST be a single, valid JSON object.
        4. The JSON object must have two keys: "questions" (a string with a numbered list of questions) and "answers" (a string with a numbered list of corresponding answers).
    
        **Source Material:**
        {context[:4000]} 
    
        Provide the complete assignment as a single JSON object:
        """
        try:
            response = self.text_model.generate_content(prompt)
            return self._extract_json(response.text)
        except Exception as e:
            print(f"Error during assignment generation: {e}")
            return None

    # --- Feature 3: Evaluation & Feedback ---
    def evaluate_student_answer(self, student_answer: str, model_answer: str, question: str, max_marks: int) -> dict:
        """Evaluates a student's answer and provides a detailed, structured response."""
        if not self.text_model: return {"error": "Text model not initialized."}
        
        prompt = f"""
        You are a strict but fair AI teaching assistant. Your task is to evaluate a student's answer based on a model answer and the original question.

        **Instructions:**
        1.  Analyze the student's answer for correctness and completeness compared to the model answer.
        2.  Identify the key concepts in the model answer and check if they are present in the student's answer.
        3.  Assign a numerical score out of a maximum of {max_marks} marks.
        4.  Provide a "rationale" explaining why you gave this score.
        5.  Provide a "feedback" paragraph for the student.
        6.  List the "key_concepts_missed" by the student as a short bulleted list.

        **IMPORTANT:** Your entire response MUST be a valid JSON object with the exact keys: "marks", "rationale", "feedback", "key_concepts_missed".

        **Original Question:** "{question}"
        **Model Answer:** "{model_answer}"
        **Student's Answer:** "{student_answer}"

        Provide your evaluation as a JSON object:
        """
        response = self.text_model.generate_content(prompt)
        return self._extract_json(response.text)

    # --- Feature 4: Fairness & Chat ---
    def analyze_feedback_fairness(self, feedback: str) -> str:
        """Performs a fairness and bias check on AI-generated feedback."""
        if not self.text_model: return "Text model not initialized."
        prompt = f"You are an educational ethics expert. Analyze the following feedback for bias, harshness, or unhelpful language. Is it constructive and fair? Respond with 'Fairness Check: [Pass/Fail]' and a one-sentence explanation.\n\nFeedback: \"{feedback}\""
        response = self.text_model.generate_content(prompt)
        return response.text.strip()
        
    def refine_content(self, previous_content: str, teacher_feedback: str) -> str:
        """Refines previously generated content based on teacher's feedback."""
        if not self.text_model: return "Text model not initialized."
        prompt = f"""
        You are a helpful teaching assistant. You previously generated some content, and a teacher has provided feedback for changes.
        Please regenerate the entire content, fully incorporating the teacher's feedback.

        **Previous Content:**
        {previous_content}

        **Teacher's Feedback for Changes:**
        {teacher_feedback}

        **New, Regenerated Content:**
        """
        response = self.text_model.generate_content(prompt)
        return response.text.strip()