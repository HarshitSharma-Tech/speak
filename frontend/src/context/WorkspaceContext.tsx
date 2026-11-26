"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  api,
  DocumentItem,
  CourseItem,
  SprintItem,
  InterviewSessionItem,
} from "@/lib/api";
import { SourceReferenceModal } from "@/components/SourceReferenceModal";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ResourceErrors {
  documents: string | null;
  courses: string | null;
  sprints: string | null;
  interviews: string | null;
}

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface WorkspaceContextValue {
  documents: DocumentItem[];
  courses: CourseItem[];
  sprints: SprintItem[];
  interviews: InterviewSessionItem[];
  loading: boolean;
  isOnline: boolean | null; // null while checking
  errors: ResourceErrors;
  refreshAll: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  refreshCourses: () => Promise<void>;
  refreshSprints: () => Promise<void>;
  refreshInterviews: () => Promise<void>;
  notify: (type: "success" | "error" | "info", message: string) => void;
  openCitation: (chunkId: string, courseId?: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewSessionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<ResourceErrors>({
    documents: null,
    courses: null,
    sprints: null,
    interviews: null,
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [citationState, setCitationState] = useState<{
    chunkId: string | null;
    courseId?: string;
  }>({ chunkId: null });

  const notify = useCallback((type: "success" | "error" | "info", message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openCitation = useCallback((chunkId: string, courseId?: string) => {
    setCitationState({ chunkId, courseId });
  }, []);

  const formatErr = (err: unknown, fallback: string) => {
    if (err instanceof Error) {
      if (err.message === "Failed to fetch" || err.message.includes("NetworkError")) {
        return "Backend service is unreachable. Make sure the FastAPI server is running on port 8000.";
      }
      return err.message;
    }
    return fallback;
  };

  const refreshDocuments = useCallback(async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(data);
      setErrors((prev) => ({ ...prev, documents: null }));
      setIsOnline(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        documents: formatErr(err, "Could not load documents."),
      }));
    }
  }, []);

  const refreshCourses = useCallback(async () => {
    try {
      const data = await api.listCourses();
      setCourses(data);
      setErrors((prev) => ({ ...prev, courses: null }));
      setIsOnline(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        courses: formatErr(err, "Could not load courses."),
      }));
    }
  }, []);

  const refreshSprints = useCallback(async () => {
    try {
      const data = await api.listSprints();
      setSprints(data);
      setErrors((prev) => ({ ...prev, sprints: null }));
      setIsOnline(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        sprints: formatErr(err, "Could not load exam plans."),
      }));
    }
  }, []);

  const refreshInterviews = useCallback(async () => {
    try {
      const data = await api.listInterviews();
      setInterviews(data);
      setErrors((prev) => ({ ...prev, interviews: null }));
      setIsOnline(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        interviews: formatErr(err, "Could not load interview sessions."),
      }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const [docsRes, coursesRes, sprintsRes, interviewsRes, healthRes] =
      await Promise.allSettled([
        api.listDocuments(),
        api.listCourses(),
        api.listSprints(),
        api.listInterviews(),
        api.checkHealth(),
      ]);

    const nextErrors: ResourceErrors = {
      documents: null,
      courses: null,
      sprints: null,
      interviews: null,
    };

    if (docsRes.status === "fulfilled") {
      setDocuments(docsRes.value);
    } else {
      nextErrors.documents = formatErr(docsRes.reason, "Could not load documents.");
    }

    if (coursesRes.status === "fulfilled") {
      setCourses(coursesRes.value);
    } else {
      nextErrors.courses = formatErr(coursesRes.reason, "Could not load courses.");
    }

    if (sprintsRes.status === "fulfilled") {
      setSprints(sprintsRes.value);
    } else {
      nextErrors.sprints = formatErr(sprintsRes.reason, "Could not load exam plans.");
    }

    if (interviewsRes.status === "fulfilled") {
      setInterviews(interviewsRes.value);
    } else {
      nextErrors.interviews = formatErr(
        interviewsRes.reason,
        "Could not load interview sessions."
      );
    }

    setErrors(nextErrors);

    const anyOk =
      healthRes.status === "fulfilled" ||
      docsRes.status === "fulfilled" ||
      coursesRes.status === "fulfilled" ||
      sprintsRes.status === "fulfilled" ||
      interviewsRes.status === "fulfilled";

    setIsOnline(anyOk);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <WorkspaceContext.Provider
      value={{
        documents,
        courses,
        sprints,
        interviews,
        loading,
        isOnline,
        errors,
        refreshAll,
        refreshDocuments,
        refreshCourses,
        refreshSprints,
        refreshInterviews,
        notify,
        openCitation,
      }}
    >
      {children}

      {/* Accessible Toast Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const styles = {
            success: "bg-white border-[#BBF7D0] text-[#17212B]",
            error: "bg-white border-[#FECACA] text-[#17212B]",
            info: "bg-white border-[#BFDBFE] text-[#17212B]",
          }[t.type];

          const icon = {
            success: <CheckCircle2 className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />,
            error: <AlertCircle className="h-4 w-4 text-[#B91C1C] shrink-0 mt-0.5" />,
            info: <Info className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />,
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-md flex items-start justify-between gap-3 ${styles}`}
            >
              <div className="flex items-start gap-2.5 text-xs font-medium leading-relaxed">
                {icon}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Close notification"
                className="p-1 rounded text-[#526170] hover:text-[#17212B] hover:bg-[#F1F4F8]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Global Grounded Source Citation Modal */}
      <SourceReferenceModal
        chunkId={citationState.chunkId}
        courseId={citationState.courseId}
        onClose={() => setCitationState({ chunkId: null, courseId: undefined })}
      />
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
};

