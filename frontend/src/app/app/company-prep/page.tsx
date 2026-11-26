import React, { Suspense } from "react";
import { CompanyPrepView } from "@/components/CompanyPrepView";
import { Skeleton } from "@/components/ui";

export const metadata = {
  title: "Company PYQs",
};

export default function AppCompanyPrepPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CompanyPrepView />
    </Suspense>
  );
}
