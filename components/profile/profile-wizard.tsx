"use client";
import React, { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction, ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LinkedInImportStep from "./steps/linkedin-import-step";
import PersonalInfoStep from "./steps/personal-info-step";
import EducationStep from "./steps/education-step";
import CareerGoalsStep from "./steps/career-goals-step";
import PreferencesStep from "./steps/preferences-step";
import DocumentsStep from "./steps/documents-step";
import ReviewStep from "./steps/review-step";
import WelcomeStep from "./steps/welcome-step";
import ImportOptionsStep from "./steps/import-options-step";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useUserDataStore from "@/stores/useUserDataStore";
import { UserProfile } from "@/app/recommendations/types";

// Define the degree level type
type DegreeLevel = "" | "High School" | "Associate's" | "Bachelor's" | "Master's" | "Doctorate" | "Certificate" | "Other";

  // Define profile dat  a structure
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

export default function ProfileWizard() {
  const router = useRouter();
  
  // Use refs to avoid circular updates
  const initialized = useRef(false);
  
  // Define steps
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
      description: "Tell us about yourself",
      component: PersonalInfoStep 
    },
    { 
      name: "Education", 
      description: "Your academic background",
      component: EducationStep 
    },
    { 
      name: "Career Goals", 
      description: "What you want to achieve professionally",
      component: CareerGoalsStep 
    },
    { 
      name: "Preferences", 
      description: "Your preferences for educational programs",
      component: PreferencesStep 
    },
    { 
      name: "Review", 
      description: "Review your profile before completion",
      component: ReviewStep 
    },
  ];
  
  // Get store references but don't trigger re-renders
  const {
    profileData: storeProfileData,
    setProfileData: storeSetProfileData,
    profileCompletionStep: storeStep,
    setProfileCompletionStep: storeSetStep,
  } = useUserDataStore();
  
  // Initial state setup
  const [currentStep, setCurrentStep] = useState(() => {
    // Use persisted step from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem('user-data-store');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.state && parsedData.state.profileCompletionStep !== undefined) {
            return parsedData.state.profileCompletionStep;
          }
        }
      } catch (e) {
        console.error('Error loading step from localStorage:', e);
      }
    }
    return 0;
  });
  
  // Derive navigable steps from current step
  const [canNavigateToStep, setCanNavigateToStep] = useState<number[]>(() => {
    if (currentStep > 0) {
      return Array.from({ length: currentStep + 1 }, (_, i) => i);
    }
    return [0];
  });
  
  const [animationDirection, setAnimationDirection] = useState("forward");
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  
  // Initialize profile data once
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem('user-data-store');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.state && parsedData.state.profileData) {
            return convertToProfileData(parsedData.state.profileData);
          }
        }
      } catch (e) {
        console.error('Error loading profile from localStorage:', e);
      }
    }
    
    // Default profile data if nothing in localStorage
    return {
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
  });
  
  // Save data to store (only when data changes, not on every render)
  const saveToStore = useCallback(() => {
    if (initialized.current) {
      storeSetProfileData(convertToUserProfile(profileData));
      storeSetStep(currentStep);
    }
  }, [profileData, currentStep, storeSetProfileData, storeSetStep]);
  
  // Save changes to store
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    
    const timeoutId = setTimeout(() => {
      saveToStore();
    }, 500); // Debounce updates
    
    return () => clearTimeout(timeoutId);
  }, [profileData, currentStep, saveToStore]);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setAnimationDirection("forward");
      
      // Show completion animation when step is complete
      setShowCompletionMessage(true);
      setTimeout(() => {
        setShowCompletionMessage(false);
        setCurrentStep(currentStep + 1);
        
        // Add this step to navigable steps if not already added
        if (!canNavigateToStep.includes(currentStep + 1)) {
          setCanNavigateToStep(prev => [...prev, currentStep + 1]);
        }
      }, 800);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setAnimationDirection("backward");
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to steps that have been visited or are the next step
    if (canNavigateToStep.includes(stepIndex)) {
      setAnimationDirection(stepIndex > currentStep ? "forward" : "backward");
      setCurrentStep(stepIndex);
    }
  };

  // This function now just logs completion
  // The actual vector store creation is now handled in ReviewStep
  const handleComplete = () => {
    console.log("Profile completed:", profileData);
  };

  // Helper function to convert ProfileData to UserProfile
  function convertToUserProfile(data: ProfileData): UserProfile {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      preferredName: data.preferredName || undefined,
      linkedInProfile: data.linkedInProfile || null,
      education: data.education.map(ed => ({
        degreeLevel: ed.degreeLevel,
        institution: ed.institution,
        fieldOfStudy: ed.fieldOfStudy,
        graduationYear: ed.graduationYear,
        gpa: ed.gpa || null
      })),
      careerGoals: {
        shortTerm: data.careerGoals.shortTerm,
        longTerm: data.careerGoals.longTerm,
        desiredIndustry: data.careerGoals.desiredIndustry,
        desiredRoles: data.careerGoals.desiredRoles
      },
      skills: data.skills,
      preferences: {
        preferredLocations: data.preferences.preferredLocations,
        studyMode: data.preferences.studyMode,
        startDate: data.preferences.startDate,
        budgetRange: {
          min: data.preferences.budgetRange.min,
          max: data.preferences.budgetRange.max
        }
      },
      documents: {
        resume: data.documents.resume || null,
        transcripts: data.documents.transcripts || null,
        statementOfPurpose: data.documents.statementOfPurpose || null,
        otherDocuments: data.documents.otherDocuments || null
      },
      vectorStoreId: data.vectorStoreId
    };
  }
  
  // Helper function to convert UserProfile to ProfileData
  function convertToProfileData(data: UserProfile): ProfileData {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || "",
      preferredName: data.preferredName || "",
      linkedInProfile: data.linkedInProfile || undefined,
      education: data.education.map(ed => ({
        degreeLevel: ed.degreeLevel as DegreeLevel,
        institution: ed.institution,
        fieldOfStudy: ed.fieldOfStudy,
        graduationYear: ed.graduationYear,
        gpa: ed.gpa || undefined
      })),
      careerGoals: {
        shortTerm: data.careerGoals.shortTerm,
        longTerm: data.careerGoals.longTerm,
        desiredIndustry: data.careerGoals.desiredIndustry,
        desiredRoles: data.careerGoals.desiredRoles
      },
      skills: data.skills,
      preferences: {
        preferredLocations: data.preferences.preferredLocations,
        studyMode: data.preferences.studyMode,
        startDate: data.preferences.startDate,
        budgetRange: {
          min: data.preferences.budgetRange.min,
          max: data.preferences.budgetRange.max
        }
      },
      documents: {
        resume: data.documents?.resume || undefined,
        transcripts: data.documents?.transcripts || undefined,
        statementOfPurpose: data.documents?.statementOfPurpose || undefined,
        otherDocuments: data.documents?.otherDocuments || undefined
      },
      vectorStoreId: data.vectorStoreId
    };
  }

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
    const StepComponent = steps[currentStep].component;
    
    if (currentStep === 0) {
      // Welcome step
      return (
        <motion.div
          key={currentStep}
          custom={animationDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "tween", duration: 0.3 }}
        >
          <StepComponent
            profileData={profileData}
            setProfileData={setProfileData}
            onComplete={handleNext}
          />
        </motion.div>
      );
    } else if (currentStep === 1) {
      // Import options step
      return (
        <motion.div
          key={currentStep}
          custom={animationDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "tween", duration: 0.3 }}
        >
          <StepComponent
            profileData={profileData}
            setProfileData={setProfileData}
            onComplete={handleNext}
          />
        </motion.div>
      );
    } else if (currentStep === steps.length - 1) {
      // Review step
      return (
        <motion.div
          key={currentStep}
          custom={animationDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "tween", duration: 0.3 }}
        >
          <StepComponent
            profileData={profileData}
            setProfileData={setProfileData}
            onComplete={handleComplete}
          />
        </motion.div>
      );
    } else {
      // All other steps
      return (
        <motion.div
          key={currentStep}
          custom={animationDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "tween", duration: 0.3 }}
        >
          <StepComponent
            profileData={profileData}
            setProfileData={setProfileData}
          />
        </motion.div>
      );
    }
  };

  return (
    <div>
      {/* Progress steps indicator */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {steps.map((step, index) => (
            <button
              key={index}
              className={`flex flex-col items-center p-2 ${
                index === currentStep
                  ? "text-primary"
                  : canNavigateToStep.includes(index)
                  ? "text-gray-700 cursor-pointer"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              onClick={() => handleStepClick(index)}
              disabled={!canNavigateToStep.includes(index)}
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    index === currentStep
                      ? "border-primary bg-primary/10"
                      : canNavigateToStep.includes(index) && index < currentStep
                      ? "border-green-500 bg-green-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {canNavigateToStep.includes(index) && index < currentStep ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-1/2 left-full w-8 h-0.5 -translate-y-1/2 ${
                      canNavigateToStep.includes(index + 1) ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                )}
              </div>
              <div className="text-xs mt-1 text-center max-w-[80px]">{step.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step completion animation */}
      <AnimatePresence>
        {showCompletionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-green-100 text-green-800 rounded-lg p-4 shadow-lg flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-medium">Step completed!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl mx-auto">
        <Card className="p-6">
          {/* Step title and description */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{steps[currentStep].name}</h2>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gray-100 p-2 rounded-full cursor-help">
                      <Info className="w-5 h-5 text-gray-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{steps[currentStep].description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-gray-600 mt-1">{steps[currentStep].description}</p>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait" initial={false} custom={animationDirection}>
            {renderCurrentStep()}
          </AnimatePresence>

          {/* Navigation buttons */}
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <div className="flex justify-between mt-6">
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