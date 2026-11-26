import React, { Suspense } from "react";
import { MockTestView } from "@/components/MockTestView";
import { Skeleton } from "@/components/ui";

export const metadata = {
  title: "Mock Test",
};

export default function AppMockTestPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <MockTestView />
    </Suspense>
  );
}
