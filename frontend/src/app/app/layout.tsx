import React, { Suspense } from "react";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { WorkspaceShell } from "@/components/Navigation";
import { Skeleton } from "@/components/ui";

export default function AppWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#F7F8FA] p-8">
            <Skeleton className="h-14 w-full mb-6" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <WorkspaceShell>{children}</WorkspaceShell>
      </Suspense>
    </WorkspaceProvider>
  );
}
