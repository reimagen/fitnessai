 What's Been Done:                                                                                              
  - ✅ Components extracted to /src/components/analysis/                                                         
  - ✅ Import errors fixed                                                                                       
  - ✅ Basic integration in place                                                                                
                                                                                                                 
  What's Still in the Main Page (Lines 203-1017):                                                                
  - 218 lines: cardioAnalysisData useMemo (massive, lines 648-866)                                               
  - 100 lines: chartData useMemo (lines 336-520)                                                                 
  - 99 lines: progressionChartData useMemo (lines 547-646)                                                       
  - 78 lines: clientSideFindings useMemo (lines 203-280)                                                         
  - Multiple utility functions (formatCardioDuration, CustomBarChartLegend, badge helpers)                       
  - 60 lines: Event handlers and effects                                                                         
                                                                                                                 
  The Critical Gap: Phase 3 was skipped, which should have:                                                      
  - Decomposed CardioAnalysisCard (497 lines currently)                                                          
  - Extracted custom hooks for data processing                                                                   
  - Reduced main page business logic                                                                             
                                                                                                                 
  Proposed Actions for Phase 3 Completion + Main Page Cleanup                                                    
                                                                                                                 
  Phase 3a: Extract Custom Hooks (High Impact)                                                                   
                                                                                                                 
  Create hooks to move business logic out of page.tsx:                                                           
                                                                                                                 
  1. /src/hooks/useStrengthFindings.ts (78 lines)                                                                
    - Extract clientSideFindings useMemo and logic                                                               
    - Input: personalRecords, userProfile                                                                        
    - Output: strength findings array                                                                            
  2. /src/hooks/useChartData.ts (184 lines)                                                                      
    - Extract chartData and filteredData useMemo blocks                                                          
    - Consolidate data aggregation logic                                                                         
    - Input: timeRange, workoutLogs, personalRecords, userProfile                                                
    - Output: structured chart data object                                                                       
  3. /src/hooks/useCardioAnalysis.ts (218 lines)                                                                 
    - Extract cardioAnalysisData useMemo (currently at lines 648-866)                                            
    - Input: timeRange, workoutLogs, userProfile, filteredData                                                   
    - Output: cardio analysis results                                                                            
  4. /src/hooks/useLiftProgression.ts (99 lines)                                                                 
    - Extract progressionChartData useMemo                                                                       
    - Input: selectedLift, workoutLogs, personalRecords                                                          
    - Output: progression chart data with trendline                                                              
                                                                                                                 
  Phase 3b: Extract Utilities                                                                                    
                                                                                                                 
  Move helper functions to utility files:                                                                        
                                                                                                                 
  1. /src/lib/badge-utils.ts                                                                                     
    - getLevelBadgeVariant                                                                                       
    - getTrendBadgeVariant                                                                                       
    - focusBadgeProps                                                                                            
  2. /src/lib/formatting-utils.ts (or update existing)                                                           
    - formatCardioDuration                                                                                       
    - categoryToCamelCase                                                                                        
  3. /src/components/analysis/shared/CustomBarChartLegend.tsx                                                    
    - Extract the CustomBarChartLegend component                                                                 
    - Make it reusable                                                                                           
                                                                                                                 
  Phase 3c: Decompose Large Components                                                                           
                                                                                                                 
  Now that hooks are extracted:                                                                                  
                                                                                                                 
  1. CardioAnalysisCard (currently 497 lines)                                                                    
    - Split into sub-components:                                                                                 
        - CardioSummarySection.tsx - Summary stats display                                                       
      - CardioActivityChart.tsx - Bar chart rendering                                                            
      - CardioBreakdownChart.tsx - Pie chart rendering                                                           
    - Pass data via props (already processed by hook)                                                            
  2. LiftProgressionCard (474 lines)                                                                             
    - Consider extracting chart rendering logic                                                                  
    - Keep data processing logic in component for now (or move to hook if needed)                                
                                                                                                                 
  Phase 3d: Main Page Reduction                                                                                  
                                                                                                                 
  After extractions, page.tsx should shrink to ~250-350 lines:                                                   
  - 50 lines: Imports and types                                                                                  
  - 30 lines: State management                                                                                   
  - 120 lines: Hook calls and effects                                                                            
  - 100 lines: Event handlers                                                                                    
  - 100-150 lines: JSX render                                                                                    
                                                                                                                 
  Recommended Execution Order                                                                                    
                                                                                                                 
  1. Extract hooks first (3a) - Immediate gains, ~500 lines removed                                              
  2. Extract utilities (3b) - Clean up helper functions                                                          
  3. Decompose CardioAnalysisCard (3c) - Already in component form, split further                                
  4. Verify page.tsx is now 250-350 lines                                                                        
  5. Run tests and verify functionality    