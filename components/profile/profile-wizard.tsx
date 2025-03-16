"use client";
import React, { useState, useEffect, Dispatch, SetStateAction, ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LinkedInImportStep from "./steps/linkedin-import-step";
import PersonalInfoStep from "./steps/personal-info-step";
import EducationStep from "./steps/education-step";
import CareerGoalsStep from "./steps/career-goals-step";
import PreferencesStep from "./steps/preferences-step";
import DocumentsStep from "./steps/documents-step";
import ReviewStep from "./steps/review-step";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

// Define profile data structure
export interface ProfileData {
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // LinkedIn profile information
  linkedInProfile?: string;
  
  // Education
  education: Array<{
    degreeLevel: string;
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
  const [currentStep, setCurrentStep] = useState(0);
  const [animationDirection, setAnimationDirection] = useState("forward");
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
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

  const steps: Step[] = [
    { 
      name: "LinkedIn Import", 
      description: "Fast-track your profile setup by importing from LinkedIn",
      component: LinkedInImportStep 
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
      name: "Documents", 
      description: "Upload supporting documents",
      component: DocumentsStep 
    },
    { 
      name: "Review", 
      description: "Review your profile before completion",
      component: ReviewStep 
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setAnimationDirection("forward");
      
      // Show completion animation when step is complete
      setShowCompletionMessage(true);
      setTimeout(() => {
        setShowCompletionMessage(false);
      setCurrentStep(currentStep + 1);
      }, 800);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setAnimationDirection("backward");
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipToPersonalInfo = () => {
    setAnimationDirection("forward");
    setCurrentStep(1); // Skip to the Personal Information step
  };

  // This function now just logs completion
  // The actual vector store creation is now handled in ReviewStep
  const handleComplete = () => {
    console.log("Profile completed:", profileData);
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
    const StepComponent = steps[currentStep].component;
    
    if (currentStep === 0) {
      // LinkedIn import step
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
            onManualEntry={handleSkipToPersonalInfo}
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
      // Other steps
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
    <Card className="p-6 shadow-lg rounded-xl relative overflow-hidden border border-blue-100">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white z-0 opacity-50"></div>
      
      {/* Step completion notification */}
      {showCompletionMessage && (
        <motion.div 
          className="absolute top-4 right-4 bg-green-100 text-green-700 px-4 py-2 rounded-lg shadow-md flex items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <CheckCircle2 className="mr-2 h-5 w-5" />
          <span>Step completed!</span>
        </motion.div>
      )}
      
      <div className="relative z-10">
        {/* Current step info */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-blue-800 mb-2">{steps[currentStep].name}</h2>
          <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
        </div>
        
      {/* Progress indicator */}
        <div className="mb-8">
          <div className="relative mb-6">
            {/* Step numbers with connector line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-700 ease-in-out"
              style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
            ></div>
            
            <div className="relative flex justify-between">
          {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <button
                    disabled={index > currentStep}
                    onClick={() => {
                      if (index < currentStep) {
                        setAnimationDirection("backward");
                        setCurrentStep(index);
                      }
                    }}
                    className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 
                    ${index < currentStep 
                      ? "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer" 
                      : index === currentStep 
                        ? "bg-blue-600 text-white ring-4 ring-blue-100" 
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"}
                    `}
                  >
                    {index + 1}
                  </button>
                  <span 
                    className={`mt-2 text-xs font-medium text-center transition-all duration-300 ${
                      index <= currentStep ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {step.name}
                  </span>
            </div>
          ))}
        </div>
          </div>
      </div>

      {/* Current step content */}
        <div className="mb-8 min-h-[400px]">
          {renderCurrentStep()}
      </div>

        {/* Navigation buttons - only show for non-review steps */}
        {currentStep < steps.length - 1 && (
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
              className="transition-all duration-300 hover:bg-gray-100 px-6"
        >
          Previous
        </Button>
        
            {currentStep === 0 ? null : (
              <Button 
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 px-8 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
} 