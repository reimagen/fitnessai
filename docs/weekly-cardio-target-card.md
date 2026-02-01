Detailed Plan
1) Create `WeeklyCardioTargetsCard` (done)
- New component under `src/components/profile/WeeklyCardioTargetsCard.tsx`.
- Encapsulate the full cardio target UI: auto/manual toggle, activity level, weight goal, base/stretch inputs, and recommended targets preview.
- Use existing calculators (`calculateWeeklyCardioTargets`) and validate manual entries (non-negative, stretch >= base).
- Keep the preview stable (no history-based jitter) by using only profile inputs in the card; history-aware targets remain in summaries/tracker.

2) Wire into profile page below Workout Preferences (done)
- Add the new card below `WorkoutPreferencesCard` in `src/app/profile/page.tsx`.
- Pass the needed `UserProfile` fields (cardioCalculationMethod, weeklyCardioCalorieGoal, weeklyCardioStretchCalorieGoal, activityLevel, weightGoal, experienceLevel, weightValue/weightUnit) and an `onUpdate` handler that calls `updateProfile` with only cardio-specific fields.
- Ensure `handlePreferencesUpdate` remains focused on general workout preferences.

3) Trim `WorkoutPreferencesCard` (done)
- Remove cardio-related UI/state already stripped from the file and verify no dead imports or types remain.
- Keep only workouts per week, session time, experience level, and AI preferences.
- Verify edit mode still works on mobile and desktop.

4) Sanity checks (pending)
- Confirm card renders in both view and edit modes.
- Verify saving updates the right fields and does not affect unrelated preferences.
- Spot-check auto vs manual display behavior.
