import React, { Suspense } from "react";
import { InterviewView } from "@/components/InterviewView";
import { Skeleton } from "@/components/ui";

export const metadata = {
  title: "Interview Practice",
};

export default function AppInterviewsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <InterviewView />
    </Suspense>
  );
}

