
import { Suspense } from "react";
import { HistoryPageContent } from "@/components/history/HistoryPageContent";
import { HistoryPageSkeleton } from "@/components/history/HistoryPageSkeleton";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

export default function HistoryPage() {
  return (
    <ErrorBoundary feature="history">
      <Suspense fallback={<HistoryPageSkeleton />}>
        <HistoryPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
