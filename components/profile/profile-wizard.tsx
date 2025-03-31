"use client";
import React, { useState, useEffect, Dispatch, SetStateAction, ComponentType, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PersonalInfoStep from "./steps/personal-info-step";
import EducationStep from "./steps/education-step";
import CareerGoalsStep from "./steps/career-goals-step";
import PreferencesStep from "./steps/preferences-step";
import ReviewStep from "./steps/review-step";
import WelcomeStep from "./steps/welcome-step";
import ImportOptionsStep from "./steps/import-options-step";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Info, Trash2, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useProfileStore from "@/stores/useProfileStore";
import useRecommendationsStore from "@/stores/useRecommendationsStore";
import HydrationLoading from "@/components/ui/hydration-loading";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import useToolsStore from "@/stores/useToolsStore";
import { UserProfile, ProfileSchema } from "@/app/types/profile-schema";
import { useAuth } from "@/app/components/auth/AuthContext";

// Helper function to convert a Blob to a base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/json;base64,")
      const base64Content = base64.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
    reader.readAsDataURL(blob);
  });
};

// Define the degree level type for backward compatibility
type DegreeLevel = "" | "High School" | "Associate's" | "Bachelor's" | "Master's" | "Doctorate" | "Certificate" | "Other";

// Re-export the UserProfile type for components to use
export type { UserProfile };

// Define interfaces for step props
export interface BaseStepProps {
  profileData: UserProfile;
  setProfileData: Dispatch<SetStateAction<UserProfile>>;
}

export interface WelcomeStepProps extends BaseStepProps {
  onComplete: () => void;
}

export interface ImportOptionsStepProps extends BaseStepProps {
  onComplete: () => void;
}

export interface LinkedInImportStepProps extends BaseStepProps {
  onManualEntry: () => void;
}

export interface ReviewStepProps extends BaseStepProps {
  onComplete: () => void;
  isEditMode?: boolean;
}

// Define the step structure with proper typing
interface Step {
  name: string;
  icon?: string;
  description: string;
  component: ComponentType<any>;
}

interface ProfileWizardProps {
  isEditMode?: boolean;
}

// Define the initial profile data
const initialProfileData: UserProfile = {
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

export default function ProfileWizard({ isEditMode = false }: ProfileWizardProps) {
  const router = useRouter();
  const { user, vectorStoreId: authVectorStoreId, refreshSession } = useAuth();
  
  // Get state from our centralized store
  const { 
    profileData: storedProfileData, 
    setProfileData: setStoredProfileData,
    currentStep: storedCurrentStep,
    setCurrentStep: setStoredCurrentStep,
    completedSteps: storedCompletedSteps,
    addCompletedStep,
    setProfileComplete,
    vectorStoreId: profileStoreVectorStoreId,
    setVectorStoreId,
    clearStore: clearProfileWizardStore,
    hydrated
  } = useProfileStore();
  
  // Get reset function from recommendations store
  const { 
    setUserProfile: setRecommendationsUserProfile,
    clearStore: clearRecommendationsStore,
    resetState: resetRecommendations
  } = useRecommendationsStore();
  
  // Local state for animation and UI
  const [animationDirection, setAnimationDirection] = useState("forward");
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // For profile data, we still maintain a local copy for editing performance
  // but we initialize it from the store when hydrated
  const [profileData, setProfileData] = useState<UserProfile>(initialProfileData);
  
  // Effect to update profile data after hydration - improved to avoid loops
  useEffect(() => {
    // Only run this effect for initial hydration or when store data changes significantly
    if (hydrated && storedProfileData) {
      try {
        // Skip if we're already in the process of completing or resetting
        if (isCompleting || isResetting) return;

        // Compare with deep equality
        const currentStr = JSON.stringify(profileData);
        const storedStr = JSON.stringify(storedProfileData);
        
        // Only update local state if there's a meaningful difference
        if (currentStr !== storedStr) {
          // Check if this is first hydration or just initialProfileData
          const isInitialData = currentStr === JSON.stringify(initialProfileData);
          
          if (isInitialData || Object.keys(profileData).length === 0) {
            console.log("Hydrating profile data from store");
            setProfileData(storedProfileData);
          }
        }
      } catch (error) {
        console.error("Error in hydration effect:", error);
      }
    }
  }, [hydrated, storedProfileData, isCompleting, isResetting]);

  // Removed the problematic useEffect that was causing the infinite update loop
  // and replacing with a more controlled approach
  const prevProfileDataRef = useRef<UserProfile | null>(null);
  
  // Manual sync function to explicitly update store
  const syncProfileToStore = useCallback(() => {
    // Skip sync if we're in completion or reset mode
    if (isCompleting || isResetting) return;
    
    try {
      // Simple deep equality check
      const currentProfileDataStr = JSON.stringify(profileData);
      const storedProfileDataStr = JSON.stringify(storedProfileData);
      
      if (currentProfileDataStr !== storedProfileDataStr) {
        // Update ref before updating store to prevent loop
        prevProfileDataRef.current = { ...profileData };
        
        // Use a microtask to defer the update
        Promise.resolve().then(() => {
          setStoredProfileData(profileData);
        });
      }
    } catch (error) {
      console.error("Error syncing profile data:", error);
    }
  }, [profileData, storedProfileData, setStoredProfileData, isCompleting, isResetting]);

  // Updated profile data change handler that doesn't trigger an update loop
  const handleProfileDataChange = (newProfileData: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    setProfileData((prev) => {
      const updated = typeof newProfileData === 'function' ? newProfileData(prev) : newProfileData;
      return updated;
    });
    
    // Store the latest value in ref - we'll use this to avoid unnecessary store updates
    prevProfileDataRef.current = typeof newProfileData === 'function' 
      ? newProfileData(prevProfileDataRef.current || profileData)
      : newProfileData;
  };

  const steps: Step[] = [
    {
      name: "Welcome",
      description: "Let's get started with Vista",
      component: WelcomeStep
    },
    {
      name: "Profile Import",
      description: "Tell Vista about yourself",
      component: ImportOptionsStep
    },
    { 
      name: "Personal Information", 
      description: "Basic personal details", 
      component: PersonalInfoStep 
    },
    { 
      name: "Education", 
      description: "Your educational background", 
      component: EducationStep 
    },
    { 
      name: "Career Goals", 
      description: "Your professional aspirations", 
      component: CareerGoalsStep 
    },
    { 
      name: "Preferences", 
      description: "Program preferences", 
      component: PreferencesStep
    },
    { 
      name: "Review", 
      description: "Review your profile", 
      component: ReviewStep 
    }
  ];

  const handleNext = () => {
    if (storedCurrentStep < steps.length - 1) {
      setAnimationDirection("forward");
      
      // Add current step to completed steps if not already included
      if (!storedCompletedSteps.includes(storedCurrentStep)) {
        addCompletedStep(storedCurrentStep);
      }
      
      // Add next step to completed steps if not already included
      if (!storedCompletedSteps.includes(storedCurrentStep + 1)) {
        addCompletedStep(storedCurrentStep + 1);
      }
      
      // Explicitly sync profile data to store before changing steps
      syncProfileToStore();
      
      // Update step in store directly
      setStoredCurrentStep(storedCurrentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (storedCurrentStep > 0) {
      setAnimationDirection("backward");
      
      // Explicitly sync profile data to store before changing steps
      syncProfileToStore();
      
      // Update step in store directly
      setStoredCurrentStep(storedCurrentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (storedCompletedSteps.includes(stepIndex)) {
      setAnimationDirection(stepIndex > storedCurrentStep ? "forward" : "backward");
      
      // Explicitly sync profile data to store before changing steps
      syncProfileToStore();
      
      // Update step in store directly
      setStoredCurrentStep(stepIndex);
    }
  };

  // Modified function to handle profile saving and completion based on userId
  const saveAndCompleteProfile = async (isEdit: boolean, userId?: string) => {
    setIsCompleting(true);
    
    try {
      // Make sure we have the latest profile data in the store before saving
      syncProfileToStore();
      
      // Log vector store IDs for debugging
      console.log("Vector Store IDs:", {
        profileStoreVectorStoreId,
        authVectorStoreId,
        isAuth: !!userId
      });
      
      // FIXED: Always prefer profileStoreVectorStoreId if it exists, regardless of auth status
      // This fixes the issue where vectorStoreId is lost during signup
      let finalVectorStoreId: string | null = profileStoreVectorStoreId || (userId ? authVectorStoreId : null);

      // Ensure there's a vector store ID available
      if (!finalVectorStoreId) {
        throw new Error("No vector store ID found. Please complete the welcome step first.");
      }

      console.log("Using vector store ID:", finalVectorStoreId);

      // Ensure finalVectorStoreId is a string before proceeding
      const guaranteedVectorStoreId = finalVectorStoreId;

      // Delete existing file if in edit mode and profile has a file ID
      if (isEdit && profileData.profileFileId) {
        console.log("Deleting existing profile file:", profileData.profileFileId);
        await fetch(`/api/vector_stores/delete_file?file_id=${profileData.profileFileId}`, { method: "DELETE" });
        // Ignore errors for deletion, proceed with upload
      }

      // Upload new profile JSON
      const profileJson = JSON.stringify(profileData, null, 2);
      const profileBlob = new Blob([profileJson], { type: "application/json" });
      const base64Content = await blobToBase64(profileBlob);
      const fileObject = { name: "user_profile.json", content: base64Content };
      
      const uploadResponse = await fetch("/api/vector_stores/upload_file", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileObject }),
      });
      if (!uploadResponse.ok) throw new Error("Failed to upload profile JSON");
      const uploadData = await uploadResponse.json();
      const newFileId = uploadData.id;
      
      // Add file to vector store
      const addFileResponse = await fetch("/api/vector_stores/add_file", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: newFileId, vectorStoreId: guaranteedVectorStoreId }),
      });
      if (!addFileResponse.ok) throw new Error("Failed to add profile file to vector store");
      console.log("Profile JSON saved to Vector Store, File ID:", newFileId);

      // Update profileData with the vectorStoreID and file ID before saving
      const profileToSave: UserProfile = {
        ...profileData,
        vectorStoreId: guaranteedVectorStoreId,
        profileFileId: newFileId
      };

      // --- Path-Specific Logic ---
      if (userId) {
        // --- PATH A (Signed Up User) ---
        console.log("Path A: Saving profile to Supabase for user:", userId);
        // 3a. Save profile to Supabase (using upsert logic via the API)
        const saveDbResponse = await fetch('/api/profile/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, profileData: profileToSave }),
        });
        if (!saveDbResponse.ok) {
          console.error('Error saving profile to Supabase:', await saveDbResponse.text());
          throw new Error("Failed to save profile to database.");
        }
        console.log('Profile saved to Supabase successfully');
        
        // 4a. Refresh session to get updated profile (including vector store ID) from database
        await refreshSession();

        // 5a. Clear local guest state/storage
        clearProfileWizardStore();
        clearRecommendationsStore();
        localStorage.removeItem('userProfileData');
        console.log("Cleared local stores and storage for registered user.");
      } else {
        // --- PATH B (Guest User) ---
        console.log("Path B: Saving profile locally for guest.");
        
        // 3b. Save profile to Recommendations Store (for guest recommendations)
        setRecommendationsUserProfile(profileToSave);

        // 4b. Save profile to Local Storage (for guest persistence)
        localStorage.setItem('userProfileData', JSON.stringify(profileToSave));

        // 5b. Update Zustand wizard store (profile is complete)
        setProfileComplete(true);
        setStoredProfileData(profileToSave);

        // 6b. Update Tool Store for guest session
        const { setVectorStore, setFileSearchEnabled } = useToolsStore.getState();
        setVectorStore({ id: guaranteedVectorStoreId, name: `Guest Profile Store` });
        setFileSearchEnabled(true);
        console.log("Profile saved locally for guest.");
      }

      return guaranteedVectorStoreId;
    } catch (error) {
      console.error("Error completing profile:", error);
      // Rethrow the original error after logging
      throw error;
    } finally {
      setIsCompleting(false);
    }
  };

  // Modified handleComplete to manage redirection
  const handleComplete = async (userId?: string) => {
    try {
      await saveAndCompleteProfile(isEditMode, userId);
      
      if (userId) {
        // PATH A: Redirect to Dashboard
        console.log("Redirecting registered user to dashboard...");
      router.push("/dashboard");
      } else {
        // PATH B: Redirect Guest to Recommendations (or other guest page)
        console.log("Redirecting guest user to recommendations...");
        router.push("/recommendations");
      }

    } catch (error) {
      console.error("Error in handleComplete:", error);
      // Type assertion for error message
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred. Please try again.';
      alert(`There was an error saving your profile: ${errorMessage}`);
      // No need to call setIsCompleting(false) here, as it's handled in the finally block of saveAndCompleteProfile
    }
  };

  // Add a reset function
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      // Get the vector store ID from the right source
      const vectorStoreId = user ? authVectorStoreId : profileStoreVectorStoreId;
      
      // First clean up the vector store and uploaded files
      if (vectorStoreId) {
        try { // Wrap cleanup in try/catch to ensure rest of reset runs
          const cleanupResponse = await fetch(`/api/vector_stores/cleanup?vector_store_id=${vectorStoreId}`, {
            method: 'DELETE'
          });
          
          if (!cleanupResponse.ok) {
            console.error('Failed to clean up vector store:', cleanupResponse.statusText);
          } else {
            console.log("Vector store cleanup successful for:", vectorStoreId);
            // Also clear the vector store from the tools store
            const { setVectorStore, setFileSearchEnabled } = useToolsStore.getState();
            setVectorStore({ id: "", name: "" });
            setFileSearchEnabled(false); // Also disable file search
          }
        } catch (cleanupError) {
           console.error("Error during vector store cleanup:", cleanupError);
        }
      }

      // Clear localStorage items related to the profile/wizard
      localStorage.removeItem('userProfileData'); // Guest profile data

      // Reset Zustand stores using their respective actions
      clearProfileWizardStore(); // Use the specific clear action
      clearRecommendationsStore(); // Use the specific clear action

      // Reset local component state
      setProfileData(initialProfileData);

      // Redirect to the start of the profile wizard (or home page)
      console.log("Profile reset complete, redirecting...");
      router.push("/profile-wizard"); // Go back to the wizard start page

    } catch (error) {
      console.error('Error resetting profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during reset.';
      alert(`Failed to reset profile: ${errorMessage}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Animation variants for the completion animation
  const completionAnimation = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 500, damping: 20 } },
    exit: { opacity: 0, scale: 1.2, transition: { duration: 0.2 } }
  };

  // Render the current step with proper typing
  const renderCurrentStep = () => {
    // Use store's currentStep value directly
    const CurrentStepComponent = steps[storedCurrentStep].component;
    const props: any = {
      profileData,
      setProfileData: handleProfileDataChange,
    };

    if (storedCurrentStep === 0) {
      // For welcome step
      props.onComplete = handleNext;
    } else if (storedCurrentStep === 1) {
      // For import options step
      props.onComplete = handleNext;
    } else if (storedCurrentStep === steps.length - 1) {
      // For review step
      props.onComplete = handleComplete;
      props.isEditMode = isEditMode;
    }

    return <CurrentStepComponent {...props} />;
  };

  // Prevent logged-in users from accessing the wizard directly
  useEffect(() => {
    if (hydrated && user && !isEditMode) {
      console.log("Logged-in user detected, redirecting from wizard to dashboard.");
      router.push('/dashboard');
    }
    // Allow guests or users in explicit edit mode (though edit mode for logged-in users should happen via dashboard)
  }, [hydrated, user, router, isEditMode]);

  // If not hydrated yet, show loading indicator
  if (!hydrated) {
    return <HydrationLoading />;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-4">
            {isEditMode ? "Update Your Profile" : "Create Your Profile"}
          </h1>
          <p className="text-zinc-600">
            {isEditMode 
              ? "Make changes to your profile to refine your education recommendations."
              : "Complete the steps below to set up your personal educational profile."
            }
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Your Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all your profile data and start over. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleReset} 
                className="bg-red-500 hover:bg-red-600"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Reset Everything"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="relative">
        {/* Step completion animation overlay */}
        <AnimatePresence>
          {showCompletionMessage && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center z-10 bg-white/70 backdrop-blur-sm rounded-lg"
              variants={completionAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {steps.map((step, idx) => (
              <TooltipProvider key={idx} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`flex flex-col items-center ${
                        storedCompletedSteps.includes(idx) 
                          ? "cursor-pointer hover:opacity-80 transition-opacity" 
                          : "cursor-not-allowed opacity-70"
                      }`}
                      onClick={() => handleStepClick(idx)}
                    >
                      <motion.div 
                        whileHover={storedCompletedSteps.includes(idx) ? { scale: 1.1 } : {}}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          idx < storedCurrentStep 
                            ? "bg-green-500 text-white ring-2 ring-offset-2 ring-green-200"
                            : idx === storedCurrentStep
                              ? "bg-blue-600 text-white ring-2 ring-offset-2 ring-blue-200"
                              : storedCompletedSteps.includes(idx)
                                ? "bg-gray-200 text-gray-700 ring-2 ring-offset-2 ring-gray-100"
                                : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {idx < storedCurrentStep ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </motion.div>
                      <span className={`text-xs mt-2 hidden md:block ${
                        idx === storedCurrentStep ? "font-medium text-blue-700" : ""
                      }`}>
                        {step.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{step.description}</p>
                    {!storedCompletedSteps.includes(idx) && idx > 0 && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center">
                        <Info className="h-3 w-3 mr-1" /> Complete previous steps first
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          <div className="relative max-w-xl mx-auto mt-4">
            <div className="absolute top-1/2 left-4 right-4 h-2 bg-gray-200 -translate-y-1/2 rounded-full" />
            <motion.div 
              className="absolute top-1/2 left-4 h-2 bg-blue-600 -translate-y-1/2 rounded-full"
              style={{ 
                width: `${(storedCurrentStep / (steps.length - 1)) * 100}%` 
              }}
              initial={{ width: 0 }}
              animate={{ 
                width: `${Math.max(0, Math.min(100, (storedCurrentStep / (steps.length - 1)) * 100))}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Main content */}
        <Card className="p-6 shadow-md">
          <AnimatePresence mode="wait" custom={animationDirection}>
            {/* Add loading overlay during completion */}
            {isCompleting ? (
              <div className="flex flex-col items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-4 text-zinc-600">Saving your profile...</p>
              </div>
            ) : (
              renderCurrentStep()
            )}
          </AnimatePresence>

          {/* Navigation buttons - Hide during completion */}
          {!isCompleting && storedCurrentStep !== 0 && storedCurrentStep !== 1 && storedCurrentStep !== steps.length - 1 && (
            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={storedCurrentStep === 0}
              >
                Previous
              </Button>
              <Button onClick={handleNext}>Continue</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 