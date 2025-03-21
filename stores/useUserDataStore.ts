import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { UserProfile, RecommendationProgram } from "@/app/recommendations/types";

interface UserDataState {
  // Profile data
  profileData: UserProfile | null;
  setProfileData: (data: UserProfile) => void;
  updateProfileData: (data: Partial<UserProfile>) => void;
  profileCompletionStep: number;
  setProfileCompletionStep: (step: number) => void;
  
  // Recommendations data
  recommendations: RecommendationProgram[];
  setRecommendations: (recommendations: RecommendationProgram[]) => void;
  favoriteRecommendations: string[]; // IDs of favorited recommendations
  toggleFavoriteRecommendation: (id: string) => void;
  
  // Cache control
  lastProfileUpdate: number;
  lastRecommendationsUpdate: number;
  clearProfileData: () => void;
  clearRecommendationsData: () => void;
  clearAllData: () => void;
}

// Simple storage implementation that handles SSR
const customStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(name);
    }
  }
};

// Create the store
const useUserDataStore = create<UserDataState>()(
  persist(
    (set) => ({
      // Profile data
      profileData: null,
      setProfileData: (data) => set({ 
        profileData: data,
        lastProfileUpdate: Date.now()
      }),
      updateProfileData: (data) => set((state) => ({
        profileData: state.profileData ? { ...state.profileData, ...data } : data as UserProfile,
        lastProfileUpdate: Date.now()
      })),
      profileCompletionStep: 0,
      setProfileCompletionStep: (step) => set({ profileCompletionStep: step }),
      
      // Recommendations data
      recommendations: [],
      setRecommendations: (recommendations) => set({
        recommendations,
        lastRecommendationsUpdate: Date.now()
      }),
      favoriteRecommendations: [],
      toggleFavoriteRecommendation: (id) => set((state) => {
        const favorites = state.favoriteRecommendations.includes(id)
          ? state.favoriteRecommendations.filter(favId => favId !== id)
          : [...state.favoriteRecommendations, id];
          
        // Also update favorite status in the recommendations array
        const updatedRecommendations = state.recommendations.map(rec => 
          rec.id === id 
            ? { ...rec, isFavorite: !rec.isFavorite } 
            : rec
        );
        
        return { 
          favoriteRecommendations: favorites,
          recommendations: updatedRecommendations
        };
      }),
      
      // Cache timestamps for invalidation
      lastProfileUpdate: 0,
      lastRecommendationsUpdate: 0,
      
      // Clear functions
      clearProfileData: () => set({ 
        profileData: null, 
        profileCompletionStep: 0,
        lastProfileUpdate: 0
      }),
      clearRecommendationsData: () => set({ 
        recommendations: [],
        favoriteRecommendations: [],
        lastRecommendationsUpdate: 0
      }),
      clearAllData: () => set({
        profileData: null,
        profileCompletionStep: 0,
        recommendations: [],
        favoriteRecommendations: [],
        lastProfileUpdate: 0,
        lastRecommendationsUpdate: 0
      }),
    }),
    {
      name: "user-data-store",
      storage: createJSONStorage(() => customStorage),
      // Let the components handle hydration
      skipHydration: true,
    }
  )
);

export default useUserDataStore; 