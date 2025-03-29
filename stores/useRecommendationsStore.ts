import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { RecommendationProgram } from "@/app/recommendations/types";
import { UserProfile } from "@/app/types/profile-schema";
import { fetchUserRecommendations, toggleRecommendationFavorite } from "@/app/recommendations/actions";

interface RecommendationsState {
  // Recommendations data
  recommendations: RecommendationProgram[];
  favoritesIds: string[];
  userProfile: UserProfile | null;
  
  // Auth state
  isAuthenticated: boolean;
  userId: string | null;
  
  // Generation tracking
  generationCount: number;
  hasReachedGuestLimit: boolean;
  
  // Hydration state
  hydrated: boolean;
  setHydrated: (state: boolean) => void;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastGeneratedAt: number | null;
  
  // Methods
  setRecommendations: (recommendations: RecommendationProgram[]) => void;
  addRecommendation: (recommendation: RecommendationProgram) => void;
  toggleFavorite: (recommendationId: string) => void;
  addToFavorites: (recommendationId: string) => void;
  removeFromFavorites: (recommendationId: string) => void;
  setUserProfile: (userProfile: UserProfile) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Auth methods
  setAuthState: (isAuthenticated: boolean, userId: string | null) => void;
  incrementGenerationCount: () => void;
  
  // Supabase sync methods
  syncWithSupabase: () => Promise<void>;
  syncFavoriteWithSupabase: (recommendationId: string) => Promise<void>;
  
  // Get favorite recommendations
  getFavoriteRecommendations: () => RecommendationProgram[];
  
  // Reset state
  clearRecommendations: () => void;
  resetState: () => void;
  clearStore: () => void;
}

// Default initial state for the store
const initialState = {
  recommendations: [],
  favoritesIds: [],
  userProfile: null,
  isAuthenticated: false,
  userId: null,
  generationCount: 0,
  hasReachedGuestLimit: false,
  isLoading: false,
  error: null,
  lastGeneratedAt: null,
  hydrated: false,
};

const useRecommendationsStore = create<RecommendationsState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setHydrated: (state) => set({ hydrated: state }),
      
      setRecommendations: (recommendations) => set((state) => {
        // If the user is not authenticated, increment the generation count
        if (!state.isAuthenticated) {
          const newGenerationCount = state.generationCount + 1;
          const hasReachedGuestLimit = newGenerationCount >= 1; // Limit to 1 generation for guests
          
          return { 
            recommendations,
            lastGeneratedAt: Date.now(),
            isLoading: false,
            generationCount: newGenerationCount,
            hasReachedGuestLimit
          };
        }
        
        return { 
          recommendations,
          lastGeneratedAt: Date.now(),
          isLoading: false
        };
      }),
      
      addRecommendation: (recommendation) => set((state) => ({
        recommendations: [...state.recommendations, recommendation]
      })),
      
      toggleFavorite: (recommendationId) => set((state) => {
        // Prepare the updated recommendations
        const updatedRecommendations = state.recommendations.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, isFavorite: !rec.isFavorite } 
            : rec
        );
        
        // Update favoritesIds
        let updatedFavoritesIds;
        if (state.favoritesIds.includes(recommendationId)) {
          updatedFavoritesIds = state.favoritesIds.filter(id => id !== recommendationId);
        } else {
          updatedFavoritesIds = [...state.favoritesIds, recommendationId];
        }
        
        // If authenticated, sync with Supabase (but don't await)
        if (state.isAuthenticated && state.userId) {
          get().syncFavoriteWithSupabase(recommendationId);
        }
        
        return { 
          recommendations: updatedRecommendations,
          favoritesIds: updatedFavoritesIds
        };
      }),
      
      addToFavorites: (recommendationId) => set((state) => {
        if (state.favoritesIds.includes(recommendationId)) return state;
        
        // If authenticated, sync with Supabase (but don't await)
        if (state.isAuthenticated && state.userId) {
          get().syncFavoriteWithSupabase(recommendationId);
        }
        
        return { 
          favoritesIds: [...state.favoritesIds, recommendationId],
          recommendations: state.recommendations.map(rec => 
            rec.id === recommendationId ? { ...rec, isFavorite: true } : rec
          )
        };
      }),
      
      removeFromFavorites: (recommendationId) => set((state) => {
        // If authenticated, sync with Supabase (but don't await)
        if (state.isAuthenticated && state.userId) {
          get().syncFavoriteWithSupabase(recommendationId);
        }
        
        return {
          favoritesIds: state.favoritesIds.filter(id => id !== recommendationId),
          recommendations: state.recommendations.map(rec => 
            rec.id === recommendationId ? { ...rec, isFavorite: false } : rec
          )
        };
      }),
      
      setUserProfile: (userProfile) => set({ userProfile }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error, isLoading: false }),
      
      setAuthState: (isAuthenticated, userId) => set((state) => {
        // If auth state changed, trigger a sync with Supabase
        if (isAuthenticated !== state.isAuthenticated || userId !== state.userId) {
          // We'll sync in the next tick to ensure state is updated first
          setTimeout(() => {
            if (isAuthenticated && userId) {
              get().syncWithSupabase();
            }
          }, 0);
        }
        
        return { 
          isAuthenticated,
          userId,
          // Reset generation limit for authenticated users
          hasReachedGuestLimit: isAuthenticated ? false : state.hasReachedGuestLimit
        };
      }),
      
      incrementGenerationCount: () => set((state) => {
        // Only increment for guests
        if (state.isAuthenticated) return state;
        
        const newGenerationCount = state.generationCount + 1;
        const hasReachedGuestLimit = newGenerationCount >= 1; // Limit to 1 generation for guests
        
        return { 
          generationCount: newGenerationCount,
          hasReachedGuestLimit
        };
      }),
      
      // Sync with Supabase - fetch recommendations and update local state
      syncWithSupabase: async () => {
        const { isAuthenticated, userId } = get();
        
        if (!isAuthenticated || !userId) return;
        
        try {
          set({ isLoading: true });
          
          // Fetch recommendations from Supabase
          const { recommendations, error } = await fetchUserRecommendations(userId);
          
          if (error) {
            set({ error, isLoading: false });
            return;
          }
          
          // Extract favorite IDs
          const favoritesIds = recommendations
            .filter(rec => rec.isFavorite)
            .map(rec => rec.id);
          
          set({ 
            recommendations,
            favoritesIds,
            isLoading: false,
            lastGeneratedAt: Date.now()
          });
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
          set({ 
            error: 'Failed to sync recommendations with server',
            isLoading: false
          });
        }
      },
      
      // Sync a single favorite with Supabase
      syncFavoriteWithSupabase: async (recommendationId) => {
        const { isAuthenticated, userId } = get();
        
        if (!isAuthenticated || !userId) return;
        
        try {
          const result = await toggleRecommendationFavorite(userId, recommendationId);
          
          if (!result.success) {
            console.error('Error syncing favorite with Supabase:', result.error);
          }
        } catch (error) {
          console.error('Error syncing favorite with Supabase:', error);
        }
      },
      
      getFavoriteRecommendations: () => {
        const { recommendations, favoritesIds } = get();
        return recommendations.filter(rec => favoritesIds.includes(rec.id));
      },
      
      clearRecommendations: () => set({ 
        recommendations: [],
        lastGeneratedAt: null
      }),
      
      resetState: () => set((state) => ({
        userProfile: null,
        recommendations: [],
        isLoading: false,
        error: null,
        // Don't reset auth state
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
      })),
      
      clearStore: () => set((state) => ({
        ...initialState,
        // Preserve auth state and hydration state
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        hydrated: state.hydrated,
      })),
    }),
    {
      name: "vista-recommendations-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
      // Only persist non-sensitive data
      partialize: (state) => ({
        recommendations: state.recommendations,
        favoritesIds: state.favoritesIds,
        userProfile: state.userProfile,
        generationCount: state.generationCount,
        hasReachedGuestLimit: state.hasReachedGuestLimit,
        lastGeneratedAt: state.lastGeneratedAt,
        // Don't persist loading states
        isLoading: false,
        error: null,
      }),
    }
  )
);

export default useRecommendationsStore; 