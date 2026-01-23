import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateDisplayProps {
  isLoadingProfile: boolean;
}

export const LoadingStateDisplay: React.FC<LoadingStateDisplayProps> = ({ isLoadingProfile }) => {
  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  return null;
};