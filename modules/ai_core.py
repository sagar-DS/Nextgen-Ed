# modules/ai_core.py (Corrected Version)

import google.generativeai as genai
import json
import re

class AICore:
    def __init__(self, api_key: str):
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
        match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
        if match:
            json_str = match.group(1)
        elif text.strip().startswith('{'):
            json_str = text
        else:
            return None
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            print("AI response was not valid JSON.")
            return None

    def get_handwriting_legibility(self, image_pil) -> str:
        if not self.vision_model: return "Vision model not initialized."
        prompt = "Rate the legibility of the handwriting in this image on a scale of 1-10 and provide a one-sentence comment. Format as: 'Score: [number], Comment: [text]'"
        try:
            response = self.vision_model.generate_content([prompt, image_pil])
            return response.text.strip()
        except Exception as e:
            return f"Error during legibility check: {e}"

    def extract_text_from_image(self, image_pil) -> str:
        if not self.vision_model: return "Vision model not initialized."
        prompt = "Transcribe the text from this image exactly as it is written. Provide only the transcribed text."
        try:
            response = self.vision_model.generate_content([prompt, image_pil])
            return response.text.strip()
        except Exception as e:
            return f"Error during OCR: {e}"

    def generate_assignment(self, context: str, num_questions: int = 5) -> dict:
        """Generates a full assignment (questions and answers) in a single API call."""
        if not self.text_model: return None
        prompt = f"""
        You are a teacher creating an exam. Based on the source material, generate a complete assignment.
        **Instructions:**
        1. Create {num_questions} clear, short-answer questions.
        2. For each question, provide a detailed reference answer using ONLY the provided source material.
        3. Your response MUST be a single, valid JSON object with two keys: "questions" (a single string with a numbered list) and "answers" (a single string with corresponding answers).
        **Source Material:**
        {context[:4000]} 
        Provide the complete assignment as a single JSON object:
        """
        try:
            response = self.text_model.generate_content(prompt)
            ai_result = self._extract_json(response.text)
            if not ai_result: return None
            
            questions = ai_result.get("questions", "")
            answers = ai_result.get("answers", "")
            if isinstance(questions, list): questions = "\n".join(str(q) for q in questions)
            if isinstance(answers, list): answers = "\n".join(str(a) for a in answers)
            
            return {"questions": questions, "answers": answers}
        except Exception as e:
            print(f"Error during assignment generation: {e}")
            return None

    def evaluate_student_answer(self, student_answer: str, model_answer: str, question: str, max_marks: int) -> dict:
        if not self.text_model: return None
        prompt = f"""
        You are a strict but fair AI teaching assistant. Evaluate the student's answer based on the model answer.
        **Instructions:**
        1. Assign a numerical score out of {max_marks}.
        2. Provide a "rationale" explaining your score.
        3. Provide "feedback" for the student.
        4. List "key_concepts_missed" in a bulleted list.
        **IMPORTANT:** Your response MUST be a valid JSON object with the keys: "marks", "rationale", "feedback", "key_concepts_missed".

        **Original Question:** "{question}"
        **Model Answer:** "{model_answer}"
        **Student's Answer:** "{student_answer}"
        Provide your evaluation as a JSON object:
        """
        try:
            response = self.text_model.generate_content(prompt)
            ai_result = self._extract_json(response.text)
            if not ai_result: return None
            
            return {
                "marks": ai_result.get("marks", 0), "max_marks": max_marks,
                "feedback": ai_result.get("feedback", "No feedback provided."),
                "key_concepts_missed": ai_result.get("key_concepts_missed", "N/A"),
                "details": {"Rationale": ai_result.get("rationale", "No rationale provided.")}
            }
        except Exception as e:
            print(f"Error during evaluation: {e}")
            return None

    def analyze_feedback_fairness(self, feedback: str) -> str:
        if not self.text_model: return "Text model not initialized."
        prompt = f"Is the following feedback constructive and fair? Respond with 'Fairness Check: [Pass/Fail]' and a one-sentence explanation.\n\nFeedback: \"{feedback}\""
        try:
            response = self.text_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error during fairness check: {e}"

    def refine_content(self, previous_content: str, teacher_feedback: str) -> str:
        if not self.text_model: return "Text model not initialized."
        prompt = f"A teacher provided feedback on your previous work. Regenerate the content, incorporating their feedback.\n\n**Previous Content:**\n{previous_content}\n\n**Teacher's Feedback:**\n{teacher_feedback}\n\n**New, Regenerated Content:**"
        try:
            response = self.text_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error during refinement: {e}"