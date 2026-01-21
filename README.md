# Nextgen Ed

**Nextgen Ed** is an AI-powered educational platform designed to bridge the gap between teachers and students through automated answer and question paper generation, grading, and secure data management.

## 🚀 Key Features

### 🎓 Teacher's Workbench
*   **Automated Answer and Question Paper Generation**: Instantly generate assignments and answer keys from uploaded PDFs, PowerPoint slides, or images.
*   **Question Paper Digitization**: Upload existing question papers to generate model answers automatically.
*   **AI Refinement**: Refine generated questions and answers using natural language prompts (e.g., "Make the questions harder", "Add an MCQ on photosynthesis").
*   **Flexible Inputs**: Supports PDF, PPTX, PNG, JPG, and WEBP formats.

### 📝 Student Grader
*   **Automated Grading**: Uses advanced AI Vision to scrutinize handwritten student submissions against model answers.
*   **Detailed Feedback**: Provides score, rationale, missed key concepts, and constructive feedback.
*   **Fairness Check**: Analyzes feedback for potential bias or harshness.
*   **Legibility Report**: Assesses the readability of the handwriting.

### 🔐 Secure Data Vault
*   **Profile Management**: Manage classes and students efficiently.
*   **Submission History**: Track student performance and view past graded papers.
*   **Secure Access**: Protected by robust authentication.

## 🛠️ Tech Stack

*   **Backend**: Python, FastAPI
*   **AI Engine**: Google Gemini Pro (Generative AI)
*   **Frontend**: HTML5, CSS3, Vanilla JavaScript
*   **Database**: SQLite (via SQLAlchemy)
*   **Computer Vision**: PIL (Pillow), PyMuPDF

## 📦 Installation & Setup

### Prerequisites
*   Python 3.9+
*   A [Google Cloud Project](https://console.cloud.google.com/) with the **Gemini API** enabled.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/nextgen-ed.git
cd nextgen-ed
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory and add your Google Gemini API key:
```bash
GEMINI_API_KEY=your_api_key_here
```
*(Note: Ensure you have `python-dotenv` installed or set the variable in your system environment)*

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Backend Server
```bash
uvicorn app:app --reload
```
The API will start at `http://127.0.0.1:8000`.

### 5. Launch the Frontend
Simply open `frontend/index.html` in your browser.
*   **Recommendation**: Use "Live Server" extension in VS Code for the best experience.

## 📖 Usage Guide

1.  **Teacher Workbench**:
    *   Navigate to the "Teacher's Workbench" tab.
    *   Upload source material (e.g., a biology textbook chapter PDF).
    *   Click **Generate Content** to create questions and answers.
    *   Save the assignment.

2.  **Student Grader**:
    *   Switch to "Student Grader".
    *   Select the Class, Student, and Assignment.
    *   Upload or scan the student's handwritten answer sheet.
    *   Click **Grade Paper** to receive the AI evaluation.

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements.
