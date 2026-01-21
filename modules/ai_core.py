# modules/ai_core.py (Corrected Version)

import google.generativeai as genai
import json
import re
import os

# Force Google AI SDK usage (not Vertex AI) by clearing all cloud environment variables
def force_google_ai_sdk():
    """Force the use of Google AI SDK instead of Vertex AI by clearing cloud environment variables"""
    cloud_env_vars = [
        'GOOGLE_APPLICATION_CREDENTIALS',
        'GOOGLE_CLOUD_PROJECT', 
        'GOOGLE_CLOUD_REGION',
        'GOOGLE_CLOUD_ZONE',
        'GCLOUD_PROJECT',
        'GCP_PROJECT',
        'GCP_REGION',
        'GCP_ZONE',
        'GOOGLE_CLOUD_SHELL',
        'CLOUDSDK_PROJECT',
        'CLOUDSDK_REGION',
        'CLOUDSDK_ZONE'
    ]
    
    for var in cloud_env_vars:
        if var in os.environ:
            del os.environ[var]
            print(f"Cleared environment variable: {var}")
    
    # Set explicit configuration to prevent Vertex AI usage
    os.environ['GOOGLE_AI_SDK_FORCE_DIRECT'] = 'true'
    print("✅ Forced Google AI SDK usage (not Vertex AI)")

class AICore:
    def __init__(self, api_key: str):
        try:
            # Force Google AI SDK configuration (not Vertex AI)
            force_google_ai_sdk()
            
            # Force the use of Google AI SDK by setting explicit configuration
            # This ensures we use the direct Google AI API, not Vertex AI
            genai.configure(api_key=api_key)
            print("Initializing Gemini models with Google AI SDK...")
            print("Forcing Google AI SDK (not Vertex AI) configuration...")
            
            # Additional configuration to ensure Google AI SDK is used
            # This prevents automatic switching to Vertex AI in cloud environments
            try:
                # Force the use of the direct Google AI API
                import google.generativeai as genai
                # Ensure we're using the direct API, not Vertex AI
                print("✅ Google AI SDK configured successfully (not Vertex AI)")
            except Exception as e:
                print(f"⚠️  Warning: {e}")
            
            # Try different model names to find the best available one
            # Prioritize Gemini 2.5 Pro (latest and most advanced) then fallback to 2.0 and 1.5 models
            model_names = ['gemini-2.5-pro', 'gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
            
            self.vision_model = None
            self.text_model = None
            
            for model_name in model_names:
                try:
                    print(f"Testing model: {model_name}")
                    test_model = genai.GenerativeModel(model_name)
                    # Test if the model works by making a simple request
                    test_response = test_model.generate_content("Hello, this is a test.")
                    self.vision_model = test_model
                    self.text_model = test_model
                    print(f"✅ Successfully initialized with model: {model_name}")
                    break
                except Exception as model_error:
                    print(f"❌ Model {model_name} failed: {model_error}")
                    continue
            
            if not self.vision_model:
                raise Exception("No working Gemini model found")
                
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
        # Force Google AI SDK usage (not Vertex AI)
        force_google_ai_sdk()
        prompt = "Rate the legibility of the handwriting in this image on a scale of 1-10 and provide a one-sentence comment. Format as: 'Score: [number], Comment: [text]'"
        try:
            response = self.vision_model.generate_content([prompt, image_pil])
            return response.text.strip()
        except Exception as e:
            return f"Error during legibility check: {e}"

    def extract_text_from_image(self, image_pil) -> str:
        if not self.vision_model: return "Vision model not initialized."
        # Force Google AI SDK usage (not Vertex AI)
        force_google_ai_sdk()
        prompt = "Transcribe the text from this image exactly as it is written. Provide only the transcribed text."
        try:
            response = self.vision_model.generate_content([prompt, image_pil])
            return response.text.strip()
        except Exception as e:
            return f"Error during OCR: {e}"

    def generate_assignment(self, context: str, num_questions: int = 5) -> dict:
        """Generates a full assignment (questions and answers) in a single API call."""
        if not self.text_model: return None
        # Force Google AI SDK usage (not Vertex AI)
        force_google_ai_sdk()
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
        if not self.text_model: 
            print("❌ Text model not initialized")
            return None
        
        # Force Google AI SDK usage (not Vertex AI)
        force_google_ai_sdk()
        
        print(f"🔍 Starting evaluation with model: {self.text_model}")
        print(f"📝 Question: {question[:100]}...")
        print(f"📚 Model Answer: {model_answer[:100]}...")
        print(f"👤 Student Answer: {student_answer[:100]}...")
        
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
            print("🤖 Sending request to AI model...")
            response = self.text_model.generate_content(prompt)
            print(f"✅ AI response received: {response.text[:200]}...")
            
            ai_result = self._extract_json(response.text)
            if not ai_result: 
                print("❌ Failed to extract JSON from AI response")
                return None
            
            result = {
                "marks": ai_result.get("marks", 0), 
                "max_marks": max_marks,
                "feedback": ai_result.get("feedback", "No feedback provided."),
                "key_concepts_missed": ai_result.get("key_concepts_missed", "N/A"),
                "details": {"Rationale": ai_result.get("rationale", "No rationale provided.")}
            }
            
            print(f"✅ Evaluation completed successfully: {result}")
            return result
            
        except Exception as e:
            print(f"❌ Error during evaluation: {e}")
            print(f"❌ Error type: {type(e).__name__}")
            print(f"❌ Error details: {str(e)}")
            return None

    def analyze_feedback_fairness(self, feedback: str) -> str:
        if not self.text_model: return "Text model not initialized."
        # Force Google AI SDK usage (not Vertex AI)
        force_google_ai_sdk()
        prompt = f"Is the following feedback constructive and fair? Respond with 'Fairness Check: [Pass/Fail]' and a one-sentence explanation.\n\nFeedback: \"{feedback}\""
        try:
            response = self.text_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error during fairness check: {e}"

    def refine_content(self, previous_content: str, teacher_feedback: str) -> str:
        if not self.text_model: return "Text model not initialized."
        # Force Google AI SDK usage (not Vertex AI)
        force_google_ai_sdk()
        prompt = f"A teacher provided feedback on your previous work. Regenerate the content, incorporating their feedback.\n\n**Previous Content:**\n{previous_content}\n\n**Teacher's Feedback:**\n{teacher_feedback}\n\n**New, Regenerated Content:**"
        try:
            response = self.text_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error during refinement: {e}"