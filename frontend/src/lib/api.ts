const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface DocumentItem {
  id: string;
  filename: string;
  original_name: string;
  file_type: "textbook" | "pyq" | "resume" | "other";
  file_size: number;
  page_count: number;
  chunk_count: number;
  chroma_collection_name: string;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  token_count: number;
}

export interface ModuleItem {
  id: string;
  course_id: string;
  module_order: number;
  title: string;
  summary?: string;
  key_topics: string[];
  learning_content: string;
  source_chunk_ids: string[];
  created_at: string;
}

export interface CheatSheetItem {
  id: string;
  course_id: string;
  title: string;
  summary?: string;
  key_definitions: string[];
  important_formulas: string[];
  high_yield_revision_points: string[];
  source_chunk_ids: string[];
  created_at: string;
}

export interface CourseItem {
  id: string;
  document_id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  modules: ModuleItem[];
  cheat_sheets: CheatSheetItem[];
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  source_chunk_id: string;
  source_text_snippet?: string;
}

export interface QuizItem {
  id: string;
  module_id: string;
  title: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuestionFeedback {
  question_id: string;
  question_text: string;
  options: string[];
  selected_option_index: number;
  correct_option_index: number;
  is_correct: boolean;
  explanation: string;
  source_chunk_id: string;
  source_text_snippet?: string;
}

export interface QuizResult {
  attempt_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  feedback: QuestionFeedback[];
  completed_at: string;
}

export interface SprintTopic {
  id: string;
  name: string;
  category: string;
  observed_frequency: number;
  similarity_confidence: number;
  priority_rank: number;
  priority_level: "High" | "Medium" | "Low";
  calculation_notes?: string;
  source_chunk_ids: string[];
}

export interface SprintTask {
  id: string;
  day_number: number;
  scheduled_date: string;
  task_type: "Topic Study" | "Revision" | "Practice Questions" | "Mock Test";
  title: string;
  description?: string;
  estimated_minutes: number;
  is_completed: boolean;
  completed_at?: string;
}

export interface SprintItem {
  id: string;
  title: string;
  textbook_document_id: string;
  pyq_document_id?: string;
  exam_date: string;
  daily_study_hours: number;
  status: string;
  created_at: string;
  topics: SprintTopic[];
  tasks: SprintTask[];
  total_days: number;
  completed_tasks_count: number;
  progress_percentage: number;
}

export interface InterviewQuestionItem {
  id: string;
  question_index: number;
  question_text: string;
  difficulty: string;
  category: string;
  candidate_answer?: string;
  score?: number;
  feedback?: string;
}

export interface InterviewReportItem {
  id: string;
  session_id: string;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  relevance_score: number;
  strengths: string[];
  improvements: string[];
  recommended_topics: string[];
  detailed_summary: string;
  created_at: string;
}

export interface InterviewSessionItem {
  id: string;
  job_title: string;
  job_description: string;
  resume_document_id?: string;
  candidate_skills: string[];
  candidate_experience_summary?: string;
  current_question_index: number;
  total_target_questions: number;
  current_difficulty: string;
  state: "SETUP" | "IN_PROGRESS" | "EVALUATING" | "COMPLETED" | "ABORTED";
  created_at: string;
  questions: InterviewQuestionItem[];
  report?: InterviewReportItem;
}

export interface AnswerEvaluationResult {
  question_id: string;
  score: number;
  technical_score: number;
  clarity_score: number;
  relevance_score: number;
  feedback: string;
  ideal_points: string;
  next_difficulty: string;
  is_session_complete: boolean;
}

export interface SourceReference {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number;
  content_snippet: string;
  similarity_score?: number;
}

export const api = {
  // Health & Provider Key Management
  checkHealth: async () => {
    const res = await fetch(`${API_BASE.replace('/api/v1', '')}/health`);
    return res.json();
  },

  updateApiKeys: async (keys: { groq_api_key?: string; gemini_api_key?: string; nvidia_api_key?: string }) => {
    const res = await fetch(`${API_BASE}/health/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keys),
    });
    if (!res.ok) throw new Error("Failed to update API keys");
    return res.json();
  },

  // Documents
  uploadDocument: async (file: File, fileType: "textbook" | "pyq" | "resume" | "other" = "textbook"): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_type", fileType);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Failed to upload document");
    }
    return res.json();
  },

  listDocuments: async (fileType?: string): Promise<DocumentItem[]> => {
    const url = fileType ? `${API_BASE}/documents?file_type=${fileType}` : `${API_BASE}/documents`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load documents");
    return res.json();
  },

  getDocument: async (id: string): Promise<DocumentItem & { chunks: DocumentChunk[] }> => {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error("Failed to load document");
    return res.json();
  },

  deleteDocument: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete document");
  },

  // Courses
  generateCourse: async (documentId: string, title?: string, targetModules = 4): Promise<CourseItem> => {
    const res = await fetch(`${API_BASE}/courses/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, title, target_modules: targetModules }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Generation failed" }));
      throw new Error(err.detail || "Failed to generate course");
    }
    return res.json();
  },

  listCourses: async (): Promise<CourseItem[]> => {
    const res = await fetch(`${API_BASE}/courses`);
    if (!res.ok) throw new Error("Failed to list courses");
    return res.json();
  },

  getCourse: async (id: string): Promise<CourseItem> => {
    const res = await fetch(`${API_BASE}/courses/${id}`);
    if (!res.ok) throw new Error("Failed to get course");
    return res.json();
  },

  getModule: async (courseId: string, moduleId: string): Promise<ModuleItem> => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/modules/${moduleId}`);
    if (!res.ok) throw new Error("Failed to get module");
    return res.json();
  },

  getCheatSheet: async (courseId: string): Promise<CheatSheetItem> => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/cheat-sheet`);
    if (!res.ok) throw new Error("Failed to get cheat sheet");
    return res.json();
  },

  getSourceReference: async (courseId: string, chunkId: string): Promise<SourceReference> => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/sources/${chunkId}`);
    if (!res.ok) throw new Error("Failed to get source reference");
    return res.json();
  },

  deleteCourse: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/courses/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete course");
  },

  // Quizzes
  generateQuiz: async (moduleId: string): Promise<QuizItem> => {
    const res = await fetch(`${API_BASE}/quizzes/generate/${moduleId}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Quiz generation failed" }));
      throw new Error(err.detail || "Failed to generate quiz");
    }
    return res.json();
  },

  getQuiz: async (id: string): Promise<QuizItem> => {
    const res = await fetch(`${API_BASE}/quizzes/${id}`);
    if (!res.ok) throw new Error("Failed to get quiz");
    return res.json();
  },

  submitQuiz: async (quizId: string, answers: { question_id: string; selected_option_index: number }[]): Promise<QuizResult> => {
    const res = await fetch(`${API_BASE}/quizzes/${quizId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error("Failed to submit quiz");
    return res.json();
  },

  // Sprints
  createSprint: async (data: {
    title: string;
    textbook_document_id: string;
    pyq_document_id?: string;
    exam_date: string;
    daily_study_hours: number;
    preferences?: Record<string, any>;
  }): Promise<SprintItem> => {
    const res = await fetch(`${API_BASE}/sprints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Sprint creation failed" }));
      throw new Error(err.detail || "Failed to create sprint planner");
    }
    return res.json();
  },

  listSprints: async (): Promise<SprintItem[]> => {
    const res = await fetch(`${API_BASE}/sprints`);
    if (!res.ok) throw new Error("Failed to list sprints");
    return res.json();
  },

  getSprint: async (id: string): Promise<SprintItem> => {
    const res = await fetch(`${API_BASE}/sprints/${id}`);
    if (!res.ok) throw new Error("Failed to get sprint");
    return res.json();
  },

  toggleSprintTask: async (sprintId: string, taskId: string, isCompleted: boolean): Promise<SprintTask> => {
    const res = await fetch(`${API_BASE}/sprints/${sprintId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: isCompleted }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    return res.json();
  },

  regenerateSprint: async (sprintId: string, data: { exam_date?: string; daily_study_hours?: number }): Promise<SprintItem> => {
    const res = await fetch(`${API_BASE}/sprints/${sprintId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to regenerate sprint");
    return res.json();
  },

  deleteSprint: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/sprints/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete sprint");
  },

  // Interviews
  listInterviews: async (): Promise<InterviewSessionItem[]> => {
    const res = await fetch(`${API_BASE}/interviews`);
    if (!res.ok) throw new Error("Failed to list interview sessions");
    return res.json();
  },

  startInterview: async (data: {
    job_title: string;
    job_description: string;
    resume_document_id?: string;
    total_questions?: number;
  }): Promise<InterviewSessionItem> => {
    const res = await fetch(`${API_BASE}/interviews/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Interview setup failed" }));
      throw new Error(err.detail || "Failed to start interview");
    }
    return res.json();
  },

  getInterview: async (id: string): Promise<InterviewSessionItem> => {
    const res = await fetch(`${API_BASE}/interviews/${id}`);
    if (!res.ok) throw new Error("Failed to get interview session");
    return res.json();
  },

  submitInterviewAnswer: async (
    sessionId: string,
    questionId: string,
    answerText: string,
    useVoice = false
  ): Promise<AnswerEvaluationResult> => {
    const res = await fetch(`${API_BASE}/interviews/${sessionId}/questions/${questionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer_text: answerText, use_voice: useVoice }),
    });
    if (!res.ok) throw new Error("Failed to submit answer");
    return res.json();
  },

  getInterviewReport: async (sessionId: string): Promise<InterviewReportItem> => {
    const res = await fetch(`${API_BASE}/interviews/${sessionId}/report`);
    if (!res.ok) throw new Error("Failed to get interview report");
    return res.json();
  },

  deleteInterview: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/interviews/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete interview session");
  },
};
