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
import HydrationLoading from "@/components/ui/hydration-loading";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Define the degree level type
type DegreeLevel = "" | "High School" | "Associate's" | "Bachelor's" | "Master's" | "Doctorate" | "Certificate" | "Other";

// Define profile data structure
export interface ProfileData {
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredName: string;
  
  // LinkedIn profile information
  linkedInProfile?: string;
  
  // Education
  education: Array<{
    degreeLevel: DegreeLevel;
    institution: string;
    fieldOfStudy: string;
    graduationYear: string;
    gpa?: string;
  }>;
  
  // Career goals
  careerGoals: {
    shortTerm: string;
    longTerm: string;
    desiredIndustry: string[];
    desiredRoles: string[];
  };
  
  // Skills
  skills: string[];
  
  // Preferences
  preferences: {
    preferredLocations: string[];
    studyMode: string; // "Full-time" | "Part-time" | "Online" | "Hybrid"
    startDate: string;
    budgetRange: {
      min: number;
      max: number;
    };
  };
  
  // Documents
  documents: {
    resume?: string; // file ID
    transcripts?: string; // file ID
    statementOfPurpose?: string; // file ID
    otherDocuments?: string[]; // array of file IDs
  };
  
  // Vector store ID for this user's profile
  vectorStoreId?: string;
}

// Define interfaces for step props
export interface BaseStepProps {
  profileData: ProfileData;
  setProfileData: Dispatch<SetStateAction<ProfileData>>;
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
  
  // Refs to track initialization status
  const initializedRef = useRef(false);
  const localChangesRef = useRef(false);
  
  // Local state for animation and UI
  const [animationDirection, setAnimationDirection] = useState("forward");
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  
  // Add loading state for reset operation
  const [isResetting, setIsResetting] = useState(false);
  
  // Initialize local state with default values - will be updated after hydration
  const [profileData, setProfileData] = useState<ProfileData>({
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
  const handleProfileDataChange = (newProfileData: ProfileData | ((prev: ProfileData) => ProfileData)) => {
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

  const handleComplete = () => {
    // Show completion message
    setShowCompletionMessage(true);
    
    // Get vector store ID from localStorage
    const vectorStoreId = localStorage.getItem('userVectorStoreId');
    if (vectorStoreId) {
      setVectorStoreId(vectorStoreId);
      
      // Update the profile data with the vector store ID
      handleProfileDataChange(prev => ({
        ...prev,
        vectorStoreId
      }));
    }
    
    // Mark profile as complete
    setProfileComplete(true);
    
    // Redirect to recommendations after a delay
    setTimeout(() => {
      router.push("/recommendations");
    }, 2000);
  };

  // Add a reset function
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      // Get vector store ID from localStorage
      const vectorStoreId = localStorage.getItem('userVectorStoreId');
      
      // If vector store exists, clean it up via the API
      if (vectorStoreId) {
        // Show loading state or some indication of cleanup
        const cleanupResponse = await fetch(`/api/vector_stores/cleanup?vector_store_id=${vectorStoreId}`, {
          method: 'DELETE',
        });
        
        if (!cleanupResponse.ok) {
          console.error('Error cleaning up vector store:', await cleanupResponse.json());
        } else {
          console.log('Vector store cleaned up successfully');
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('userVectorStoreId');
      localStorage.removeItem('userProfileData');
      localStorage.removeItem('vista-profile-storage');
      
      // Reset the store state - important to reset completedSteps to prevent skipping
      setStoredProfileData(null);
      setStoredCurrentStep(0);
      setProfileComplete(false);
      setVectorStoreId(null);
      
      // Important: Reset the completedSteps to just [0]
      useProfileStore.setState({
        ...useProfileStore.getState(),
        completedSteps: [0]
      });
      
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
      
      // Set initialization flag to true since we're actively changing state
      initializedRef.current = true;
      localChangesRef.current = true;
      
      // Force reload to clear any other cached state
      window.location.reload();
    } catch (error) {
      console.error("Error resetting profile:", error);
      alert("There was an error resetting your profile. Please try again.");
      
      setIsResetting(false);
      
      // Force reload anyway to ensure a clean state
      window.location.reload();
    }
  };

  // Animation variants for step transitions
  const slideVariants = {
    enter: (direction: string) => ({
      x: direction === "forward" ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      x: direction === "forward" ? "-100%" : "100%",
      opacity: 0,
    }),
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

  const completionAnimation = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 500, damping: 20 } },
    exit: { opacity: 0, scale: 1.2, transition: { duration: 0.2 } }
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