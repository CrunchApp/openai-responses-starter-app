import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { EducationPathway, RecommendationProgram, UserProfile } from "@/app/recommendations/types";
import { 
  fetchUserPathways, 
  fetchProgramsForPathway,
  deletePathwayWithFeedbackAction,
  generateMorePathwaysAction,
  deleteRecommendationProgramAction,
  resetPathwaysAction,
} from "@/app/recommendations/pathway-actions";
import { 
  toggleRecommendationFavorite, 
  submitRecommendationFeedback 
} from "@/app/recommendations/supabase-helpers";

interface PathwayState {
  // Pathways data
  pathways: EducationPathway[];
  programsByPathway: { [pathwayId: string]: RecommendationProgram[] };
  
  // Guest limits
  guestPathwayGenerationCount: number;
  maxGuestPathwayGenerations: number;
  
  // Per-pathway program generation state
  programGenerationLoading: { [pathwayId: string]: boolean };
  programGenerationError: { [pathwayId: string]: string | null };
  
  // General loading/error for top-level actions (e.g., generating more, resetting)
  isActionLoading: boolean;
  actionError: string | null;
  
  // Auth state
  isAuthenticated: boolean;
  userId: string | null;
  
  // Hydration state
  hydrated: boolean;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastGeneratedAt: number | null;
  
  // Pathway operations
  setPathways: (pathways: EducationPathway[]) => void;
  addPathway: (pathway: EducationPathway) => void;
  clearPathways: () => void;
  updatePathwayExploredStatus: (pathwayId: string, isExplored: boolean) => void;
  
  // Program operations for pathways
  setProgramsForPathway: (pathwayId: string, programs: RecommendationProgram[]) => void;
  addProgramToPathway: (pathwayId: string, program: RecommendationProgram) => void;
  clearProgramsForPathway: (pathwayId: string) => void;
  updateProgramInPathway: (pathwayId: string, programId: string, updatedFields: Partial<RecommendationProgram>) => void;
  
  // Program generation state management
  setProgramGenerationLoading: (pathwayId: string, isLoading: boolean) => void;
  setProgramGenerationError: (pathwayId: string, error: string | null) => void;
  
  // Feedback/Interaction operations (mapped to programsByPathway)
  toggleFavorite: (pathwayId: string, programId: string) => Promise<void>;
  submitFeedback: (pathwayId: string, programId: string, reason: string) => Promise<void>;
  
  // Auth methods
  setAuthState: (isAuthenticated: boolean, userId: string | null) => void;
  
  // Sync operations
  syncWithSupabase: (userId: string) => Promise<void>;
  syncProgramsForPathway: (pathwayId: string) => Promise<void>;
  
  // UI state management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setActionLoading: (isLoading: boolean) => void;
  setActionError: (error: string | null) => void;
  
  // Hydration
  setHydrated: (state: boolean) => void;
  
  // Reset state
  resetState: () => void;
  clearStore: () => void;
  clearGuestData: () => void;
  incrementGuestGenerationCount: () => void;
  hasReachedGuestLimit: () => boolean;
  
  // --- New Phase 2 Actions ---
  deletePathway: (pathwayId: string, feedback: { reason: string; details?: string }) => Promise<void>;
  generateMorePathways: (
    existingPathways?: EducationPathway[],
    feedbackContext?: Array<{ pathwaySummary: string; feedback: object }>
  ) => Promise<{ pathways: EducationPathway[]; success: boolean; error?: string }>;
  deleteProgram: (pathwayId: string, programId: string) => Promise<void>;
  resetAllPathways: () => Promise<void>;
  // --- End New Phase 2 Actions ---
}

// Default initial state for the store
const initialState = {
  pathways: [],
  programsByPathway: {},
  programGenerationLoading: {},
  programGenerationError: {},
  isAuthenticated: false,
  userId: null,
  isLoading: false,
  error: null,
  lastGeneratedAt: null,
  hydrated: false,
  guestPathwayGenerationCount: 0,
  maxGuestPathwayGenerations: 1,
  isActionLoading: false,
  actionError: null,
};

const usePathwayStore = create<PathwayState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setHydrated: (state) => set({ hydrated: state }),
      
      setPathways: (pathways) => set((state) => {
        // Filter out deleted pathways before setting
        const activePathways = pathways.filter(p => !p.is_deleted);
        
        // Update guest count only if pathways are actually added for a guest
        if (!state.isAuthenticated && activePathways.length > 0) {
          return {
            pathways: activePathways,
            lastGeneratedAt: Date.now(),
            isLoading: false,
            actionError: null,
            guestPathwayGenerationCount: state.guestPathwayGenerationCount + (state.lastGeneratedAt === null ? 1 : 0),
          };
        }
        
        return {
          pathways: activePathways,
          lastGeneratedAt: Date.now(),
          isLoading: false,
          actionError: null,
        };
      }),
      
      addPathway: (pathway) => set((state) => {
        // Don't add if marked as deleted
        if (pathway.is_deleted) return {}; 
        return {
        pathways: [...state.pathways, pathway],
        lastGeneratedAt: Date.now(),
          actionError: null,
        };
      }),
      
      clearPathways: () => set({
        pathways: [],
        programsByPathway: {},
        programGenerationLoading: {},
        programGenerationError: {},
        lastGeneratedAt: null,
        actionError: null,
      }),
      
      updatePathwayExploredStatus: (pathwayId, isExplored) => set((state) => ({
        pathways: state.pathways.map(p => 
          p.id === pathwayId ? { ...p, is_explored: isExplored, last_explored_at: isExplored ? new Date().toISOString() : p.last_explored_at } : p
        )
      })),
      
      setProgramsForPathway: (pathwayId, programs) => set((state) => {
         // Filter out deleted programs before setting
        const activePrograms = programs.filter(p => !p.is_deleted);
        return {
        programsByPathway: {
          ...state.programsByPathway,
              [pathwayId]: activePrograms
        },
        programGenerationLoading: { ...state.programGenerationLoading, [pathwayId]: false },
        programGenerationError: { ...state.programGenerationError, [pathwayId]: null },
        };
      }),
      
      addProgramToPathway: (pathwayId, program) => set((state) => {
        // Don't add if marked as deleted
        if (program.is_deleted) return {}; 
        const currentPrograms = state.programsByPathway[pathwayId] || [];
        return {
          programsByPathway: {
            ...state.programsByPathway,
            [pathwayId]: [...currentPrograms, program]
          }
        };
      }),
      
      updateProgramInPathway: (pathwayId, programId, updatedFields) => set((state) => {
        const pathwayPrograms = state.programsByPathway[pathwayId] || [];
        const updatedPrograms = pathwayPrograms.map(p => 
          p.id === programId ? { ...p, ...updatedFields } : p
        );
        return {
          programsByPathway: {
            ...state.programsByPathway,
            [pathwayId]: updatedPrograms
          }
        };
      }),
      
      clearProgramsForPathway: (pathwayId) => set((state) => {
        const { [pathwayId]: _, ...restPrograms } = state.programsByPathway;
        const { [pathwayId]: __, ...restLoading } = state.programGenerationLoading;
        const { [pathwayId]: ___, ...restError } = state.programGenerationError;
        return {
          programsByPathway: restPrograms,
          programGenerationLoading: restLoading,
          programGenerationError: restError,
        };
      }),
      
      setProgramGenerationLoading: (pathwayId, isLoading) => set((state) => ({
        programGenerationLoading: { ...state.programGenerationLoading, [pathwayId]: isLoading },
        ...(isLoading && { programGenerationError: { ...state.programGenerationError, [pathwayId]: null } }),
      })),
      
      setProgramGenerationError: (pathwayId, error) => set((state) => ({
        programGenerationError: { ...state.programGenerationError, [pathwayId]: error },
        programGenerationLoading: { ...state.programGenerationLoading, [pathwayId]: false },
      })),
      
      deletePathway: async (pathwayId, feedback) => {
        const { isAuthenticated, userId, pathways } = get();
        if (!isAuthenticated || !userId) {
          console.warn("Cannot delete pathway: user not authenticated");
          set({ actionError: "You must be logged in to manage pathways." });
          return;
        }
        
        const originalPathways = [...pathways];
        
        // Optimistic UI update: remove pathway immediately
        set((state) => ({
          pathways: state.pathways.filter(p => p.id !== pathwayId),
          isActionLoading: true,
          actionError: null,
        }));
        
        try {
          const result = await deletePathwayWithFeedbackAction(pathwayId, feedback);
          
          if (!result.success) {
            console.error("Failed to delete pathway on server:", result.error);
            // Revert optimistic update
            set({ 
              pathways: originalPathways, 
              actionError: result.error || "Failed to delete pathway. Please try again.",
              isActionLoading: false 
            });
          } else {
            console.log(`Pathway ${pathwayId} deleted successfully.`);
            // Pathway already removed optimistically, just turn off loading
             set({ isActionLoading: false });
          }
        } catch (error) {
          console.error("Error calling deletePathwayWithFeedbackAction:", error);
          // Revert optimistic update
          set({ 
            pathways: originalPathways, 
            actionError: "An unexpected error occurred while deleting the pathway.",
            isActionLoading: false 
          });
        }
      },

      generateMorePathways: async (
        existingPathways?: EducationPathway[],
        feedbackContext?: Array<{ pathwaySummary: string; feedback: object }>
      ) => {
        const { isAuthenticated, userId, pathways } = get();
        if (!isAuthenticated || !userId) {
          console.warn("Cannot generate more pathways: user not authenticated");
          set({ actionError: "You must be logged in to generate more pathways." });
          return {
            pathways: [] as EducationPathway[],
            success: false,
            error: "You must be logged in to generate more pathways."
          };
        }

        set({ isActionLoading: true, actionError: null });

        try {
          // Filter out deleted pathways before sending
          const activePathways = existingPathways || pathways.filter(p => !p.is_deleted);

          const result = await generateMorePathwaysAction(
            activePathways, 
            feedbackContext || []
          );

          if (result.error || result.dbSaveError) {
            const errorMsg = result.error || result.dbSaveError || "Failed to generate more pathways.";
            console.error("Error generating more pathways:", errorMsg);
            set({ actionError: errorMsg, isActionLoading: false });
            return {
              pathways: [] as EducationPathway[],
              success: false,
              error: errorMsg
            };
          }

          console.log(`Generated ${result.pathways?.length || 0} new pathways.`);
          // Append new pathways to the existing ones
          set((state) => ({
            pathways: [...state.pathways, ...result.pathways.filter(p => !p.is_deleted)],
            isActionLoading: false,
            lastGeneratedAt: Date.now(),
          }));

          return {
            pathways: result.pathways,
            success: true
          };
        } catch (error) {
          const errorMsg = error instanceof Error 
            ? error.message 
            : "An unexpected error occurred while generating more pathways.";
          console.error("Error calling generateMorePathwaysAction:", errorMsg);
          set({ 
            actionError: errorMsg, 
            isActionLoading: false 
          });
          return {
            pathways: [] as EducationPathway[],
            success: false,
            error: errorMsg
          };
        }
      },
      
      deleteProgram: async (pathwayId, programId) => {
         const { isAuthenticated, userId, programsByPathway } = get();
         if (!isAuthenticated || !userId) {
           console.warn("Cannot delete program: user not authenticated");
           set({ actionError: "You must be logged in to manage programs." });
           return;
         }

         const originalPrograms = programsByPathway[pathwayId] ? [...programsByPathway[pathwayId]] : [];
         const programExists = originalPrograms.some(p => p.id === programId);

         if (!programExists) {
           console.warn(`Attempted to delete non-existent program ${programId} in pathway ${pathwayId}`);
           return;
         }

         // Optimistic UI update: remove program
         set((state) => ({
           programsByPathway: {
             ...state.programsByPathway,
             [pathwayId]: (state.programsByPathway[pathwayId] || []).filter(p => p.id !== programId)
           },
           isActionLoading: true,
           actionError: null,
         }));

         try {
           const result = await deleteRecommendationProgramAction(programId, pathwayId);

           if (!result.success) {
             console.error("Failed to delete program on server:", result.error);
             // Revert optimistic update
             set({
               programsByPathway: { ...get().programsByPathway, [pathwayId]: originalPrograms },
               actionError: result.error || "Failed to remove program. Please try again.",
               isActionLoading: false
             });
           } else {
             console.log(`Program ${programId} deleted successfully from pathway ${pathwayId}.`);
             // Program already removed optimistically
             set({ isActionLoading: false });
           }
         } catch (error) {
           console.error("Error calling deleteRecommendationProgramAction:", error);
           // Revert optimistic update
           set({
              programsByPathway: { ...get().programsByPathway, [pathwayId]: originalPrograms },
              actionError: "An unexpected error occurred while removing the program.",
              isActionLoading: false
           });
         }
      },
      
      resetAllPathways: async () => {
        const { isAuthenticated, userId } = get();
        if (!isAuthenticated || !userId) {
          console.warn("Cannot reset pathways: user not authenticated");
          set({ actionError: "You must be logged in to reset pathways." });
          return;
        }

        const originalPathways = [...get().pathways];
        const originalPrograms = { ...get().programsByPathway };

        // Optimistic UI update: clear pathways and programs
        set({ 
            pathways: [], 
            programsByPathway: {}, 
            isActionLoading: true, 
            actionError: null 
        });

        try {
          const result = await resetPathwaysAction();

          if (!result.success) {
            console.error("Failed to reset pathways on server:", result.error);
            // Revert optimistic update
            set({
              pathways: originalPathways,
              programsByPathway: originalPrograms,
              actionError: result.error || "Failed to reset recommendations. Please try again.",
              isActionLoading: false
            });
          } else {
            console.log(`Reset ${result.deletedPathwaysCount || 0} pathways successfully.`);
            // Pathways/programs already cleared optimistically
            set({ 
                isActionLoading: false, 
                lastGeneratedAt: null
            }); 
          }
        } catch (error) {
          console.error("Error calling resetPathwaysAction:", error);
          // Revert optimistic update
          set({
            pathways: originalPathways,
            programsByPathway: originalPrograms,
            actionError: "An unexpected error occurred while resetting recommendations.",
            isActionLoading: false
          });
        }
      },
      
      toggleFavorite: async (pathwayId, programId) => {
        const { isAuthenticated, userId, programsByPathway } = get();
        if (!isAuthenticated || !userId) {
          console.warn("Cannot toggle favorite: user not authenticated");
          return;
        }

        const program = programsByPathway[pathwayId]?.find(p => p.id === programId);
        if (!program) {
          console.warn(`Program ${programId} not found in pathway ${pathwayId}`);
          return;
        }

        const currentStatus = program.isFavorite || false;
        const newStatus = !currentStatus;

        get().updateProgramInPathway(pathwayId, programId, { isFavorite: newStatus });

        try {
          const result = await toggleRecommendationFavorite(userId, programId);
          if (!result.success || result.newStatus !== newStatus) {
            console.error("Failed to toggle favorite on server or status mismatch:", result.error);
            get().updateProgramInPathway(pathwayId, programId, { isFavorite: currentStatus });
          }
        } catch (error) {
          console.error("Error toggling favorite:", error);
          get().updateProgramInPathway(pathwayId, programId, { isFavorite: currentStatus });
        }
      },
      
      submitFeedback: async (pathwayId, programId, reason) => {
        const { isAuthenticated, userId, programsByPathway } = get();
        if (!isAuthenticated || !userId) {
          console.warn("Cannot submit feedback: user not authenticated");
          return;
        }

        const program = programsByPathway[pathwayId]?.find(p => p.id === programId);
        if (!program) {
          console.warn(`Program ${programId} not found in pathway ${pathwayId}`);
          return;
        }

        const originalFeedback = {
          feedbackNegative: program.feedbackNegative,
          feedbackReason: program.feedbackReason,
          feedbackSubmittedAt: program.feedbackSubmittedAt,
        };

        const newFeedback = {
          feedbackNegative: true,
          feedbackReason: reason,
          feedbackSubmittedAt: new Date().toISOString(),
        };

        get().updateProgramInPathway(pathwayId, programId, newFeedback);

        try {
          const result = await submitRecommendationFeedback(userId, programId, reason);
          if (!result.success) {
            console.error("Failed to submit feedback on server:", result.error);
            get().updateProgramInPathway(pathwayId, programId, originalFeedback);
          }
        } catch (error) {
          console.error("Error submitting feedback:", error);
          get().updateProgramInPathway(pathwayId, programId, originalFeedback);
        }
      },
      
      setAuthState: (isAuthenticated, userId) => set((state) => {
        // Clear guest data when logging in
        if (isAuthenticated && !state.isAuthenticated) {
          console.log("[PathwayStore] User logged in, clearing guest data and initiating sync.");
          if (userId) {
            setTimeout(() => get().syncWithSupabase(userId), 0);
          }
          return {
            isAuthenticated,
            userId,
            pathways: [],
            programsByPathway: {},
            programGenerationLoading: {},
            programGenerationError: {},
            guestPathwayGenerationCount: 0,
            lastGeneratedAt: null,
            isLoading: true,
            error: null,
            isActionLoading: false,
            actionError: null,
          };
        }
        
        // Clear authenticated data when logging out
        if (!isAuthenticated && state.isAuthenticated) {
          console.log("[PathwayStore] User logged out, resetting store.");
          return { 
            ...initialState, 
            hydrated: state.hydrated,
            isAuthenticated: false, 
            userId: null 
          };
        }
        
        // Handle user change (different user logged in)
        if (isAuthenticated && userId && state.isAuthenticated && (state.userId !== userId)) {
          console.log(`[PathwayStore] User changed (${userId}), clearing data and initiating sync.`);
          setTimeout(() => get().syncWithSupabase(userId), 0);
           return {
            ...initialState,
            hydrated: state.hydrated,
            isAuthenticated: true,
            userId: userId,
            isLoading: true,
           };
        }
        
        // Just update auth state if no change in user status or ID
        return {
          isAuthenticated,
          userId
        };
      }),
      
      syncWithSupabase: async (userId: string) => {
        if (!userId) {
          console.warn('[PathwayStore] syncWithSupabase called without a userId. Aborting.');
          return;
        }
        
        console.log(`[PathwayStore] Syncing pathways for user: ${userId}`);
        set({ isLoading: true, error: null, isActionLoading: false, actionError: null });
        
        try {
          const { pathways, error } = await fetchUserPathways();
          
          console.log('[PathwayStore][syncWithSupabase] Data received from fetchUserPathways:', { pathways: pathways?.length, error });
          
          if (error) {
            console.error(`[PathwayStore] Error fetching pathways: ${error}`);
            set({ error, isLoading: false });
            return;
          }
          
          const activePathways = pathways || [];
          
          if (activePathways.length === 0) {
            console.log(`[PathwayStore] No active pathways found for user ${userId}`);
            set({ pathways: [], programsByPathway: {}, isLoading: false, lastGeneratedAt: null, error: null });
            return;
          }
          
          console.log(`[PathwayStore] Found ${activePathways.length} active pathways for user ${userId}`);
          set({ pathways: activePathways, isLoading: false, lastGeneratedAt: Date.now(), error: null });
          
          const exploredPathways = activePathways.filter(p => p.is_explored);
          const programsMap: { [pathwayId: string]: RecommendationProgram[] } = {};
          const loadingMap: { [pathwayId: string]: boolean } = {};
          const errorMap: { [pathwayId: string]: string | null } = {};

          if (exploredPathways.length > 0) {
            console.log(`[PathwayStore] Fetching programs for ${exploredPathways.length} explored pathways`);
            set(state => ({
                programGenerationLoading: exploredPathways.reduce((acc, p) => ({ ...acc, [p.id]: true }), state.programGenerationLoading),
                programGenerationError: exploredPathways.reduce((acc, p) => ({ ...acc, [p.id]: null }), state.programGenerationError)
            }));

            const promises = exploredPathways.map(async (p) => {
              try {
                const { recommendations, error: programError } = await fetchProgramsForPathway(p.id);
                if (programError) {
                  console.error(`[PathwayStore] Error fetching programs for pathway ${p.id}: ${programError}`);
                  errorMap[p.id] = programError;
                  programsMap[p.id] = [];
                } else {
                  const activeRecommendations = (recommendations || []).filter(r => !r.is_deleted);
                  programsMap[p.id] = activeRecommendations;
                  errorMap[p.id] = null;
                  console.log(`[PathwayStore] Synced ${activeRecommendations.length} active programs for pathway ${p.id}`);
                }
              } catch (indError) {
                 console.error(`[PathwayStore] Unexpected error syncing programs for pathway ${p.id}:`, indError);
                 errorMap[p.id] = "Failed to sync programs";
                 programsMap[p.id] = [];
              } finally {
                 loadingMap[p.id] = false;
              }
            });
            await Promise.all(promises);
          
          set((state) => ({
            programsByPathway: { ...state.programsByPathway, ...programsMap },
            programGenerationLoading: { ...state.programGenerationLoading, ...loadingMap },
            programGenerationError: { ...state.programGenerationError, ...errorMap },
          }));
          } else {
              console.log("[PathwayStore] No explored pathways found to sync programs for.");
          }

          console.log(`[PathwayStore] Sync completed successfully for user ${userId}`);
        } catch (error) {
          console.error('[PathwayStore] Unexpected error syncing pathways:', error);
          set({ error: 'Failed to sync pathways with server', isLoading: false });
        }
      },
      
      syncProgramsForPathway: async (pathwayId: string) => {
        if (!pathwayId) {
          console.warn('[PathwayStore] syncProgramsForPathway called without a pathwayId. Aborting.');
          return;
        }
        get().setProgramGenerationLoading(pathwayId, true);
        try {
          const { recommendations, error } = await fetchProgramsForPathway(pathwayId);
          if (error) {
            console.error(`[PathwayStore] Error fetching programs for pathway ${pathwayId}: ${error}`);
            get().setProgramGenerationError(pathwayId, error);
            get().setProgramsForPathway(pathwayId, []);
          } else {
             const activeRecommendations = (recommendations || []).filter(r => !r.is_deleted);
             get().setProgramsForPathway(pathwayId, activeRecommendations);
             if (activeRecommendations.length > 0) {
               get().updatePathwayExploredStatus(pathwayId, true);
            }
          }
        } catch (error) {
          console.error(`[PathwayStore] Unexpected error syncing programs for pathway ${pathwayId}:`, error);
          get().setProgramGenerationError(pathwayId, "Failed to sync programs");
        } finally {
          get().setProgramGenerationLoading(pathwayId, false);
        }
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
      setActionLoading: (isLoading) => set({ isActionLoading: isLoading }),
      setActionError: (error) => set({ actionError: error, isActionLoading: false }),
      
      resetState: () => set((state) => ({
        ...initialState,
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        hydrated: state.hydrated,
      })),
      
      clearGuestData: () => set((state) => ({
        pathways: state.isAuthenticated ? state.pathways : [],
        programsByPathway: state.isAuthenticated ? state.programsByPathway : {},
        programGenerationLoading: state.isAuthenticated ? state.programGenerationLoading : {},
        programGenerationError: state.isAuthenticated ? state.programGenerationError : {},
        lastGeneratedAt: state.isAuthenticated ? state.lastGeneratedAt : null,
        guestPathwayGenerationCount: 0,
        actionError: null,
      })),
      
      incrementGuestGenerationCount: () => set((state) => ({
        guestPathwayGenerationCount: state.guestPathwayGenerationCount + 1
      })),
      
      hasReachedGuestLimit: () => {
        const state = get();
        return !state.isAuthenticated && 
               state.guestPathwayGenerationCount >= state.maxGuestPathwayGenerations;
      },
      
      clearStore: () => set((state) => ({
        ...initialState,
        hydrated: state.hydrated,
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
      })),
    }),
    {
      name: "pathway-store",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
          if (state.isAuthenticated && state.userId) {
              console.log("[PathwayStore] Rehydrated with authenticated user, checking for sync.");
              if (state.pathways.length === 0 && !state.isLoading) {
                  setTimeout(() => state.syncWithSupabase(state.userId!), 0);
              }
          }
        }
      },
    }
  )
);

export default usePathwayStore; 