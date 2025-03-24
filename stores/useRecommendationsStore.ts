import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { RecommendationProgram } from "@/app/recommendations/types";
import { UserProfile } from "@/app/types/profile-schema";

interface RecommendationsState {
  // Recommendations data
  recommendations: RecommendationProgram[];
  favoritesIds: string[];
  userProfile: UserProfile | null;
  
  // Hydration state
  hydrated: boolean;
  setHydrated: (state: boolean) => void;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastGeneratedAt: number | null;
  generationCount: number;
  
  // Methods
  setRecommendations: (recommendations: RecommendationProgram[]) => void;
  addRecommendation: (recommendation: RecommendationProgram) => void;
  toggleFavorite: (recommendationId: string) => void;
  addToFavorites: (recommendationId: string) => void;
  removeFromFavorites: (recommendationId: string) => void;
  setUserProfile: (userProfile: UserProfile) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  incrementGenerationCount: () => void;
  
  // Get favorite recommendations
  getFavoriteRecommendations: () => RecommendationProgram[];
  
  // Reset state
  clearRecommendations: () => void;
  resetState: () => void;
}

// Default initial state for the store
const initialState = {
  recommendations: [],
  favoritesIds: [],
  userProfile: null,
  isLoading: false,
  error: null,
  lastGeneratedAt: null,
  generationCount: 0,
  hydrated: false,
};

const useRecommendationsStore = create<RecommendationsState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setHydrated: (state) => set({ hydrated: state }),
      
      setRecommendations: (recommendations) => set({ 
        recommendations,
        lastGeneratedAt: Date.now(),
        isLoading: false
      }),
      
      addRecommendation: (recommendation) => set((state) => ({
        recommendations: [...state.recommendations, recommendation]
      })),
      
      toggleFavorite: (recommendationId) => set((state) => {
        if (state.favoritesIds.includes(recommendationId)) {
          return { 
            favoritesIds: state.favoritesIds.filter(id => id !== recommendationId),
            recommendations: state.recommendations.map(rec => 
              rec.id === recommendationId ? { ...rec, isFavorite: false } : rec
            )
          };
        } else {
          return { 
            favoritesIds: [...state.favoritesIds, recommendationId],
            recommendations: state.recommendations.map(rec => 
              rec.id === recommendationId ? { ...rec, isFavorite: true } : rec
            )
          };
        }
      }),
      
      addToFavorites: (recommendationId) => set((state) => {
        if (state.favoritesIds.includes(recommendationId)) return state;
        return { 
          favoritesIds: [...state.favoritesIds, recommendationId],
          recommendations: state.recommendations.map(rec => 
            rec.id === recommendationId ? { ...rec, isFavorite: true } : rec
          )
        };
      }),
      
      removeFromFavorites: (recommendationId) => set((state) => ({
        favoritesIds: state.favoritesIds.filter(id => id !== recommendationId),
        recommendations: state.recommendations.map(rec => 
          rec.id === recommendationId ? { ...rec, isFavorite: false } : rec
        )
      })),
      
      setUserProfile: (userProfile) => set({ userProfile }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error, isLoading: false }),
      
      incrementGenerationCount: () => set((state) => ({ 
        generationCount: state.generationCount + 1 
      })),
      
      getFavoriteRecommendations: () => {
        const { recommendations, favoritesIds } = get();
        return recommendations.filter(rec => favoritesIds.includes(rec.id));
      },
      
      clearRecommendations: () => set({ 
        recommendations: [],
        lastGeneratedAt: null
      }),
      
      resetState: () => set(initialState),
    }),
    {
      name: "vista-recommendations-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

export default useRecommendationsStore; 