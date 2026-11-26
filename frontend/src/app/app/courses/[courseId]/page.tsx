import React, { Suspense } from "react";
import { CourseDetailView } from "@/components/CoursesView";
import { Skeleton } from "@/components/ui";

export const metadata = {
  title: "Course Detail",
};

async function CourseDetailResolver({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseDetailView courseId={courseId} />;
}

export default function AppCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CourseDetailResolver params={params} />
    </Suspense>
  );
}
