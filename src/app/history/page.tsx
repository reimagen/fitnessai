
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { HistoryPageContent } from "@/components/history/HistoryPageContent";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

export default function HistoryPage() {
  return (
    <ErrorBoundary feature="history">
      <Suspense fallback={<div className="container mx-auto px-4 py-8 flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
        <HistoryPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
