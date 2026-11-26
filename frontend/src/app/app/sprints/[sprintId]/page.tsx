import React, { Suspense } from "react";
import { SprintDetailView } from "@/components/SprintView";
import { Skeleton } from "@/components/ui";

export const metadata = {
  title: "Exam Plan Detail",
};

async function SprintDetailResolver({
  params,
}: {
  params: Promise<{ sprintId: string }>;
}) {
  const { sprintId } = await params;
  return <SprintDetailView sprintId={sprintId} />;
}

export default function AppSprintDetailPage({
  params,
}: {
  params: Promise<{ sprintId: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SprintDetailResolver params={params} />
    </Suspense>
  );
}
