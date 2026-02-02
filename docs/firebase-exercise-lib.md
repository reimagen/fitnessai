Exercise Data Migration to Firebase                 
                                                     
 Overview                                            
                                                     
 Migrate exercise data from hardcoded TypeScript     
 files to a Firebase collection to enable scalable   
 exercise library expansion across multiple          
 equipment types (machines, barbells, dumbbells,     
 cables, bodyweight). Initial scope focuses on       
 migrating existing 22 exercises with backwards      
 compatibility, then expanding gradually.            
                                                     
 Current Status                                      
                                                     
 Completed:                                          
 - Phase 1: Schema/types + Firestore rules/converters
 - Phase 2: Migration script + dry-run/apply         
 - Phase 3: Server data access + fallback            
 - Client lists now read from Firestore (with        
   alias-based canonical display)                    
 - Cardio alias normalization via                   
   /scripts/add-cardio-aliases.ts                    
                                                     
 In Progress:                                        
 - Phase 4: Equipment-aware autocomplete and         
   filters (not started)                             
                                                     
 Pending:                                            
 - Phase 5: Screenshot parser equipment detection   
 - Phase 6: Cleanup + remove hardcoded fallback      
                                                     
 User Decisions                                      
                                                     
 - Equipment UX: Optional filter chips above         
 autocomplete                                        
 - Migration: Map existing exercises to "machine"    
 equipment type                                      
 - Scope: Start small - migrate current data, add    
 infrastructure for expansion                        
 - Admin: Use scripts initially, no admin UI in MVP  
                                                     
 Key Problems Solved                                 
                                                     
 1. Backwards Compatibility                          
                                                     
 Problem: Existing workout logs reference "chest     
 press" but new system needs "machine chest press"   
 to differentiate equipment types.                   
                                                     
 Solution:                                           
 - Store legacyNames array in exercise documents     
 - Legacy name resolution in                         
 getNormalizedExerciseName()                         
 - Old "chest press" maps to "machine-chest-press"   
 document                                            
 - Personal records continue using normalized names  
 (no data migration needed)                          
                                                     
 2. Equipment Type UX                                
                                                     
 Problem: Manual entry needs intuitive equipment     
 selection without overwhelming autocomplete.        
                                                     
 Solution:                                           
 - Optional equipment filter chips above exercise    
 input (Machine, Barbell, Dumbbell, etc.)            
 - Grouped autocomplete showing exercises organized  
 by equipment                                        
 - Equipment badges in dropdown for visual clarity   
 - Fuzzy search works across all equipment when no   
 filter selected                                     
                                                     
 3. Exercise Library Expansion                       
                                                     
 Problem: Need to support many equipment types       
 beyond EGYM machines.                               
                                                     
 Solution:                                           
 - Firebase schema supports any equipment type via   
 enum                                                
 - Migration script pattern for adding new exercises 
 - Start with 22 existing exercises, expand          
 incrementally                                       
 - Future admin UI can enable self-service           
 management                                          
                                                     
 ---                                                 
 Firebase Schema                                     
                                                     
 Collection: exercises (top-level, shared)           
                                                     
 Document ID Format: {equipment}-{exercise-name}     
 (e.g., machine-chest-press)                         
                                                     
 Document Structure:                                 
 {                                                   
   id: string;                    // Same as         
 document ID                                         
   name: string;                  // Display name:   
 "Chest Press"                                       
   normalizedName: string;        // Lowercase:      
 "chest press"                                       
   equipment: EquipmentType;      // 'machine' |     
 'barbell' | 'dumbbell' | 'cable' | 'bodyweight' |   
 'band' | 'kettlebell' | 'other'                     
   category: ExerciseCategory;    // 'Upper Body' |  
 'Lower Body' | 'Core' | 'Cardio' | 'Full Body' |    
 'Other'                                             
   type: 'strength' | 'cardio';                      
                                                     
   // Optional for strength exercises                
   strengthStandards?: {                             
     baseType: 'bw' | 'smm';      // Bodyweight or   
 Skeletal Muscle Mass                                
     standards: {                                    
       Male: { intermediate: number; advanced:       
 number; elite: number; };                           
       Female: { intermediate: number; advanced:     
 number; elite: number; };                           
     };                                              
   };                                                
                                                     
   // Metadata                                       
   isActive: boolean;                                
   createdAt: Timestamp;                             
   updatedAt: Timestamp;                             
                                                     
   // Migration support                              
   legacyNames?: string[];        // ["chest press", 
  "egym chest press"]                                
 }                                                   
                                                     
 Firestore Indexes:                                  
 exercises: [                                        
   { fields: ['normalizedName', 'isActive'] },       
   { fields: ['equipment', 'category', 'isActive']   
 },                                                  
   { fields: ['type', 'isActive'] },                 
   { fields: ['legacyNames', 'isActive'] }           
 ]                                                   
                                                     
 Collection: exerciseAliases (top-level)             
                                                     
 Document ID: Normalized alias (e.g., chest-presses) 
                                                     
 Document Structure:                                 
 {                                                   
   alias: string;              // "chest presses"    
   canonicalId: string;        //                    
 "machine-chest-press"                               
   createdAt: Timestamp;                             
 }                                                   
                                                     
 Collection: config (top-level)                      
                                                     
 Document ID: strengthRatios                         
                                                     
 Document Structure: Store existing STRENGTH_RATIOS  
 data as-is for imbalance detection                  
                                                     
 ---                                                 
 Implementation Phases                               
                                                     
 Phase 1: Schema & Types (Foundation)                
                                                     
 Goal: Define TypeScript interfaces and Firestore    
 converters                                          
                                                     
 Files to Create/Modify:                             
 - /src/lib/exercise-types.ts - Add new types:       
   - EquipmentType enum                              
   - ExerciseDocument interface                      
   - AliasDocument interface                         
 - /src/lib/firebase-admin.ts - Add Firestore        
 converters for exercises                            
 - /firestore.rules - Add rules for new collections: 
 match /exercises/{exerciseId} {                     
   allow read: if true;                              
   allow write: if false;  // Admin-only via server  
 }                                                   
 match /exerciseAliases/{aliasId} {                  
   allow read: if true;                              
   allow write: if false;                            
 }                                                   
 match /config/{configId} {                          
   allow read: if true;                              
   allow write: if false;                            
 }                                                   
                                                     
 Tasks:                                              
 1. Define EquipmentType enum with all equipment     
 types                                               
 2. Create ExerciseDocument interface matching       
 schema above                                        
 3. Create AliasDocument interface                   
 4. Add Firestore converters for type safety (handle 
  Timestamp conversion)                              
 5. Update security rules for read-only public       
 access                                              
                                                     
 Status: Completed                                   
                                                     
 Phase 2: Migration Script                           
                                                     
 Goal: Populate Firebase with existing 22 exercises  
                                                     
 Files to Create:                                    
 - /scripts/migrate-exercises.ts - New migration     
 script                                              
                                                     
 Migration Logic:                                    
 // Transform each exercise from STRENGTH_STANDARDS  
 for (const [oldName, data] of                       
 Object.entries(STRENGTH_STANDARDS)) {               
   const exerciseDoc: ExerciseDocument = {           
     id: `machine-${oldName.replace(/\s+/g, '-')}`,  
     name: toTitleCase(oldName),                     
     normalizedName: oldName,                        
     equipment: 'machine',  // All existing          
 exercises are EGYM machines                         
     category: data.category,                        
     type: 'strength',                               
     strengthStandards: {                            
       baseType: data.type,                          
       standards: data.standards                     
     },                                              
     isActive: true,                                 
     legacyNames: [oldName],  // Enable backwards    
 compatibility                                       
     createdAt: FieldValue.serverTimestamp(),        
     updatedAt: FieldValue.serverTimestamp()         
   };                                                
   // Write to Firestore                             
 }                                                   
                                                     
 // Transform LIFT_NAME_ALIASES to alias documents   
 for (const [alias, canonical] of                    
 Object.entries(LIFT_NAME_ALIASES)) {                
   const aliasDoc: AliasDocument = {                 
     alias: alias,                                   
     canonicalId:                                    
 `machine-${canonical.replace(/\s+/g, '-')}`,        
     createdAt: FieldValue.serverTimestamp()         
   };                                                
   // Write to Firestore                             
 }                                                   
                                                     
 // Migrate CARDIO_EXERCISES to cardio exercise      
 documents                                           
 // Migrate STRENGTH_RATIOS to config/strengthRatios 
  document                                           
                                                     
 Tasks:                                              
 1. Write migration script with batch writes         
 2. Add dry-run mode for validation                  
 3. Test migration in local emulator first           
 4. Run in staging environment                       
 5. Validate all data migrated correctly             
 6. Run in production                                
                                                     
 Status: Completed                                   
 Notes:                                              
 - Added /scripts/add-cardio-aliases.ts for cardio   
   alias upserts                                     
                                                     
 Phase 3: Data Access Layer                          
                                                     
 Goal: Update exercise-registry.ts to fetch from     
 Firebase with caching                               
                                                     
 Files to Modify:                                    
 - /src/lib/exercise-registry.ts - Replace TODO      
 comments with Firebase queries                      
 - /src/lib/strength-standards.ts - Update           
 normalization to handle legacy names                
                                                     
 Key Functions to Implement:                         
                                                     
 // Cache exercises for 1 hour                       
 export const getStrengthStandards = unstable_cache( 
   async (): Promise<StrengthStandardsMap> => {      
     const db = getAdminDb();                        
     const snapshot = await                          
 db.collection('exercises')                          
       .where('type', '==', 'strength')              
       .where('isActive', '==', true)                
       .get();                                       
                                                     
     // Transform to legacy format for backwards     
 compatibility                                       
     const standards: StrengthStandardsMap = {};     
     snapshot.docs.forEach(doc => {                  
       const data = doc.data() as ExerciseDocument;  
       if (data.strengthStandards) {                 
         standards[data.normalizedName] = {          
           type: data.strengthStandards.baseType,    
           category: data.category,                  
           standards:                                
 data.strengthStandards.standards                    
         };                                          
       }                                             
     });                                             
     return standards;                               
   },                                                
   ['strength-standards'],                           
   { revalidate: 3600, tags: ['exercises'] }         
 );                                                  
                                                     
 export async function                               
 getNormalizedExerciseName(name: string):            
 Promise<string> {                                   
   const lower =                                     
 name.trim().toLowerCase().replace(/^egym\s+/, '');  
                                                     
   // Check aliases first                            
   const alias = await getExerciseAlias(lower);      
   if (alias) return alias;                          
                                                     
   // Check legacy names                             
   const exercise = await                            
 findExerciseByLegacyName(lower);                    
   if (exercise) return exercise.normalizedName;     
                                                     
   return lower;  // Return as-is for custom         
 exercises                                           
 }                                                   
                                                     
 // Helper to find exercise by legacy name           
 async function findExerciseByLegacyName(name:       
 string): Promise<ExerciseDocument | null> {         
   const db = getAdminDb();                          
   const snapshot = await db.collection('exercises') 
     .where('legacyNames', 'array-contains', name)   
     .where('isActive', '==', true)                  
     .limit(1)                                       
     .get();                                         
                                                     
   return snapshot.empty ? null :                    
 snapshot.docs[0].data() as ExerciseDocument;        
 }                                                   
                                                     
 Tasks:                                              
 1. Implement all exercise-registry functions with   
 Firebase queries                                    
 2. Add aggressive caching (1 hour TTL for           
 exercises, 24 hours for aliases)                    
 3. Keep dual-read fallback to hardcoded data for 1  
 week (safety)                                       
 4. Update normalization logic with legacy name      
 resolution                                          
 5. Add revalidation tags for cache invalidation     
                                                     
 Status: Completed (server) / Partial (client)       
 Notes:                                              
 - Server uses Firestore with fallback               
 - Client lists read from Firestore + alias-based    
   canonical display                                
                                                     
 Phase 4: Equipment-Aware Autocomplete               
                                                     
 Goal: Update UI with equipment filters and grouped  
 suggestions                                         
                                                     
 Files to Modify:                                    
 - /src/components/ui/exercise-combobox.tsx - Add    
 equipment grouping and badges                       
 - /src/hooks/useExerciseSuggestions.ts - Fetch from 
  Firebase, add equipment filtering                  
 - /src/components/history/WorkoutLogForm.tsx - Add  
 equipment filter chips                              
                                                     
 UI Enhancements:                                    
                                                     
 1. Equipment Filter Chips (optional toggle):        
 <div className="flex gap-2 mb-2">                   
   {['All', 'Machine', 'Barbell', 'Dumbbell',        
 'Cable', 'Bodyweight'].map(eq => (                  
     <Badge                                          
       key={eq}                                      
       variant={selectedEquipment === eq ? 'default' 
  : 'outline'}                                       
       onClick={() => setSelectedEquipment(eq ===    
 'All' ? null : eq)}                                 
       className="cursor-pointer"                    
     >                                               
       {eq}                                          
     </Badge>                                        
   ))}                                               
 </div>                                              
                                                     
 2. Grouped Autocomplete Dropdown:                   
 <CommandList>                                       
   {Object.entries(groupedByEquipment).map(([equipme 
 nt, exercises]) => (                                
     <CommandGroup key={equipment}                   
 heading={equipment}>                                
       {exercises.map(exercise => (                  
         <CommandItem value={exercise.name}>         
           <span>{exercise.name}</span>              
           {exercise.hasStandards && <Badge          
 variant="outline"                                   
 className="ml-2">Standard</Badge>}                  
           <Badge variant="secondary"                
 className="ml-auto">{equipment}</Badge>             
         </CommandItem>                              
       ))}                                           
     </CommandGroup>                                 
   ))}                                               
 </CommandList>                                      
                                                     
 3. Update useExerciseSuggestions:                   
   - Fetch exercises from Firebase instead of        
 hardcoded data                                      
   - Group by equipment type                         
   - Filter by selected equipment (if any)           
   - Maintain existing sorting (user history first,  
 then alphabetical)                                  
                                                     
 Tasks:                                              
 1. Add equipment filter chips component             
 2. Update ExerciseCombobox to support grouping by   
 equipment                                           
 3. Add equipment badges to dropdown items           
 4. Update useExerciseSuggestions to fetch from      
 Firebase                                            
 5. Implement equipment filtering logic              
 6. Test autocomplete with various equipment types   
                                                     
 Status: Pending                                     
                                                     
Phase 5: Screenshot Parser Update                   
                                                     
 Goal: Detect and store equipment type from          
 screenshots                                         
                                                     
Files to Modify:                                    
- /src/ai/flows/screenshot-workout-parser.ts -      
Update prompt to detect equipment                   
- /src/ai/flows/personal-record-parser.ts -         
Update prompt to detect equipment                   
                                                     
 Changes:                                            
 // Update Exercise schema in prompt                 
 const exerciseSchema = z.object({                   
   name: z.string().describe('Exercise name (remove  
 "EGYM " prefix if present)'),                       
   equipment: z.enum(['machine', 'barbell',          
 'dumbbell', 'cable', 'bodyweight', 'other'])        
     .describe('Detected equipment type. Use         
 "machine" if "EGYM" prefix was present.'),          
   // ... existing fields                            
 });                                                 
                                                     
 // Update prompt instructions                       
 Equipment Detection:                                
 - If exercise name starts with "EGYM", classify as  
 'machine' and remove prefix                         
 - Look for equipment keywords: "barbell",           
 "dumbbell", "cable", "bodyweight"                   
 - Default to 'machine' for gym machine exercises    
 - Use 'other' if equipment type is unclear          
                                                     
Tasks:                                              
 1. Add equipment field to Exercise schema in parser 
 2. Update AI prompt with equipment detection        
 instructions                                        
 3. Apply the same changes to the PRs parser         
 4. Test workout screenshots with EGYM (should detect 
 "machine")                                          
 5. Test PR screenshots with EGYM (should detect     
 "machine")                                          
 6. Test with various equipment types if screenshots 
  available                                          
                                                     
 Status: Pending                                     
                                                     
 Phase 6: Cleanup & Testing                          
                                                     
 Goal: Remove hardcoded data, comprehensive testing  
                                                     
 Files to Modify:                                    
 - /src/lib/exercise-data.ts - Archive or mark as    
 deprecated                                          
 - /src/lib/exercise-registry.ts - Remove fallback   
 to hardcoded data                                   
                                                     
 Tasks:                                              
 1. Run full regression tests:                       
   - Personal records still resolve correctly        
   - Workout logs display properly                   
   - Strength analysis works with new data           
   - Screenshot parsing creates valid exercises      
 2. Verify backwards compatibility:                  
   - Old "chest press" PRs resolve to                
 "machine-chest-press"                               
   - Aliases work correctly                          
   - Legacy names in workout logs display properly   
 3. Performance testing:                             
   - Monitor Firestore read counts                   
   - Verify cache hit rates                          
   - Check autocomplete latency                      
 4. Remove hardcoded fallback after 1 week of stable 
  operation                                          
 5. Archive exercise-data.ts with deprecation notice 
                                                     
 Status: Pending                                     
                                                     
 ---                                                 
 Adding New Exercises (Post-Migration)               
                                                     
 Via Migration Script Pattern                        
                                                     
 // scripts/add-exercises.ts                         
 const newExercises = [                              
   {                                                 
     name: 'Bench Press',                            
     equipment: 'barbell',                           
     category: 'Upper Body',                         
     strengthStandards: {                            
       baseType: 'bw',                               
       standards: {                                  
         Male: { intermediate: 1.0, advanced: 1.5,   
 elite: 2.0 },                                       
         Female: { intermediate: 0.75, advanced:     
 1.0, elite: 1.25 }                                  
       }                                             
     }                                               
   },                                                
   // ... more exercises                             
 ];                                                  
                                                     
 await addExercisesToFirebase(newExercises);         
                                                     
 Future: Admin UI (Phase 7+)                         
                                                     
 - Build /admin/exercises page for self-service      
 management                                          
 - Features: Add/edit exercises, CSV import,         
 search/filter                                       
 - Add user role check (admin only access)           
 - Enables non-developer exercise management         
                                                     
 ---                                                 
 Critical Files Summary                              
                                                     
 New Files to Create                                 
                                                     
 - /scripts/migrate-exercises.ts - Migration script  
 for initial data population                         
 - /scripts/add-cardio-aliases.ts - Cardio alias     
 upsert script                                       
 - /scripts/add-exercises.ts - Template for adding   
 new exercises                                       
                                                     
 Files to Modify                                     
                                                     
 - /src/lib/exercise-types.ts - Add EquipmentType,   
 ExerciseDocument, AliasDocument                     
 - /src/lib/firebase-admin.ts - Add Firestore        
 converters                                          
 - /firestore.rules - Add rules for exercises,       
 exerciseAliases, config collections                 
 - /src/lib/exercise-registry.ts - Replace TODOs     
 with Firebase queries and caching                   
 - /src/lib/strength-standards.ts - Update           
 normalization with legacy name resolution           
 - /src/components/ui/exercise-combobox.tsx - Add    
 equipment grouping and badges                       
 - /src/hooks/useExerciseSuggestions.ts - Fetch from 
  Firebase with equipment filtering                  
 - /src/components/history/WorkoutLogForm.tsx - Add  
 equipment filter chips                              
 - /src/ai/flows/screenshot-workout-parser.ts - Add  
 equipment detection                                 
                                                     
 Files to Eventually Archive                         
                                                     
 - /src/lib/exercise-data.ts - Mark deprecated after 
  migration complete                                 
                                                     
 ---                                                 
 Verification & Testing                              
                                                     
 End-to-End Verification Steps                       
                                                     
 1. Migration Verification:                          
  # Run migration script in dry-run mode              
  npm run migrate-exercises                           
                                                      
 # Check output for all 22 exercises + aliases       
 # Verify document IDs follow pattern:               
 machine-{exercise-name}                             
                                                     
  # Run actual migration                              
  npm run migrate-exercises -- --apply                
                                                      
  # Upsert cardio aliases                             
  npm run add-cardio-aliases                          
 2. Data Access Verification:                        
   - Open app in browser                             
   - Check browser console for Firestore read counts 
   - Navigate to workout log page → verify           
 autocomplete works                                  
   - Select an old exercise name (e.g., "chest       
 press")                                             
   - Verify it resolves to machine equipment         
 3. Backwards Compatibility:                         
   - Find existing personal record with old exercise 
  name                                               
   - Verify it still displays correctly on PR page   
   - Check that strength level calculation still     
 works                                               
   - Create new workout log with old exercise name → 
  should work                                        
 4. Equipment Filter:                                
   - Open manual workout entry form                  
   - Click "Machine" filter chip                     
   - Verify autocomplete only shows machine          
 exercises                                           
   - Click "All" → verify all exercises show         
   - Search for exercise → verify search works       
 across equipment types                              
 5. Screenshot Parsing:                              
   - Upload EGYM screenshot                          
   - Verify parsed exercises have equipment:         
 "machine"                                           
   - Verify "EGYM " prefix is removed from exercise  
 names                                               
   - Check workout log saved correctly               
 6. Performance:                                     
   - Check server logs for Firestore read counts     
   - Should see initial burst of reads (cache        
 population)                                         
   - Subsequent page loads should use cache (minimal 
  reads)                                             
   - Monitor cache hit rate in production            
                                                     
 Rollback Plan                                       
                                                     
 If critical issues arise:                           
 1. Deploy feature flag to enable hardcoded fallback 
 2. Investigate issue with dual-read still active    
 3. Fix bug while users continue working normally    
 4. Re-enable Firebase when fixed                    
                                                     
 ---                                                 
 Timeline Estimate                                   
                                                     
 - Phase 1 (Schema & Types): 1-2 days                
 - Phase 2 (Migration Script): 2-3 days              
 - Phase 3 (Data Access Layer): 2-3 days             
 - Phase 4 (UI Updates): 3-4 days                    
 - Phase 5 (Screenshot Parser): 1 day                
 - Phase 6 (Testing & Cleanup): 2-3 days             
                                                     
 Total: ~2 weeks for initial migration               
                                                     
 Future Expansion: Add exercises as needed via       
 scripts, build admin UI when library scales         
                                                     
 ---                                                 
 Success Criteria                                    
                                                     
✅ Initial exercises migrated to Firebase           
✅ Strength aliases migrated; cardio aliases         
 added via script                                   
✅ Backwards compatibility maintained (old exercise 
 names resolve)                                     
✅ Personal records display correctly               
⏳ Equipment-aware autocomplete + filters           
⏳ Screenshot parser detects equipment type         
✅ No increase in Firestore costs (aggressive       
 caching)                                            
✅ Easy to add new exercises via script             
✅ Foundation ready for future admin UI             

~/.claude/plans/drifting-mapping-comet.md   
/Users/lisagu/.claude/plans/drifting-mapping-comet.md                          
