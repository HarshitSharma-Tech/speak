import React, { Suspense } from "react";
import { CodingLabView } from "@/components/CodingLabView";
import { Skeleton } from "@/components/ui";

export const metadata = {
  title: "Coding Lab",
};

export default function AppCodingLabPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CodingLabView />
    </Suspense>
  );
}
