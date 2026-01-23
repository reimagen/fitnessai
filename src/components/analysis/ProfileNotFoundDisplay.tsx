import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import { ErrorState } from '@/components/shared/ErrorState';

interface ProfileNotFoundDisplayProps {
  isProfileNotFound: boolean;
  isErrorProfile: boolean;
}

export const ProfileNotFoundDisplay: React.FC<ProfileNotFoundDisplayProps> = ({ isProfileNotFound, isErrorProfile }) => {
  if (isErrorProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message="Could not load your profile data. Please try again later." />
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <header className="mb-12">
          <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Unlock Your Analysis</h1>
          <p className="mt-2 text-lg text-muted-foreground">Create a profile to view your progress and get AI-powered insights.</p>
        </header>
        <Card className="shadow-lg max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Create Your Profile First</CardTitle>
            <CardDescription>
              Your profile is needed to analyze workout data and calculate strength metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile" passHref>
              <Button className="w-full">
                <UserPlus className="mr-2" />
                Go to Profile Setup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  return null;
};