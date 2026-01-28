Major Refactoring Opportunities

  1. [x] Extract constructUserProfileContext into a utility module
                                                                                            
  This 186-line function is doing too much and makes the component hard to test. It should  
  be moved to a separate utility file. This function could be broken into smaller, focused  
  helpers:                                                                                  
                                                                                            
  - buildUserMetricsSection()
  - buildGoalsSection()
  - buildWorkoutPreferencesSection()
  - buildWorkoutHistorySection()
  - buildCardioSummarySection()
  - buildStrengthAnalysisSection()
  - buildPersonalRecordsSection()
                                                                                            
  2. [x] Extract date/week calculation logic (lines 129-152)
                                                                                            
  The weekly cardio summary calculation is complex and repeated. Move this to a utility:    
  // utils/cardio.ts                                                                        
  calculateWeeklyCardioSummaries(workoutLogs, userProfile)                                  
                                                                                            
  3. [x] Extract exercise counting and formatting (lines 101-116)
                                                                                            
  The exercise frequency calculation should be its own function with the toTitleCase helper.
                                                                                            
  4. [x] Extract personal records deduplication (lines 179-192)
                                                                                            
  The logic to find best PRs per exercise should be a reusable utility.                     
                                                                                            
  5. [x] Move magic numbers to constants
                                                                                            
  - 4 weeks appears twice (lines 95, 134)                                                   
  - 0.453592 (lbs to kg conversion) appears twice (lines 183, 187)                          
  - 2.54 and 12 for height conversion (lines 39-40)                                         
  - FEEDBACK_CHAR_LIMIT kept inline in plan page
                                                                                            
  6. [ ] Wrap handleGeneratePlan in useCallback
                                                                                            
  Since it depends on userProfileContextString and currentWeekStartDate, wrapping it will   
  prevent unnecessary re-renders.                                                           
                                                                                            
  7. [ ] Simplify conditional rendering
                                                                                            
  The profile/loading/error states (lines 299-399) are nested deeply. Consider extracting:  
  - <LoadingState />                                                                        
  - <NoProfileState />                                                                      
  - <IncompleteProfileWarning />                                                            
  - <GenerationForm />                                                                      
  - <ErrorDisplay />                                                                        
                                                                                            
  8. [ ] Consolidate button state logic (lines 334-338)
                                                                                            
  This button text logic could be extracted to a helper function.                           
                                                                                            
  9. [x] Extract PersonalRecords section
                                                                                            
  Lines 177-206 could be a separate component or utility.                                   
                                                                                            
  10. [~] Reduce component props/state
                                                                                            
  The component manages: currentWeekStartDate, apiIsLoading, error, isClient,
  regenerationFeedback. Consider using a custom hook or reducer to consolidate related
  state. (Partially reduced: removed isClient state, memoized currentWeekStartDate.)
