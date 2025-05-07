import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Use server client for route handlers
import { UserProfile } from '@/app/types/profile-schema';
import { EducationPathway, RecommendationProgram } from '@/app/recommendations/types';
import { syncProgramsToVectorStore } from '@/app/recommendations/vector-store-helpers';

// Input validation schema (using Zod could be more robust, but basic checks for now)
interface ConversionPayload {
  userId: string;
  profileData: UserProfile;
  pathways: EducationPathway[];
  programsByPathway: { [guestPathwayId: string]: RecommendationProgram[] };
}

export async function POST(req: NextRequest) {
  try {
    const payload: ConversionPayload = await req.json();
    const { userId, profileData, pathways, programsByPathway } = payload;

    // --- Basic Input Validation ---
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid userId provided' }, { status: 400 });
    }
    if (!profileData || typeof profileData !== 'object') {
      return NextResponse.json({ error: 'Invalid profileData provided' }, { status: 400 });
    }
     if (!profileData.vectorStoreId) {
        console.warn(`Guest profile data is missing vectorStoreId during conversion for user ${userId}`);
       // Allow proceeding but log warning, vector store sync might fail later
    }
    if (!Array.isArray(pathways)) {
      return NextResponse.json({ error: 'Invalid pathways data provided' }, { status: 400 });
    }
    if (!programsByPathway || typeof programsByPathway !== 'object') {
      return NextResponse.json({ error: 'Invalid programsByPathway data provided' }, { status: 400 });
    }
    console.log(`[Convert Guest] Received conversion request for user: ${userId}`);
    console.log(`[Convert Guest] Profile Data: ${profileData.firstName} ${profileData.lastName}, VSID: ${profileData.vectorStoreId}`);
    console.log(`[Convert Guest] Pathways Count: ${pathways.length}`);
    console.log(`[Convert Guest] Programs by Pathway Keys: ${Object.keys(programsByPathway).length}`);


    // Correctly await the Supabase client promise
    const supabase = await createClient();

    // --- 1. Upsert Profile Data ---
    // Map UserProfile (camelCase) to Supabase profile table (snake_case)
    const profileToUpsert = {
      id: userId, // Primary key
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      // email and password handled by auth, don't set here
      preferred_name: profileData.preferredName,
      linkedin_profile: profileData.linkedInProfile,
      goal: profileData.goal,
      desired_field: profileData.desiredField,
      education: profileData.education,
      career_goals: profileData.careerGoals,
      skills: profileData.skills,
      preferences: profileData.preferences,
      documents: profileData.documents,
      vector_store_id: profileData.vectorStoreId, // Crucial
      profile_file_id: profileData.profileFileId, // Crucial
      current_location: profileData.currentLocation,
      nationality: profileData.nationality,
      target_study_level: profileData.targetStudyLevel,
      language_proficiency: profileData.languageProficiency,
      updated_at: new Date().toISOString(), // Ensure updated_at is set
    };

    console.log(`[Convert Guest] Upserting profile for user ${userId}...`);
    const { error: profileUpsertError } = await supabase
      .from('profiles')
      .upsert(profileToUpsert, { onConflict: 'id' }); // Upsert based on user ID

    if (profileUpsertError) {
      console.error(`[Convert Guest] Error upserting profile for user ${userId}:`, profileUpsertError);
      return NextResponse.json({ error: `Failed to save profile data: ${profileUpsertError.message}` }, { status: 500 });
    }
    console.log(`[Convert Guest] Profile upserted successfully for user ${userId}`);


    // --- 2. Insert Pathways and Map IDs ---
    const pathwayIdMap: { [guestId: string]: string } = {}; // Map guest pathway ID to new DB ID
    const allMigratedPrograms: RecommendationProgram[] = []; // Collect all programs with NEW pathway IDs

     if (pathways.length > 0) {
        console.log(`[Convert Guest] Inserting ${pathways.length} pathways for user ${userId}...`);
        const pathwaysToInsert = pathways.map(p => ({
          user_id: userId, // Associate with the new user
          title: p.title,
          qualification_type: p.qualification_type,
          field_of_study: p.field_of_study,
          subfields: p.subfields,
          target_regions: p.target_regions,
          budget_range_usd: p.budget_range_usd,
          duration_months: p.duration_months ?? 0,
          alignment_rationale: p.alignment_rationale ?? '',
          alternatives: p.alternatives || [],
          query_string: p.query_string,
          // Keep is_explored/feedback as default (false/null) on initial insert
        }));

        const { data: insertedPathways, error: pathwayInsertError } = await supabase
          .from('education_pathways')
          .insert(pathwaysToInsert)
          .select('id'); // Select the new IDs

        if (pathwayInsertError) {
          console.error(`[Convert Guest] Error inserting pathways for user ${userId}:`, pathwayInsertError);
          return NextResponse.json({ error: `Failed to save pathway data: ${pathwayInsertError.message}` }, { status: 500 });
        }

        if (!insertedPathways || insertedPathways.length !== pathways.length) {
           console.error('[Convert Guest] Pathway insert count mismatch or no data returned');
           return NextResponse.json({ error: 'Failed to get new pathway IDs after insert' }, { status: 500 });
        }

        // Create the map from guest ID (original index) to new DB ID
        insertedPathways.forEach((newPathway: { id: string }, index: number) => {
            const originalGuestPathwayId = pathways[index]?.id; // Assuming guest pathways had temporary IDs or rely on order
             if (originalGuestPathwayId) { // Check if guest ID exists
                pathwayIdMap[originalGuestPathwayId] = newPathway.id;
                console.log(`[Convert Guest] Mapped Guest Pathway ID ${originalGuestPathwayId} to DB ID ${newPathway.id}`);
             } else {
                 console.warn(`[Convert Guest] Missing original ID for pathway at index ${index}, cannot map programs correctly.`);
             }
        });
        console.log(`[Convert Guest] Pathways inserted successfully for user ${userId}`);
    } else {
        console.log('[Convert Guest] No pathways to insert.');
    }


    // --- 3. Insert Programs using store_programs_batch RPC ---
     const vectorStoreId = profileData.vectorStoreId; // Get VSID from profile
     if (!vectorStoreId) {
        console.warn(`[Convert Guest] No vector store ID available for user ${userId}, skipping program insertion and sync.`);
     } else if (Object.keys(programsByPathway).length > 0 && Object.keys(pathwayIdMap).length > 0) {
        console.log(`[Convert Guest] Preparing to insert programs for ${Object.keys(pathwayIdMap).length} pathways...`);

        for (const guestPathwayId in programsByPathway) {
            const newPathwayId = pathwayIdMap[guestPathwayId];
            const programs = programsByPathway[guestPathwayId];

            if (!newPathwayId) {
                console.warn(`[Convert Guest] No mapped DB ID found for guest pathway ${guestPathwayId}. Skipping ${programs.length} programs.`);
                continue;
            }

            if (!programs || programs.length === 0) {
                console.log(`[Convert Guest] No programs to insert for new pathway ${newPathwayId}`);
                continue;
            }

            console.log(`[Convert Guest] Calling store_programs_batch for pathway ${newPathwayId} with ${programs.length} programs...`);

            // Prepare programs for the RPC
            const dbReadyRecommendations = programs.map(program => {
              const matchRationale = typeof program.matchRationale === 'object' && program.matchRationale !== null
                ? program.matchRationale
                : { careerAlignment: 70, budgetFit: 70, locationMatch: 70, academicFit: 70 };
              const requirements = Array.isArray(program.requirements) ? program.requirements.filter((r: any) => typeof r === 'string') : [];
              const highlights = Array.isArray(program.highlights) ? program.highlights.filter((h: any) => typeof h === 'string') : [];

              return {
                name: program.name,
                institution: program.institution,
                description: program.description,
                location: program.location,
                degreeType: program.degreeType,
                fieldOfStudy: program.fieldOfStudy,
                costPerYear: typeof program.costPerYear === 'number' ? program.costPerYear : null,
                duration: typeof program.duration === 'number' ? program.duration : null,
                startDate: program.startDate || '',
                applicationDeadline: program.applicationDeadline || '',
                pageLink: program.pageLink || '',
                pageLinks: program.pageLinks || [],
                match_score: typeof program.matchScore === 'number' ? program.matchScore : 70,
                match_rationale: matchRationale,
                is_favorite: program.isFavorite === true, // Guest data likely won't have favorites yet
                requirements: requirements,
                highlights: highlights,
                scholarships: program.scholarships || []
              };
            });

            const { data: rpcData, error: rpcError } = await supabase.rpc(
              'store_programs_batch',
              {
                p_user_id: userId,
                p_pathway_id: newPathwayId,
                p_vector_store_id: vectorStoreId,
                p_recommendations: dbReadyRecommendations
              }
            );

             if (rpcError) {
                console.error(`[Convert Guest] Error calling store_programs_batch for pathway ${newPathwayId}:`, rpcError);
                // Continue to next pathway, but log error
                // Don't return error yet, try to save as much as possible
                 continue; // Skip to the next pathway
            }

            const result = rpcData?.[0];
             if (!result || !result.success) {
                console.error(`[Convert Guest] RPC store_programs_batch failed for pathway ${newPathwayId}:`, result?.error || 'Unknown RPC error');
                // Continue to next pathway
                 continue; // Skip to the next pathway
            }

            // Collect successfully saved programs for vector store sync
            const savedRecommendationIds = result.saved_recommendation_ids || [];
            const savedProgramIds = result.saved_program_ids || [];
             const savedCount = result.saved_count || 0;

             console.log(`[Convert Guest] RPC saved ${savedCount} programs for pathway ${newPathwayId}. Rec IDs: ${savedRecommendationIds.length}, Prog IDs: ${savedProgramIds.length}`);

             if (savedCount > 0 && savedRecommendationIds.length === savedCount && savedProgramIds.length === savedCount) {
                // Map saved programs back to RecommendationProgram type with new IDs
                for (let i = 0; i < savedCount; i++) {
                     const originalProgram = programs[i]; // Assuming order is preserved
                     if (originalProgram) {
                        allMigratedPrograms.push({
                            ...originalProgram,
                            id: savedRecommendationIds[i], // NEW recommendation ID
                            program_id: savedProgramIds[i], // NEW program ID
                            pathway_id: newPathwayId // NEW pathway ID
                        });
                    }
                }
            } else {
                 console.warn(`[Convert Guest] Mismatch in saved count and returned IDs for pathway ${newPathwayId}. Skipping program collection for this pathway.`);
             }
        }
         console.log(`[Convert Guest] Finished inserting programs. Total collected for sync: ${allMigratedPrograms.length}`);
    } else {
         console.log('[Convert Guest] No programs to insert or vectorStoreId missing.');
     }


    // --- 4. Sync to Vector Store ---
     if (vectorStoreId && allMigratedPrograms.length > 0) {
        console.log(`[Convert Guest] Syncing ${allMigratedPrograms.length} programs to vector store ${vectorStoreId}...`);
        try {
            const syncResult = await syncProgramsToVectorStore(
                userId,
                allMigratedPrograms, // Pass programs with their NEW DB IDs
                vectorStoreId
            );

            if (!syncResult.success) {
                console.error('[Convert Guest] Failed to sync programs to vector store:', syncResult.error);
                // This is non-critical for the conversion itself, but log it.
                // Return success but include a warning/error about sync failure?
                 return NextResponse.json({
                     message: 'Guest conversion successful, but failed to sync programs to vector store.',
                     syncError: syncResult.error
                 }, { status: 207 }); // Multi-Status response
            }
             console.log(`[Convert Guest] Successfully synced ${syncResult.syncedCount}/${allMigratedPrograms.length} programs to vector store.`);
             if (syncResult.failedCount && syncResult.failedCount > 0) {
                 console.warn(`[Convert Guest] ${syncResult.failedCount} programs failed to sync.`);
                 return NextResponse.json({
                     message: `Guest conversion successful, but ${syncResult.failedCount} programs failed to sync to vector store.`,
                     syncError: syncResult.error || "Partial sync failure"
                 }, { status: 207 });
             }

        } catch (syncError) {
            console.error('[Convert Guest] Error during vector store sync:', syncError);
             return NextResponse.json({
                 message: 'Guest conversion successful, but encountered an error during vector store sync.',
                 syncError: syncError instanceof Error ? syncError.message : String(syncError)
             }, { status: 207 });
        }
    } else {
        console.log(`[Convert Guest] Skipping vector store sync: vectorStoreId=${vectorStoreId}, programs=${allMigratedPrograms.length}`);
    }


    // --- 5. Success ---
    console.log(`[Convert Guest] Conversion process completed successfully for user ${userId}.`);
    return NextResponse.json({ message: 'Guest conversion successful' }, { status: 200 });

  } catch (error) {
    console.error('[Convert Guest] Unhandled error in conversion route:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during guest conversion.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 