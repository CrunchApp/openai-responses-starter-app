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
import WelcomeStep from "./steps/welcome-step";
import ImportOptionsStep from "./steps/import-options-step";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [animationDirection, setAnimationDirection] = useState("forward");
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
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
      // Import Options step
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
      // Regular steps
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

  const completionAnimation = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 500, damping: 20 } },
    exit: { opacity: 0, scale: 1.2, transition: { duration: 0.2 } }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Create Your Profile</h1>
        <p className="text-zinc-600">
          Complete the steps below to set up your personal educational profile.
        </p>
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
              <div key={idx} className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    idx < currentStep 
                      ? "bg-green-500 text-white"
                      : idx === currentStep
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {idx < currentStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="text-xs mt-2 hidden md:block">{step.name}</span>
              </div>
            ))}
          </div>
          <div className="relative max-w-xl mx-auto mt-4">
            <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-200 -translate-y-1/2" />
            <div 
              className="absolute top-1/2 left-4 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-300"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
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