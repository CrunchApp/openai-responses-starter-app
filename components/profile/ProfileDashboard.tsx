"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, FileText, User, BookOpen, Briefcase, Settings, Edit, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import useRecommendationsStore from "@/stores/useRecommendationsStore";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

export default function ProfileDashboard() {
  const [expandedSection, setExpandedSection] = useState("personal");
  const router = useRouter();
  
  // Use our stores
  const { userProfile } = useRecommendationsStore();

  // If we don't have profile data, get it from localStorage
  useEffect(() => {
    if (!userProfile || Object.keys(userProfile).length === 0) {
      const storedProfileData = localStorage.getItem('userProfileData');
      if (storedProfileData) {
        try {
          const profileData = JSON.parse(storedProfileData);
          // This would need to be connected to your store in the real implementation
          console.log("Retrieved profile data from localStorage", profileData);
        } catch (error) {
          console.error("Error parsing profile data from localStorage", error);
        }
      }
    }
  }, [userProfile]);

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    if (!userProfile) return 0;
    
    let completed = 0;
    let total = 0;
    
    // Personal info
    if (userProfile.firstName) completed++;
    if (userProfile.lastName) completed++;
    if (userProfile.email) completed++;
    if (userProfile.phone) completed++;
    total += 4;
    
    // Education
    userProfile.education?.forEach(edu => {
      if (edu.degreeLevel) completed++;
      if (edu.institution) completed++;
      if (edu.fieldOfStudy) completed++;
      if (edu.graduationYear) completed++;
      total += 4;
    });
    
    // Career Goals
    if (userProfile.careerGoals?.shortTerm) completed++;
    if (userProfile.careerGoals?.longTerm) completed++;
    if (userProfile.careerGoals?.desiredIndustry?.length > 0) completed++;
    if (userProfile.careerGoals?.desiredRoles?.length > 0) completed++;
    total += 4;
    
    // Skills
    if (userProfile.skills?.length > 0) completed++;
    total += 1;
    
    // Preferences
    if (userProfile.preferences?.preferredLocations?.length > 0) completed++;
    if (userProfile.preferences?.studyMode) completed++;
    if (userProfile.preferences?.startDate) completed++;
    if (userProfile.preferences?.budgetRange?.max > 0) completed++;
    total += 4;
    
    // Documents
    if (userProfile.documents?.resume) completed++;
    if (userProfile.documents?.transcripts) completed++;
    if (userProfile.documents?.statementOfPurpose) completed++;
    total += 3;
    
    return Math.round((completed / total) * 100);
  };
  
  const completionPercentage = calculateCompletion();

  // If no profile data is available, show a message
  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <User className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Profile Found</h2>
          <p className="text-gray-600 mb-6">
            You haven't created a profile yet. Create one to receive personalized education recommendations.
          </p>
          <Button 
            onClick={() => router.push('/profile-wizard')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Link href="/dashboard" className="flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold"
          >
            Your Profile Dashboard
          </motion.h1>
          <p className="text-gray-600">
            View and manage your education profile information
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/profile-wizard?edit=true")}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
        </Button>
      </div>

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
              Your profile is complete!
            </div>
          ) : (
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-amber-500" />
              Your profile is {completionPercentage}% complete. Consider adding more details for better recommendations.
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
                    <p className="font-medium">{userProfile.firstName || "Not provided"}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-zinc-500">Last Name</p>
                    <p className="font-medium">{userProfile.lastName || "Not provided"}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Email</p>
                  <p className="font-medium">{userProfile.email || "Not provided"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Phone</p>
                  <p className="font-medium">{userProfile.phone || "Not provided"}</p>
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
                {userProfile.education?.map((edu, index) => (
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
                    {userProfile.careerGoals?.shortTerm || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Long-term Goals</p>
                  <p className="font-medium">
                    {userProfile.careerGoals?.longTerm || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {userProfile.skills?.length > 0 ? (
                      userProfile.skills.map((skill, index) => (
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
                    {userProfile.careerGoals?.desiredIndustry?.length > 0 ? (
                      userProfile.careerGoals.desiredIndustry.map(
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
                    {userProfile.careerGoals?.desiredRoles?.length > 0 ? (
                      userProfile.careerGoals.desiredRoles.map((role, index) => (
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
                    {userProfile.preferences?.preferredLocations?.length > 0 ? (
                      userProfile.preferences.preferredLocations.map(
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
                    {userProfile.preferences?.studyMode || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Preferred Start Date</p>
                  <p className="font-medium">
                    {userProfile.preferences?.startDate
                      ? new Date(userProfile.preferences.startDate).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long" }
                        )
                      : "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Budget Range</p>
                  <p className="font-medium">
                    ${userProfile.preferences?.budgetRange?.min?.toLocaleString() || 0} - $
                    {userProfile.preferences?.budgetRange?.max?.toLocaleString() || 0}
                  </p>
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
                        <p className="text-xs text-gray-500">Your professional experience</p>
                      </div>
                    </div>
                    <div>
                      {userProfile.documents?.resume ? (
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
                      {userProfile.documents?.transcripts ? (
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
                      {userProfile.documents?.statementOfPurpose ? (
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
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>
      </Accordion>
    </div>
  );
} 