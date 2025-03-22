import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ProfileData } from "@/components/profile/profile-wizard";

// Initial profile data default state
const initialProfileData: ProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  preferredName: "",
  linkedInProfile: "",
  education: [{ degreeLevel: "", institution: "", fieldOfStudy: "", graduationYear: "" }],
  careerGoals: {
    shortTerm: "",
    longTerm: "",
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
  },
  documents: {},
};

interface ProfileState {
  // Profile data and completion status
  profileData: ProfileData | null;
  isProfileComplete: boolean;
  currentStep: number;
  completedSteps: number[];
  
  // Hydration state
  hydrated: boolean;
  setHydrated: (state: boolean) => void;
  
  // Methods to update state
  setProfileData: (data: ProfileData | null) => void;
  updateProfileData: (data: Partial<ProfileData>) => void;
  setProfileComplete: (isComplete: boolean) => void;
  setCurrentStep: (step: number) => void;
  addCompletedStep: (step: number) => void;
  
  // Vector store integration
  vectorStoreId: string | null;
  setVectorStoreId: (id: string | null) => void;
  
  // Reset state
  resetProfile: () => void;
}

const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profileData: null,
      isProfileComplete: false,
      currentStep: 0,
      completedSteps: [0],
      vectorStoreId: null,
      hydrated: false,
      
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
      
      resetProfile: () => set({
        profileData: null,
        isProfileComplete: false,
        currentStep: 0,
        completedSteps: [0],
        vectorStoreId: null,
        hydrated: true
      }),
    }),
    {
      name: "vista-profile-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

export default useProfileStore; 