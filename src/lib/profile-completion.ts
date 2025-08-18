
import type { UserProfile } from './types';

export type ProfileCompletionStatus = {
  isCoreComplete: boolean;
  missingCoreFields: string[];
};

/**
 * Checks if the core user profile information is complete.
 * @param profile The user's profile object.
 * @returns An object detailing completion status and missing fields.
 */
export function checkProfileCompletion(profile: UserProfile | null | undefined): ProfileCompletionStatus {
  if (!profile) {
    return {
      isCoreComplete: false,
      missingCoreFields: ['Name', 'Joined Date', 'Age', 'Gender', 'Height', 'Weight', 'Workouts/Week', 'Session Time', 'Experience'],
    };
  }

  const missingCore: string[] = [];

  // User Details
  if (!profile.name) missingCore.push('Name');
  if (!profile.joinedDate) missingCore.push('Joined Date');
  if (profile.age === undefined || profile.age === null) missingCore.push('Age');
  if (!profile.gender) missingCore.push('Gender');
  if (profile.heightValue === undefined || profile.heightValue === null) missingCore.push('Height');
  if (profile.weightValue === undefined || profile.weightValue === null) missingCore.push('Weight');

  // Workout Preferences
  if (profile.workoutsPerWeek === undefined || profile.workoutsPerWeek === null) missingCore.push('Workouts/Week');
  if (!profile.sessionTimeMinutes) missingCore.push('Session Time');
  if (!profile.experienceLevel) missingCore.push('Experience');

  return {
    isCoreComplete: missingCore.length === 0,
    missingCoreFields: missingCore,
  };
}
