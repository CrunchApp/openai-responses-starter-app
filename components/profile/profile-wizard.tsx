"use client";
import React, { useState, useEffect } from "react";
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

export default function ProfileWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
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

  const steps = [
    { name: "LinkedIn Import", component: LinkedInImportStep },
    { name: "Personal Information", component: PersonalInfoStep },
    { name: "Education", component: EducationStep },
    { name: "Career Goals", component: CareerGoalsStep },
    { name: "Preferences", component: PreferencesStep },
    { name: "Documents", component: DocumentsStep },
    { name: "Review", component: ReviewStep },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipToPersonalInfo = () => {
    setCurrentStep(1); // Skip to the Personal Information step
  };

  const handleComplete = async () => {
    try {
      // Create a vector store with the user's profile data
      const createStoreResponse = await fetch("/api/vector_stores/create_store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: `Profile: ${profileData.firstName} ${profileData.lastName}`,
        }),
      });
      
      if (!createStoreResponse.ok) {
        throw new Error("Failed to create vector store");
      }
      
      const createStoreData = await createStoreResponse.json();
      const vectorStoreId = createStoreData.id;
      
      // Convert the profile data to a string representation for the vector store
      const profileText = JSON.stringify(profileData, null, 2);
      
      // Upload the profile data as a file
      const fileObject = {
        name: "profile.json",
        content: btoa(profileText),
      };
      
      const uploadResponse = await fetch("/api/vector_stores/upload_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileObject }),
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload profile data");
      }
      
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      
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
      
      // Save the vector store ID to the profile data
      setProfileData(prevData => ({
        ...prevData,
        vectorStoreId,
      }));
      
      // Save the complete profile data to the backend
      // For now, we'll just log it and redirect
      console.log("Profile completed:", { ...profileData, vectorStoreId });
      
      // Redirect to the recommendations page
      router.push("/recommendations");
    } catch (error) {
      console.error("Error submitting profile:", error);
      alert("There was an error saving your profile. Please try again.");
    }
  };

  // Render the current step
  const CurrentStepComponent = steps[currentStep].component;

  // Additional props for the LinkedIn import step
  const stepProps = currentStep === 0 
    ? { 
        onManualEntry: handleSkipToPersonalInfo,
        ...{ profileData, setProfileData }
      } 
    : { profileData, setProfileData };

  return (
    <Card className="p-6 shadow-md">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`text-xs font-medium ${
                index <= currentStep ? "text-blue-600" : "text-zinc-400"
              }`}
            >
              {step.name}
            </div>
          ))}
        </div>
        <div className="w-full bg-zinc-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Current step content */}
      <div className="mb-6">
        <CurrentStepComponent
          {...stepProps}
        />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        
        {currentStep < steps.length - 1 ? (
          currentStep === 0 ? null : <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleComplete}>Complete Profile</Button>
        )}
      </div>
    </Card>
  );
} 