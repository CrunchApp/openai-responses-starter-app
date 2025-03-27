"use client";
import React, { useState, useEffect, Dispatch, SetStateAction, ComponentType, useRef } from "react";
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

export default function ProfileWizard({ isEditMode = false }: ProfileWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  // Get state from our centralized store
  const { 
    profileData: storedProfileData, 
    setProfileData: setStoredProfileData,
    currentStep: storedCurrentStep,
    setCurrentStep: setStoredCurrentStep,
    completedSteps: storedCompletedSteps,
    addCompletedStep,
    setProfileComplete,
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
  
  // Refs to track initialization status
  const initializedRef = useRef(false);
  const localChangesRef = useRef(false);
  
  // Local state for animation and UI
  const [animationDirection, setAnimationDirection] = useState("forward");
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  
  // Add loading state for reset operation
  const [isResetting, setIsResetting] = useState(false);
  
  // Initialize local state with default values - will be updated after hydration
  const [profileData, setProfileData] = useState<UserProfile>({
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
  });
  
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [canNavigateToStep, setCanNavigateToStep] = useState<number[]>([0]);
  const [isCompleting, setIsCompleting] = useState(false);

  // Single effect to handle hydration and initialization
  useEffect(() => {
    // Only run this effect after hydration and only once
    if (hydrated && !initializedRef.current) {
      initializedRef.current = true;
      
      // Initialize local state from persisted store state
      if (storedCurrentStep !== undefined && storedCurrentStep !== null) {
        setCurrentStep(storedCurrentStep);
      }
      
      if (storedCompletedSteps && storedCompletedSteps.length > 0) {
        setCanNavigateToStep(storedCompletedSteps);
      }
      
      if (storedProfileData) {
        setProfileData(storedProfileData);
      }
    }
  }, [hydrated, storedCurrentStep, storedCompletedSteps, storedProfileData]);

  // Custom wrapper for setProfileData that tracks local changes
  const handleProfileDataChange = (newProfileData: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    setProfileData((prev) => {
      const updated = typeof newProfileData === 'function' ? newProfileData(prev) : newProfileData;
      
      // Mark as locally changed if component is already initialized
      if (initializedRef.current) {
        localChangesRef.current = true;
      }
      
      return updated;
    });
  };

  // Custom wrapper for setCurrentStep that tracks local changes
  const handleCurrentStepChange = (newStep: number) => {
    setCurrentStep(newStep);
    
    // Mark as locally changed if component is already initialized
    if (initializedRef.current) {
      localChangesRef.current = true;
    }
  };

  // Separate effect to update the store when local state changes
  useEffect(() => {
    // Only sync back to store if component is initialized and there are local changes
    if (hydrated && initializedRef.current && localChangesRef.current) {
      setStoredProfileData(profileData);
      setStoredCurrentStep(currentStep);
      
      // Reset the local changes flag
      localChangesRef.current = false;
    }
  }, [profileData, currentStep, hydrated, setStoredProfileData, setStoredCurrentStep]);

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
    if (currentStep < steps.length - 1) {
      setAnimationDirection("forward");
      
      // Add current step to completed steps if not already included
      if (!canNavigateToStep.includes(currentStep)) {
        setCanNavigateToStep([...canNavigateToStep, currentStep]);
        addCompletedStep(currentStep);
      }
      
      // Add next step to completed steps if not already included
      if (!canNavigateToStep.includes(currentStep + 1)) {
        setCanNavigateToStep([...canNavigateToStep, currentStep + 1]);
        addCompletedStep(currentStep + 1);
      }
      
      // Use the custom setter to track local changes
      handleCurrentStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setAnimationDirection("backward");
      // Use the custom setter to track local changes
      handleCurrentStepChange(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (canNavigateToStep.includes(stepIndex)) {
      setAnimationDirection(stepIndex > currentStep ? "forward" : "backward");
      // Use the custom setter to track local changes
      handleCurrentStepChange(stepIndex);
    }
  };

  // Modified function to handle profile saving and completion based on userId
  const saveAndCompleteProfile = async (isEdit: boolean, userId?: string) => {
    setIsCompleting(true);
    let finalVectorStoreId: string | null = localStorage.getItem('userVectorStoreId'); // Explicitly type as string | null

    try {
      // 1. Ensure Vector Store Exists (Create if missing - might happen on reset/error)
      if (!finalVectorStoreId) {
         console.log("No Vector Store ID found, creating one...");
         const vsResponse = await fetch("/api/vector_stores/create_store", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ name: `${profileData.firstName} ${profileData.lastName}'s Profile Store` }),
         });
         if (!vsResponse.ok) throw new Error("Failed to create vector store");
         const vsData = await vsResponse.json();
         if (!vsData.id || typeof vsData.id !== 'string') { // Add check for valid ID
            throw new Error("Created vector store but received an invalid ID.");
         }
         finalVectorStoreId = vsData.id;
         console.log("Created new Vector Store ID:", finalVectorStoreId);
      }

      // Ensure finalVectorStoreId is a string before proceeding
      if (!finalVectorStoreId) {
        throw new Error("Vector Store ID is missing after check/creation.");
      }
      const guaranteedVectorStoreId = finalVectorStoreId; // Use this guaranteed string version

      // Set localStorage item *here* using the guaranteed string ID
      localStorage.setItem('userVectorStoreId', guaranteedVectorStoreId);

      // Update profileData with the vectorStoreID before saving
      const profileToSave: UserProfile = { // Ensure type matches UserProfile
        ...profileData,
        vectorStoreId: guaranteedVectorStoreId // Assign the guaranteed string
      };

      // 2. Save Profile JSON to Vector Store (Common to both paths)
      // Delete existing file if in edit mode and file ID exists
      const existingProfileFileId = localStorage.getItem('userProfileFileId');
      if (isEdit && existingProfileFileId) {
        console.log("Deleting existing profile file:", existingProfileFileId);
        await fetch(`/api/vector_stores/delete_file?file_id=${existingProfileFileId}`, { method: "DELETE" });
        // Ignore errors for deletion, proceed with upload
      }

      // Upload new profile JSON
      const profileJson = JSON.stringify(profileToSave, null, 2);
      const profileBlob = new Blob([profileJson], { type: "application/json" });
      const base64Content = await blobToBase64(profileBlob);
      const fileObject = { name: "user_profile.json", content: base64Content };
      
      const uploadResponse = await fetch("/api/vector_stores/upload_file", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileObject }),
      });
      if (!uploadResponse.ok) throw new Error("Failed to upload profile JSON");
      const uploadData = await uploadResponse.json();
      const newFileId = uploadData.id;
      localStorage.setItem('userProfileFileId', newFileId); // Store new file ID
      
      // Add file to vector store
      const addFileResponse = await fetch("/api/vector_stores/add_file", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: newFileId, vectorStoreId: guaranteedVectorStoreId }), // Use guaranteed ID
      });
      if (!addFileResponse.ok) throw new Error("Failed to add profile file to vector store");
      console.log("Profile JSON saved to Vector Store, File ID:", newFileId);


      // --- Path-Specific Logic ---
      if (userId) {
        // --- PATH A (Signed Up User) ---
        console.log("Path A: Saving profile to Supabase for user:", userId);
        // 3a. Save profile to Supabase (using upsert logic via the API)
        const saveDbResponse = await fetch('/api/profile/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, profileData: profileToSave }), // profileToSave now matches UserProfile type
        });
        if (!saveDbResponse.ok) {
          console.error('Error saving profile to Supabase:', await saveDbResponse.text());
          throw new Error("Failed to save profile to database.");
        }
        console.log('Profile saved to Supabase successfully');

        // 4a. Clear Local State/Storage for Wizard & Guest
        clearProfileWizardStore();
        clearRecommendationsStore();
        localStorage.removeItem('userProfileData');
        localStorage.removeItem('profile-storage'); // Ensure this matches the persist key
        localStorage.removeItem('userVectorStoreId');
        localStorage.removeItem('userProfileFileId');
        console.log("Cleared local stores and storage for registered user.");

        // 5a. Update Tool Store (though maybe dashboard does this?)
      const { setVectorStore, setFileSearchEnabled } = useToolsStore.getState();
        setVectorStore({ id: guaranteedVectorStoreId, name: `${profileToSave.firstName} ${profileToSave.lastName}'s Profile` }); // Use guaranteed ID
      setFileSearchEnabled(true);
      
      } else {
        // --- PATH B (Guest User) ---
        console.log("Path B: Saving profile locally for guest.");
        // 3b. Save profile to Recommendations Store (for guest recommendations)
        setRecommendationsUserProfile(profileToSave); // profileToSave now matches UserProfile type

        // 4b. Save profile to Local Storage (for guest persistence)
        localStorage.setItem('userProfileData', JSON.stringify(profileToSave));

        // 5b. Update Zustand wizard store (profile is complete, store VS ID)
        setVectorStoreId(guaranteedVectorStoreId); // Use guaranteed ID
        setProfileComplete(true);
        setStoredProfileData(profileToSave); // profileToSave now matches UserProfile type

         // 6b. Update Tool Store for guest session
         const { setVectorStore: guestSetVectorStore, setFileSearchEnabled: guestSetFileSearchEnabled } = useToolsStore.getState();
         guestSetVectorStore({ id: guaranteedVectorStoreId, name: `Guest Profile Store` }); // Use guaranteed ID
         guestSetFileSearchEnabled(true);
         console.log("Profile saved locally for guest.");
      }

      return guaranteedVectorStoreId; // Return the guaranteed string ID

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
      
      // Get the vector store ID
      const vectorStoreId = localStorage.getItem('userVectorStoreId');
      
      // First clean up the vector store and uploaded files
      if (vectorStoreId) {
        try { // Wrap cleanup in try/catch to ensure rest of reset runs
        const cleanupResponse = await fetch(`/api/vector_stores/cleanup?vector_store_id=${vectorStoreId}`, {
          method: 'DELETE'
        });
        
        if (!cleanupResponse.ok) {
          console.error('Failed to clean up vector store:', cleanupResponse.statusText);
            // Optionally alert the user or log more details
        } else {
            console.log("Vector store cleanup successful for:", vectorStoreId);
          // Also clear the vector store from the tools store
            const { setVectorStore, setFileSearchEnabled } = useToolsStore.getState();
            setVectorStore({ id: "", name: "" });
            setFileSearchEnabled(false); // Also disable file search
          }
        } catch (cleanupError) {
           console.error("Error during vector store cleanup:", cleanupError);
           // Decide if this error should prevent the rest of the reset
        }
      }

      // Clear localStorage items related to the profile/wizard
      localStorage.removeItem('userVectorStoreId');
      localStorage.removeItem('userProfileFileId');
      localStorage.removeItem('userProfileData'); // Guest profile data
      localStorage.removeItem('vista-profile-storage'); // Zustand profile store persistence key
      localStorage.removeItem('vista-recommendations-storage'); // Zustand recommendations store persistence key

      // Reset Zustand stores using their respective actions
      clearProfileWizardStore(); // Use the specific clear action
      clearRecommendationsStore(); // Use the specific clear action

      // Reset local component state (redundant if stores are cleared correctly, but safe)
      setProfileData({
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
      });
      setCurrentStep(0);
      setCanNavigateToStep([0]);
      initializedRef.current = false; // Reset initialization flag
      localChangesRef.current = false; // Reset local changes flag

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
    const CurrentStepComponent = steps[currentStep].component;
    const props: any = {
      profileData,
      // Use the custom setter to track local changes
      setProfileData: handleProfileDataChange,
    };

    if (currentStep === 0) {
      // For welcome step
      props.onComplete = handleNext;
    } else if (currentStep === 1) {
      // For import options step
      props.onComplete = handleNext;
    } else if (currentStep === steps.length - 1) {
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
                        canNavigateToStep.includes(idx) 
                          ? "cursor-pointer hover:opacity-80 transition-opacity" 
                          : "cursor-not-allowed opacity-70"
                      }`}
                      onClick={() => handleStepClick(idx)}
                    >
                      <motion.div 
                        whileHover={canNavigateToStep.includes(idx) ? { scale: 1.1 } : {}}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          idx < currentStep 
                            ? "bg-green-500 text-white ring-2 ring-offset-2 ring-green-200"
                            : idx === currentStep
                              ? "bg-blue-600 text-white ring-2 ring-offset-2 ring-blue-200"
                              : canNavigateToStep.includes(idx)
                                ? "bg-gray-200 text-gray-700 ring-2 ring-offset-2 ring-gray-100"
                                : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {idx < currentStep ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </motion.div>
                      <span className={`text-xs mt-2 hidden md:block ${
                        idx === currentStep ? "font-medium text-blue-700" : ""
                      }`}>
                        {step.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{step.description}</p>
                    {!canNavigateToStep.includes(idx) && idx > 0 && (
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
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
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
          {!isCompleting && currentStep !== 0 && currentStep !== 1 && currentStep !== steps.length - 1 && (
            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
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