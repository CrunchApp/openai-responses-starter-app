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
    hydrated
  } = useProfileStore();
  
  // Get reset function from recommendations store
  const { resetState: resetRecommendations } = useRecommendationsStore();
  
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

  // New function to handle profile saving and completion
  const saveAndCompleteProfile = async (isEditMode: boolean, userId?: string) => {
    try {
      // Get the vector store ID from localStorage (created during welcome step)
      const vectorStoreId = localStorage.getItem('userVectorStoreId');
      
      if (!vectorStoreId) {
        throw new Error("Vector store not found. Please restart the profile setup.");
      }
      
      // Store the profile data directly in localStorage for faster access
      localStorage.setItem('userProfileData', JSON.stringify(profileData));
      
      // If a userId is provided, save the profile to Supabase
      if (userId) {
        try {
          const response = await fetch('/api/profile/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              profileData: {
                ...profileData,
                vectorStoreId
              }
            }),
          });
          
          if (!response.ok) {
            console.error('Error saving profile to Supabase:', await response.text());
            // Continue with the local storage approach anyway
          } else {
            console.log('Profile saved to Supabase successfully');
          }
        } catch (error) {
          console.error('Error saving profile to Supabase:', error);
          // Continue with the local storage approach anyway
        }
      }
      
      // Save to our recommendation store for use in recommendation page
      const { setUserProfile } = useRecommendationsStore.getState();
      setUserProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        preferredName: profileData.preferredName,
        linkedInProfile: profileData.linkedInProfile,
        goal: profileData.education?.[0]?.degreeLevel || "Master's",
        desiredField: profileData.education?.[0]?.fieldOfStudy,
        education: profileData.education.map(edu => ({
          degreeLevel: edu.degreeLevel,
          institution: edu.institution,
          fieldOfStudy: edu.fieldOfStudy,
          graduationYear: edu.graduationYear,
          gpa: edu.gpa || null
        })),
        careerGoals: {
          shortTerm: profileData.careerGoals.shortTerm,
          longTerm: profileData.careerGoals.longTerm,
          desiredIndustry: profileData.careerGoals.desiredIndustry,
          desiredRoles: profileData.careerGoals.desiredRoles
        },
        skills: profileData.skills,
        preferences: {
          preferredLocations: profileData.preferences.preferredLocations,
          studyMode: profileData.preferences.studyMode,
          startDate: profileData.preferences.startDate,
          budgetRange: {
            min: profileData.preferences.budgetRange.min,
            max: profileData.preferences.budgetRange.max
          }
        },
        documents: {
          resume: profileData.documents.resume || null,
          transcripts: profileData.documents.transcripts || null,
          statementOfPurpose: profileData.documents.statementOfPurpose || null,
          otherDocuments: profileData.documents.otherDocuments || null
        },
        vectorStoreId,
        userId
      });
      
      // If in edit mode, delete the existing profile JSON file first
      if (isEditMode) {
        // Get the stored file ID for the profile JSON
        const profileFileId = localStorage.getItem('userProfileFileId');
        
        if (profileFileId) {
          console.log("Deleting existing profile file with ID:", profileFileId);
          
          // Delete the file using the delete_file API route
          const deleteResponse = await fetch(`/api/vector_stores/delete_file?file_id=${profileFileId}`, {
            method: "DELETE"
          });
          
          if (!deleteResponse.ok) {
            console.warn("Failed to delete existing profile file. Will create a new one anyway.");
          } else {
            console.log("Successfully deleted existing profile file");
          }
        }
      }
      
      // Create a JSON file with all profile data
      const profileJson = JSON.stringify(profileData, null, 2);
      const profileBlob = new Blob([profileJson], { type: "application/json" });
      const base64Content = await blobToBase64(profileBlob);
      
      // Upload profile data as a JSON file
      const fileObject = {
        name: "user_profile.json",
        content: base64Content,
      };
      
      const uploadResponse = await fetch("/api/vector_stores/upload_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileObject,
        }),
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload profile data");
      }
      
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      
      // Store the file ID in localStorage for future edits
      localStorage.setItem('userProfileFileId', fileId);
      
      // Add the file to the vector store
      const addFileResponse = await fetch("/api/vector_stores/add_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          vectorStoreId,
        }),
      });
      
      if (!addFileResponse.ok) {
        throw new Error("Failed to add file to vector store");
      }
      
      // Update our stores
      setVectorStoreId(vectorStoreId);
      setProfileComplete(true);
      
      // Store the vector store in global state for the AI assistant to use
      const { setVectorStore, setFileSearchEnabled } = useToolsStore.getState();
      setVectorStore({
        id: vectorStoreId,
        name: `${profileData.firstName} ${profileData.lastName}'s Profile`,
      });
      
      // Enable file search to use the vector store
      setFileSearchEnabled(true);
      
      // Make sure the profile data has the vector store ID
      handleProfileDataChange(prev => ({
        ...prev,
        vectorStoreId
      }));
      
      return vectorStoreId;
    } catch (error) {
      console.error("Error completing profile:", error);
      throw error;
    }
  };

  const handleComplete = async (userId?: string) => {
    try {
      // Save and complete the profile
      await saveAndCompleteProfile(isEditMode, userId);
      
      // Show completion message for non-edit mode
      if (!isEditMode) {
        setShowCompletionMessage(true);
    
    // Redirect to dashboard after a delay
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
      } else {
        // In edit mode, redirect immediately
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error in handleComplete:", error);
      alert("There was an error completing your profile. Please try again.");
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
        const cleanupResponse = await fetch(`/api/vector_stores/cleanup?vector_store_id=${vectorStoreId}`, {
          method: 'DELETE'
        });
        
        if (!cleanupResponse.ok) {
          console.error('Failed to clean up vector store:', cleanupResponse.statusText);
        } else {
          // Also clear the vector store from the tools store
          const { setVectorStore } = useToolsStore.getState();
          setVectorStore({
            id: "",
            name: "",
          });
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('userVectorStoreId');
      localStorage.removeItem('userProfileData');
      
      // Reset all the stores
      setStoredProfileData(null);
      resetRecommendations();
      setVectorStoreId(null);
      setProfileComplete(false);
      
      // Reset local state
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
      
      // Reset completed steps in store
      useProfileStore.setState(state => ({
        ...state,
        completedSteps: [0]
      }));
      
      // Redirect to welcome step
      router.push("/profile");
    } catch (error) {
      console.error('Error resetting profile:', error);
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
            {renderCurrentStep()}
          </AnimatePresence>

          {/* Navigation buttons */}
          {currentStep !== 0 && currentStep !== 1 && currentStep !== steps.length - 1 && (
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