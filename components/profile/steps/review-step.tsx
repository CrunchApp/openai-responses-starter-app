"use client";
import React, { useState, useEffect } from "react";
import { UserProfile } from "@/app/types/profile-schema";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, FileText, User, BookOpen, Briefcase, AlertCircle, Settings, Award, Loader2, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import useToolsStore from "@/stores/useToolsStore";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import useProfileStore from "@/stores/useProfileStore";
import SignupModal from "@/app/auth/SignupModal";
import { useToast } from "@/hooks/use-toast";

interface ReviewStepProps {
  profileData: UserProfile;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfile>>;
  onComplete: (userId?: string) => Promise<void> | void;
  isEditMode?: boolean;
}

export default function ReviewStep({
  profileData,
  setProfileData,
  onComplete,
  isEditMode = false
}: ReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSection, setExpandedSection] = useState("personal");
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const router = useRouter();
  
  // Use our stores
  const { vectorStoreId: storeVectorStoreId, setVectorStoreId, setProfileComplete } = useProfileStore();
  const { setVectorStore, setFileSearchEnabled } = useToolsStore();

  // Toast helper
  const { toast } = useToast();

  // Add a useEffect to verify vector store ID consistency
  useEffect(() => {
    // Check if vector store ID needs to be updated from the store to profile data
    if (storeVectorStoreId && !profileData.vectorStoreId) {
      // If there's a vector store ID in the store but not in profileData, update it
      setProfileData(prev => ({
        ...prev,
        vectorStoreId: storeVectorStoreId
      }));
    }
  }, [storeVectorStoreId, profileData.vectorStoreId, setProfileData]);

  const handleTriggerCompletion = async () => {
    if (isEditMode) {
       setIsSubmitting(true);
       try {
          await onComplete();
       } catch (error) {
          console.error("Error completing guest edit:", error);
          toast({
            title: "Update failed",
            description: "We couldn't update your profile. Please check your details and try again.",
            variant: "destructive",
          });
          setIsSubmitting(false);
       }
    } else {
       setIsSignupModalOpen(true);
    }
  };

  const handleSignupComplete = async (userId?: string) => {
    setIsSignupModalOpen(false);
    setIsSubmitting(true);
    try {
      await onComplete(userId);
    } catch (error) {
      console.error("Error after signup modal:", error);
      toast({
        title: "Something went wrong",
        description: "Unable to proceed. Please try again later.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    let total = 0;
    
    // Personal info
    if (profileData.firstName) completed++;
    if (profileData.lastName) completed++;
    if (profileData.email) completed++;
    if (profileData.phone) completed++;
    if (profileData.currentLocation) completed++;
    if (profileData.nationality) completed++;
    total += 6;
    
    // Education
    if (profileData.targetStudyLevel) completed++;
    total += 1;
    profileData.education.forEach(edu => {
      if (edu.degreeLevel) completed++;
      if (edu.institution) completed++;
      if (edu.fieldOfStudy) completed++;
      if (edu.graduationYear) completed++;
      total += 4;
    });
    if (profileData.languageProficiency && profileData.languageProficiency.length > 0) completed++;
    total += 1;
    
    // Career Goals
    if (profileData.careerGoals.shortTerm) completed++;
    if (profileData.careerGoals.longTerm) completed++;
    if (profileData.careerGoals.achievements) completed++;
    if (profileData.careerGoals.desiredIndustry.length > 0) completed++;
    if (profileData.careerGoals.desiredRoles.length > 0) completed++;
    total += 5;
    
    // Skills
    if (profileData.skills.length > 0) completed++;
    total += 1;
    
    // Preferences
    if (profileData.preferences.preferredLocations.length > 0) completed++;
    if (profileData.preferences.studyMode) completed++;
    if (profileData.preferences.startDate) completed++;
    if (profileData.preferences.budgetRange.max > 0) completed++;
    if (profileData.preferences.preferredDuration?.unit) completed++;
    if (profileData.preferences.preferredStudyLanguage) completed++;
    if (profileData.preferences.livingExpensesBudget?.max) completed++;
    total += 7;
    
    // Documents
    if (profileData.documents.resume) completed++;
    if (profileData.documents.transcripts) completed++;
    if (profileData.documents.statementOfPurpose) completed++;
    if (profileData.documents.otherDocuments && profileData.documents.otherDocuments.length > 0) completed++;
    total += 4;
    
    return Math.round((completed / total) * 100);
  };
  
  const completionPercentage = calculateCompletion();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-xl font-semibold mb-2">Review Your Profile</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Please review all your information before finalizing your profile.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-blue-800">Profile Completion</h3>
          <span className="text-sm font-semibold text-blue-700">{completionPercentage}%</span>
        </div>
        
        <div className="w-full h-3 bg-white rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${
              completionPercentage < 50 
                ? "bg-amber-500" 
                : completionPercentage < 80 
                ? "bg-blue-500" 
                : "bg-green-500"
            }`}
          />
        </div>
        
        <div className="mt-4 text-sm text-blue-600">
          {completionPercentage === 100 ? (
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Your profile is complete and ready for submission!
            </div>
          ) : (
            <div className="flex items-center">
              <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
              Your profile is {completionPercentage}% complete. You can still proceed, but more details will help us provide better recommendations.
            </div>
          )}
        </div>
      </motion.div>

      <Accordion type="single" collapsible className="w-full" defaultValue="personal" value={expandedSection} onValueChange={setExpandedSection}>
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <AccordionItem value="personal" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-blue-50 to-white data-[state=open]:bg-blue-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Personal Information</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Your basic information and contact details</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
              <div className="pl-10 space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-zinc-500">First Name</p>
                    <p className="font-medium">{profileData.firstName || "Not provided"}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-zinc-500">Last Name</p>
                    <p className="font-medium">{profileData.lastName || "Not provided"}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Email</p>
                  <p className="font-medium">{profileData.email || "Not provided"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Phone</p>
                  <p className="font-medium">{profileData.phone || "Not provided"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-zinc-500">Current Location</p>
                    <p className="font-medium">{profileData.currentLocation || "Not provided"}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-zinc-500">Nationality</p>
                    <p className="font-medium">{profileData.nationality || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <AccordionItem value="education" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-purple-50 to-white data-[state=open]:bg-purple-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Education History</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Your academic background and qualifications</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
              <div className="pl-10 space-y-4 py-2">
                <div className="p-3 bg-purple-50 rounded-lg mb-4">
                  <p className="text-xs text-purple-500">Target Study Level</p>
                  <p className="font-medium">{profileData.targetStudyLevel || "Not specified"}</p>
                </div>
                <h4 className="font-medium text-sm text-purple-700 mb-2">Education History</h4>
                {profileData.education.map((edu, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    className="p-4 border rounded-md bg-white border-purple-100 shadow-sm mb-2"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-purple-800">Education #{index + 1}</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-700">Degree Level</p>
                          <p className="font-medium text-gray-800">
                            {edu.degreeLevel || "Not provided"}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-700">Field of Study</p>
                          <p className="font-medium text-gray-800">
                            {edu.fieldOfStudy || "Not provided"}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-700">Institution</p>
                        <p className="font-medium text-gray-800">
                          {edu.institution || "Not provided"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-700">Graduation Year</p>
                          <p className="font-medium text-gray-800">
                            {edu.graduationYear || "Not provided"}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-700">GPA</p>
                          <p className="font-medium text-gray-800">{edu.gpa || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {profileData.education.length === 0 && <p className="text-sm text-zinc-500">No education history provided.</p>}
                <h4 className="font-medium text-sm text-purple-700 mt-6 mb-2">Language Proficiency</h4>
                {(profileData.languageProficiency && profileData.languageProficiency.length > 0) ? (
                  profileData.languageProficiency.map((lang, index) => (
                     <motion.div
                        key={`lang-review-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="p-3 bg-purple-50 rounded-lg mb-2 flex justify-between items-center flex-wrap gap-2"
                      >
                       <div>
                          <span className="font-medium text-sm mr-2">{lang.language}:</span>
                          <span className="text-sm text-purple-700">{lang.proficiencyLevel || '-'}</span>
                        </div>
                        {(lang.testType || lang.score) && (
                          <div className="text-xs text-zinc-500">
                            {lang.testType && <span>Test: {lang.testType}</span>}
                            {lang.score && <span className="ml-2">Score: {lang.score}</span>}
                          </div>
                        )}
                      </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No language proficiency provided.</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Career Goals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <AccordionItem value="career" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-blue-50 to-white data-[state=open]:bg-blue-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Career Goals</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Your professional aspirations and objectives</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
              <div className="pl-10 space-y-4 py-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Short-term Goals</p>
                  <p className="font-medium">
                    {profileData.careerGoals.shortTerm || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Long-term Goals</p>
                  <p className="font-medium">
                    {profileData.careerGoals.longTerm || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Achievements & Extracurricular Interests</p>
                  <p className="font-medium">
                    {profileData.careerGoals.achievements || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profileData.skills.length > 0 ? (
                      profileData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500">No skills provided</span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Desired Industries</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profileData.careerGoals.desiredIndustry.length > 0 ? (
                      profileData.careerGoals.desiredIndustry.map(
                        (industry, index) => (
                          <span
                            key={index}
                            className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {industry}
                          </span>
                        )
                      )
                    ) : (
                      <span className="text-zinc-500">
                        No desired industries provided
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Desired Roles</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profileData.careerGoals.desiredRoles.length > 0 ? (
                      profileData.careerGoals.desiredRoles.map((role, index) => (
                        <span
                          key={index}
                          className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500">
                        No desired roles provided
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <AccordionItem value="preferences" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-green-50 to-white data-[state=open]:bg-green-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Preferences</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Your preferences for educational programs</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
              <div className="pl-10 space-y-4 py-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Preferred Locations</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profileData.preferences.preferredLocations.length > 0 ? (
                      profileData.preferences.preferredLocations.map(
                        (location, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {location}
                          </span>
                        )
                      )
                    ) : (
                      <span className="text-zinc-500">
                        No preferred locations provided
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Study Mode</p>
                  <p className="font-medium">
                    {profileData.preferences.studyMode || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Preferred Start Date</p>
                  <p className="font-medium">
                    {profileData.preferences.startDate
                      ? new Date(profileData.preferences.startDate).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long" }
                        )
                      : "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Budget Range (Program Fees/Year)</p>
                  <p className="font-medium">
                     ${profileData.preferences.budgetRange.min.toLocaleString()} - ${profileData.preferences.budgetRange.max.toLocaleString()} USD
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                   <p className="text-xs text-zinc-500">Preferred Course Duration</p>
                   <p className="font-medium">
                    {profileData.preferences.preferredDuration?.min || '-'} to {profileData.preferences.preferredDuration?.max || '-'} {profileData.preferences.preferredDuration?.unit || ''}
                   </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Preferred Language of Studies</p>
                  <p className="font-medium">{profileData.preferences.preferredStudyLanguage || "Not specified"}</p>
                </div>
                 <div className="p-3 bg-green-50 rounded-lg">
                   <p className="text-xs text-zinc-500">Living Expenses Budget (Per Year)</p>
                   <p className="font-medium">
                    {profileData.preferences.livingExpensesBudget?.min ? `$${profileData.preferences.livingExpensesBudget.min.toLocaleString()}` : '-'} to {profileData.preferences.livingExpensesBudget?.max ? `$${profileData.preferences.livingExpensesBudget.max.toLocaleString()}` : '-'} {profileData.preferences.livingExpensesBudget?.currency || 'USD'}
                   </p>
                </div>
                 <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Interest in Residency/Migration Post-Study</p>
                  <p className="font-medium">{profileData.preferences.residencyInterest ? "Yes" : "No"}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Documents */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <AccordionItem value="documents" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-amber-50 to-white data-[state=open]:bg-amber-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Documents</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Uploaded files that enhance your recommendations</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
              <div className="pl-10 space-y-4 py-2">
                <div className="space-y-3">
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-md border border-gray-200">
                        <FileText size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Resume/CV</p>
                        <p className="text-xs text-gray-500">Your educational and professional experience</p>
                      </div>
                    </div>
                    <div>
                      {profileData.documents.resume ? (
                        <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                          <Check size={14} className="mr-1" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-md border border-gray-200">
                        <FileText size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Transcripts</p>
                        <p className="text-xs text-gray-500">Your academic records</p>
                      </div>
                    </div>
                    <div>
                      {profileData.documents.transcripts ? (
                        <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                          <Check size={14} className="mr-1" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-md border border-gray-200">
                        <FileText size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Statement of Purpose</p>
                        <p className="text-xs text-gray-500">Your educational goals</p>
                      </div>
                    </div>
                    <div>
                      {profileData.documents.statementOfPurpose ? (
                        <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                          <Check size={14} className="mr-1" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-md border border-gray-200">
                        <Languages size={20} className="text-cyan-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Language Tests / Other</p>
                        <p className="text-xs text-gray-500">Additional supporting documents</p>
                      </div>
                    </div>
                    <div>
                      {(profileData.documents.otherDocuments && profileData.documents.otherDocuments.length > 0) ? (
                        <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                          <Check size={14} className="mr-1" />
                          {profileData.documents.otherDocuments.length} Uploaded
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>
      </Accordion>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl overflow-hidden shadow-md mt-8"
      >
        <div className="p-6 text-white">
          <div className="flex items-start">
            <div className="p-3 rounded-full bg-white/20 mr-4">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isEditMode ? "Ready to Update Your Profile" : "Ready to Complete Your Profile"}
              </h3>
              <p className="text-white/80 text-sm mb-4">
                {isEditMode 
                  ? "Your updated information will be used to refine your educational recommendations."
                  : "Your information will be used to create personalized educational recommendations. Click the button below to finalize your profile and access your AI Education Adviser."
                }
              </p>
              
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleTriggerCompletion}
                  disabled={isSubmitting}
                  className="bg-white hover:bg-white/90 text-blue-700 font-medium px-6 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-base"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  ) : null}
                  {isEditMode ? "Update Profile" : "Complete Profile"}
                  {!isSubmitting && <ChevronRight className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Signup Modal */}
      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onComplete={handleSignupComplete}
        isLoading={isSubmitting}
        profileData={profileData}
      />
    </div>
  );
} 