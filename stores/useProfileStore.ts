import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserProfile } from "@/app/types/profile-schema";

// Initial profile data default state
const initialProfileData: UserProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  preferredName: "",
  linkedInProfile: "",
  currentLocation: "",
  nationality: "",
  targetStudyLevel: "__NONE__",
  languageProficiency: [],
  education: [{ degreeLevel: "__NONE__", institution: "", fieldOfStudy: "", graduationYear: "" }],
  careerGoals: {
    shortTerm: "",
    longTerm: "",
    achievements: "",
    desiredIndustry: [],
    desiredRoles: [],
  },
  skills: [],
  preferences: {
    preferredLocations: [],
    studyMode: "Full-time",
    startDate: "",
    budgetRange: {
      min: 0,
      max: 100000,
    },
    preferredDuration: { min: undefined, max: undefined, unit: undefined },
    preferredStudyLanguage: "",
    livingExpensesBudget: { min: undefined, max: undefined, currency: "USD" },
    residencyInterest: false,
  },
  documents: {},
};

interface ProfileState {
  // Profile data and completion status
  profileData: UserProfile | null;
  isProfileComplete: boolean;
  currentStep: number;
  completedSteps: number[];
  
  // Hydration state
  hydrated: boolean;
  setHydrated: (state: boolean) => void;
  
  // Methods to update state
  setProfileData: (data: UserProfile | null) => void;
  updateProfileData: (data: Partial<UserProfile>) => void;
  setProfileComplete: (isComplete: boolean) => void;
  setCurrentStep: (step: number) => void;
  addCompletedStep: (step: number) => void;
  
  // Vector store integration
  vectorStoreId: string | null;
  setVectorStoreId: (id: string | null) => void;
  
  // Reset state
  resetProfile: () => void;
  
  // New Clear Action
  clearStore: () => void;
}

// Define the initial state structure for clarity
const profileInitialState = {
  profileData: null,
  isProfileComplete: false,
  currentStep: 0,
  completedSteps: [0],
  vectorStoreId: null,
  hydrated: false,
};

const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...profileInitialState, // Initialize with the default state

      setHydrated: (state) => set({ hydrated: state }),
      
      setProfileData: (data) => set({ profileData: data }),
      
      updateProfileData: (data) => 
        set((state) => ({
          profileData: state.profileData 
            ? { ...state.profileData, ...data } 
            : { ...initialProfileData, ...data }
        })),
      
      setProfileComplete: (isComplete) => set({ isProfileComplete: isComplete }),
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      addCompletedStep: (step) => 
        set((state) => ({
          completedSteps: state.completedSteps.includes(step) 
            ? state.completedSteps 
            : [...state.completedSteps, step]
        })),
      
      setVectorStoreId: (id) => set({ vectorStoreId: id }),
      
      resetProfile: () => set((state) => ({ // Keep resetProfile for potential specific use cases? Or remove if clearStore covers it.
        ...profileInitialState, // Use initial state
        hydrated: state.hydrated // Preserve hydration
      })),
      
      // Updated Clear Action
      clearStore: () => {
        set((state) => ({
            ...profileInitialState, // Reset everything to initial defaults
            hydrated: state.hydrated, // Preserve only hydration status
        }));
        // Explicitly remove potentially lingering localStorage items managed outside the store's persistence
        localStorage.removeItem('userVectorStoreId');
        localStorage.removeItem('userProfileFileId');
        localStorage.removeItem('userProfileData'); // Remove guest profile data too
      },
    }),
    {
      name: "vista-profile-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
      // Partialize might be needed if sensitive data is ever added,
      // but for now, clearing explicitly on logout is the primary fix.
      // partialize: (state) => ({ ... }),
    }
  )
);

export default useProfileStore; 