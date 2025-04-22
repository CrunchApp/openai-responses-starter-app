"use client";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  BanknoteIcon, 
  Edit, 
  FileText, 
  Globe, 
  Heart, 
  Info, 
  MessageSquare, 
  Scroll, 
  Star, 
  ThumbsDown, 
  ThumbsUp, 
  User,
  AlertCircle,
  Trash2,
  Lock,
  Shield,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useToolsStore from "@/stores/useToolsStore";
import useProfileStore from "@/stores/useProfileStore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import HydrationLoading from "@/components/ui/hydration-loading";
import { GuestLimitMonitor } from "@/components/GuestLimitMonitor";
import { useAuth } from "@/app/components/auth/AuthContext";
import { PageWrapper } from "@/components/layouts/PageWrapper";
import AnimatedLogo from "@/components/ui/AnimatedLogo";
import { PathwayExplorer } from "./PathwayExplorer";
import usePathwayStore from "@/stores/usePathwayStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SavedProgramsView } from "./SavedProgramsView";
import { RecommendationProgressModal, RECOMMENDATION_STAGES_ENHANCED } from '@/components/recommendations/RecommendationProgressModal';
import Image from "next/image";
import { HowItWorksModal, RecommendationOptionsModal } from "./_components";
import SignupModal from "@/app/auth/SignupModal";
import { UserProfile } from "@/app/types/profile-schema";

// Add interface for Supabase profile to fix type issues
interface SupabaseProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  vector_store_id: string | null;
  // Explicitly type important structured fields
  career_goals?: {
    shortTerm: string;
    longTerm: string;
    desiredIndustry: string[];
    desiredRoles: string[];
    achievements: string;
  };
  education?: Array<{
    degreeLevel: string;
    institution: string;
    fieldOfStudy: string;
    graduationYear: string;
    gpa?: string | null;
  }>;
  skills?: string[];
  preferences?: {
    preferredLocations?: string[];
    studyMode?: string;
    startDate?: string;
    budgetRange?: {
      min: number;
      max: number;
    };
    preferredDuration?: {
      min?: number;
      max?: number;
      unit?: string;
    };
    preferredStudyLanguage?: string;
    livingExpensesBudget?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    residencyInterest?: boolean;
  };
  documents?: any;
  profile_file_id?: string | null;
  current_location?: string;
  nationality?: string;
  target_study_level?: string;
  language_proficiency?: string[];
  // Allow other properties
  [key: string]: any;
}

// Utility to map SupabaseProfile to UserProfile (camelCase)
function mapSupabaseProfileToUserProfile(profile: SupabaseProfile | null): any {
  if (!profile) return null;
  
  return {
    userId: profile.id,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    preferredName: profile.preferred_name || '',
    linkedInProfile: profile.linkedin_profile || '',
    goal: profile.goal || '',
    desiredField: profile.desired_field || '',
    education: profile.education || [],
    careerGoals: profile.career_goals ? {
      shortTerm: profile.career_goals.shortTerm || '',
      longTerm: profile.career_goals.longTerm || '',
      achievements: profile.career_goals.achievements || '',
      desiredIndustry: Array.isArray(profile.career_goals.desiredIndustry) ? profile.career_goals.desiredIndustry : [],
      desiredRoles: Array.isArray(profile.career_goals.desiredRoles) ? profile.career_goals.desiredRoles : []
    } : { shortTerm: '', longTerm: '', achievements: '', desiredIndustry: [], desiredRoles: [] },
    skills: profile.skills || [],
    preferences: profile.preferences ? {
      preferredLocations: Array.isArray(profile.preferences.preferredLocations) ? profile.preferences.preferredLocations : [],
      studyMode: profile.preferences.studyMode || 'Full-time',
      startDate: profile.preferences.startDate || '',
      budgetRange: profile.preferences.budgetRange || { min: 0, max: 100000 },
      preferredDuration: profile.preferences.preferredDuration || undefined,
      preferredStudyLanguage: profile.preferences.preferredStudyLanguage || '',
      livingExpensesBudget: profile.preferences.livingExpensesBudget || undefined,
      residencyInterest: typeof profile.preferences.residencyInterest === 'boolean' ? profile.preferences.residencyInterest : false
    } : { preferredLocations: [], studyMode: 'Full-time', startDate: '', budgetRange: { min: 0, max: 100000 }, preferredDuration: undefined, preferredStudyLanguage: '', livingExpensesBudget: undefined, residencyInterest: false },
    currentLocation: profile.current_location || '',
    nationality: profile.nationality || '',
    targetStudyLevel: profile.target_study_level || '',
    languageProficiency: Array.isArray(profile.language_proficiency) ? profile.language_proficiency : [],
    documents: profile.documents || {},
    vectorStoreId: profile.vector_store_id || '',
    profileFileId: profile.profile_file_id || undefined
  };
}

export default function RecommendationsPage() {
  const { vectorStore, fileSearchEnabled, setFileSearchEnabled } = useToolsStore();
  const { isProfileComplete, vectorStoreId, setProfileComplete, setVectorStoreId, resetProfile, profileData: guestProfileData } = useProfileStore();
  const { resetAllPathways, isActionLoading, actionError } = usePathwayStore();
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading, refreshSession } = useAuth();
  
  // Type assertion for authProfile
  const typedProfile = authProfile as SupabaseProfile | null;
  
  const [selectedTab, setSelectedTab] = useState("recommendations");
  const [isInitializing, setIsInitializing] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  
  const profileCheckedRef = useRef(false);
  
  // State for recommendation progress modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false); 
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const [isGuestResetting, setIsGuestResetting] = useState(false);
  const [isAuthResetting, setIsAuthResetting] = useState(false);

  // Get guest data from stores for potential conversion
  const { pathways: guestPathways, programsByPathway: guestPrograms } = usePathwayStore(); 
  
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isConvertingGuest, setIsConvertingGuest] = useState(false); // Loading state for conversion

  useEffect(() => {
    if (authLoading) {
      console.log("[RecPage] Waiting for auth loading...");
      setIsInitializing(true);
      return; 
    }
  
    console.log("[RecPage] Auth loaded. User:", user ? user.id : 'null', "Profile from context:", typedProfile ? 'exists' : 'null');
  
    if (!user) {
      console.log("[RecPage] User not logged in (guest). Initialization considered complete.");
      setIsInitializing(false);
      return;
    }
  
    if (!profileCheckedRef.current) {
      profileCheckedRef.current = true;
      
      if (!typedProfile) {
        console.log("[RecPage] User logged in, but profile not yet available in AuthContext. Redirecting to wizard.");
        router.push('/profile-wizard'); 
      } else {
        console.log("[RecPage] User logged in, profile exists in AuthContext.");
        if (!isProfileComplete && typedProfile.vector_store_id) {
          setVectorStoreId(typedProfile.vector_store_id);
          setProfileComplete(true); 
          console.log("[RecPage] Synced profile store state.");
        }
        if (typedProfile.vector_store_id && !fileSearchEnabled) {
          setFileSearchEnabled(true);
           console.log("[RecPage] File search enabled.");
        }
        setIsInitializing(false);
      }
    } else if (!typedProfile && user) {
        console.log("[RecPage] Re-render check: User logged in, profile still not available. Waiting for redirect.");
    } else {
        setIsInitializing(false);
    }
  
  }, [authLoading, user, typedProfile, router, isProfileComplete, setVectorStoreId, setProfileComplete, vectorStoreId, fileSearchEnabled, setFileSearchEnabled]);

  const handleGuestSignupClick = () => {
    if (!isProfileComplete) {
      // If guest profile is missing, route to wizard
      console.log("Guest profile missing, routing to wizard.");
      router.push('/profile-wizard');
    } else {
      // If guest profile exists, open signup modal for conversion
      console.log("Guest profile found, opening signup modal.");
      setIsSignupModalOpen(true);
    }
  };

  const handleGuestSignupComplete = async (userId?: string) => {
    setIsSignupModalOpen(false);
    if (!userId) {
      console.log("Signup skipped or failed.");
      return; 
    }

    setIsConvertingGuest(true);
    console.log("Starting guest conversion for user:", userId);

    try {
      const profileToConvert = guestProfileData || {} as UserProfile;
      const pathwaysToConvert = guestPathways || [];
      const programsToConvert = guestPrograms || {};

      const conversionResponse = await fetch('/api/auth/convert-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profileData: profileToConvert,
          pathways: pathwaysToConvert,
          programsByPathway: programsToConvert,
        }),
      });

      if (!conversionResponse.ok) {
        const errorData = await conversionResponse.json();
        throw new Error(errorData.error || 'Failed to convert guest data.');
      }

      console.log("Guest conversion successful for user:", userId);

      localStorage.removeItem('userProfileData'); 
      localStorage.removeItem('vista-profile-storage');
      localStorage.removeItem('pathway-store');

      await refreshSession(); 

    } catch (error) {
      console.error("Error during guest conversion:", error);
      alert(`Failed to save your data during signup: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConvertingGuest(false);
    }
  };

  const handleGuestReset = async () => {
    setIsGuestResetting(true);
    console.log("Initiating guest profile reset...");

    try {
      // Get profile data and vector store ID from the profile store for the guest
      const { profileData: guestProfile, vectorStoreId: guestVectorStoreId, clearStore: clearProfileWizardStore } = useProfileStore.getState();
      const { clearStore: clearPathwayStore } = usePathwayStore.getState();

      // *** VECTOR STORE CLEANUP START ***
      if (guestVectorStoreId) {
        console.log("Cleaning up guest vector store:", guestVectorStoreId);
        try { 
          // Clean up document file IDs from guest profile data
          const docFileIds: string[] = [];
          if (guestProfile && guestProfile.documents) {
            Object.entries(guestProfile.documents).forEach(([key, value]) => {
              // Check if value is a valid document object with fileId
              if (value && typeof value === 'object' && 'fileId' in value && typeof value.fileId === 'string') {
                docFileIds.push(value.fileId); 
              }
            });
          }
          
          // Add profile file ID if it exists in guest data
          if (guestProfile && guestProfile.profileFileId) {
            docFileIds.push(guestProfile.profileFileId);
          }
          
          console.log("Cleaning up guest document file IDs:", docFileIds);
          
          // Delete each file individually
          for (const fileId of docFileIds) {
            try {
              await fetch(`/api/vector_stores/delete_file?file_id=${fileId}`, { method: "DELETE" });
              console.log(`Deleted guest file ${fileId}`);
            } catch (fileError) {
              console.error(`Error deleting guest file ${fileId}:`, fileError);
              // Continue trying to delete other files and the store
            }
          }
          
          // Clean up the whole vector store
          const cleanupResponse = await fetch(`/api/vector_stores/cleanup?vector_store_id=${guestVectorStoreId}`, {
            method: 'DELETE'
          });
          
          if (!cleanupResponse.ok) {
            console.error('Failed to clean up guest vector store:', cleanupResponse.statusText);
          } else {
            console.log("Guest vector store cleanup successful for:", guestVectorStoreId);
          }
        } catch (cleanupError) {
           console.error("Error during guest vector store cleanup:", cleanupError);
           // Still try to clear local state even if backend cleanup fails partially
        }
      } else {
        console.log("No guest vector store ID found, skipping backend cleanup.");
      }
      // *** VECTOR STORE CLEANUP END ***

      // 1. Clear Zustand profile store
      clearProfileWizardStore(); 
      console.log("Cleared profile store.");

      // 2. Clear Zustand pathway store
      clearPathwayStore();
      console.log("Cleared pathway store.");

      // 3. Clear LocalStorage (important for guest persistence)
      localStorage.removeItem('userProfileData');
      localStorage.removeItem('pathwayData'); // Assuming you store pathway data here too
      console.log("Cleared localStorage.");

      // 4. Reset Tools Store state related to guest (redundant if store cleared, but safe)
      const { setVectorStore, setFileSearchEnabled } = useToolsStore.getState();
      setVectorStore({ id: "", name: "" }); // Clear vector store info
      setFileSearchEnabled(false); // Disable file search
      console.log("Reset tools store state.");

      // 5. Redirect to the profile wizard start page
      router.push("/profile-wizard"); 
      console.log("Redirecting to profile wizard...");

    } catch (error) {
      console.error("Error resetting guest profile:", error);
      setPageError("Failed to reset your profile. Please try again.");
    } finally {
      setIsGuestResetting(false);
    }
  };

  const handleAuthReset = async () => {
    if (!user) return;

    setIsAuthResetting(true);
    try {
      await resetAllPathways();
    } catch (error) {
      console.error("Unexpected error during authenticated reset:", error);
    } finally {
      setIsAuthResetting(false);
    }
  };

  // Functions to control the progress modal simulation
  const startProgressSimulation = () => {
    setCurrentStageIndex(0);
    setIsGenerationComplete(false);
    setIsModalOpen(true);
    
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressTimeoutsRef.current.forEach(clearTimeout);
    progressTimeoutsRef.current = [];
    
    // Using the same timings as the old version
    const stageTiming = [
      1000, // Analyzing profile: 1s
      3500, // Generating pathways (start): 3.5s (AI call)
       500, // Generating pathways (complete): 0.5s
      // Subsequent stages removed as generation happens in one step now
      1000, // Placeholder for saving/processing
       500  // Placeholder for preparing
    ];

    // Use only the relevant number of stages
    const relevantStages = RECOMMENDATION_STAGES_ENHANCED.slice(0, stageTiming.length);

    let cumulativeTime = 0;
    
    relevantStages.forEach((_stage, index: number) => {
      const currentStageDuration = stageTiming[index];
      
      if (index === 0) {
        setCurrentStageIndex(0); // Start immediately
      } else {
        const timeout = setTimeout(() => {
          if (index < relevantStages.length) {
             setCurrentStageIndex(index);
          }
        }, cumulativeTime);
        progressTimeoutsRef.current.push(timeout);
      }
      cumulativeTime += currentStageDuration;
    });
  };

  const stopProgressSimulation = (success: boolean) => {
    progressTimeoutsRef.current.forEach(clearTimeout);
    progressTimeoutsRef.current = [];
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (success) {
       const finalStageIndex = RECOMMENDATION_STAGES_ENHANCED.slice(0, 5).length - 1; // Adjust based on used stages
       setCurrentStageIndex(finalStageIndex); 
       setIsGenerationComplete(true);
       setTimeout(() => {
         setIsModalOpen(false);
         setTimeout(() => setIsGenerationComplete(false), 300); 
       }, 1200); 
    } else {
      // If failed, close modal immediately without showing completion
      setIsModalOpen(false);
      setIsGenerationComplete(false);
      // Optionally show an error message here or rely on the store's error state
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  if (isInitializing || authLoading) {
    return <HydrationLoading isHydrated={!isInitializing} />;
  }

  function handleTabChange(tab: string) {
    setSelectedTab(tab);
  }
  
  // Determine the profile to pass based on auth state
  const profileForExplorer = user 
    ? mapSupabaseProfileToUserProfile(typedProfile) 
    : guestProfileData;

  return (
    <PageWrapper allowGuest>
      <RecommendationProgressModal
        isOpen={isModalOpen}
        progressStages={RECOMMENDATION_STAGES_ENHANCED.slice(0, 5)}
        currentStageIndex={currentStageIndex}
        isComplete={isGenerationComplete}
      />

      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onComplete={handleGuestSignupComplete}
        isLoading={isConvertingGuest}
        profileData={guestProfileData || {} as UserProfile}
      />

      <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-radial from-primary/5 via-primary/10 to-transparent blur-3xl"
        />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-radial from-blue-500/5 via-blue-500/10 to-transparent blur-3xl"
        />
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 0.07 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.8 }}
          className="absolute top-1/4 right-[5%] w-20 h-20 border border-dashed border-primary rounded-full animate-spin-slow" 
        />
      </div>

      <GuestLimitMonitor />
      <TooltipProvider>
        <div className="container mx-auto py-6 md:py-10 px-4 max-w-6xl relative z-10">
          <>
            <div className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                  className="flex flex-col justify-center"
                >
                  <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    
                    Welcome to your recommendations page
                </h1>
                  <p className="text-muted-foreground text-lg max-w-xl mb-4">
                    Explore personalized education pathways, find and save programs you're interested in, and track your applications.
                </p>
                
                {!user && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-md flex items-center text-sm"
                  >
                    <Shield className="h-4 w-4 mr-2 text-amber-500" />
                    <span>You're browsing in guest mode with limited features.</span>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-sm ml-1 text-amber-700 font-medium" 
                      onClick={handleGuestSignupClick}
                      disabled={isConvertingGuest}
                    >
                      {isConvertingGuest ? 'Saving...' : 'Sign up for full access →'}
                    </Button>
                  </motion.div>
                )}
                {user && !typedProfile && (
                  <div className="mt-3 flex items-center text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-md">
                    <User className="h-4 w-4 mr-2 text-slate-500" /> 
                    <span>Loading your profile information...</span>
                    <AnimatedLogo size={16} className="ml-2" />
                  </div>
                )}
              </motion.div>
              
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="flex justify-center relative order-first md:order-last"
                >
                  <div className="relative w-full h-[300px] flex items-center justify-center">
                    <motion.div 
                      className="absolute right-0 md:right-10 top-0 md:top-10 w-1/2 h-[200px] flex flex-col items-end justify-end"
                      whileHover={{ scale: 1.05, rotate: -2 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      <Image
                        src="/images/vectors/confGirl.svg"
                        alt="Student Girl"
                        fill
                        style={{ objectFit: "contain" }}
                        priority
                      />
                      <div className="w-full flex justify-end mt-2 relative z-10">
                        <div className="bg-blue-100 rounded-lg p-2 pl-3 shadow-sm flex items-center gap-2">
                          <p className="text-xs font-medium text-blue-700 mb-0 max-w-[140px]">Learn how recommendations work!</p>
                          <HowItWorksModal />
                        </div>
                      </div>
                    </motion.div>
                    <motion.div 
                      className="absolute left-0 md:left-10 bottom-0 md:bottom-10 w-1/2 h-[200px] flex flex-col items-start justify-end"
                      whileHover={{ scale: 1.05, rotate: 2 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      <Image
                        src="/images/vectors/confBoy.svg"
                        alt="Student Boy"
                        fill
                        style={{ objectFit: "contain" }}
                        priority
                      />
                      <div className="w-full flex justify-start mt-2 relative z-10">
                        <div className="bg-amber-100 rounded-lg p-2 pl-3 shadow-sm flex items-center gap-2">
                          <p className="text-xs font-medium text-amber-700 mb-0 max-w-[140px]">Not seeing what you expected?</p>
                          <RecommendationOptionsModal 
                            user={user}
                            typedProfile={typedProfile}
                            isInitializing={isInitializing}
                            isGuestResetting={isGuestResetting}
                            isAuthResetting={isAuthResetting}
                            isActionLoading={isActionLoading}
                            handleGuestReset={handleGuestReset}
                            handleAuthReset={handleAuthReset}
                          />
                        </div>
                      </div>
                    </motion.div>
                    <div className="absolute inset-0 bg-green-400/10 blur-3xl rounded-full z-[-1]"></div>
                  </div>
                </motion.div>
              </div>
            </div>
            
            {pageError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6 flex items-start shadow-sm"
              >
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">Page Error</p>
                  <p className="text-sm mt-1">{pageError}</p>
                  <Button variant="ghost" size="sm" className="mt-2 h-8 text-red-700 hover:bg-red-100 p-0 pr-2">
                    Refresh Page <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            )}

            {actionError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6 flex items-start shadow-sm"
              >
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">Action Error</p>
                  <p className="text-sm mt-1">{actionError}</p>
                </div>
              </motion.div>
            )}

            <Tabs 
              defaultValue="recommendations" 
              className="w-full mt-8" 
              onValueChange={handleTabChange}
            >
              <div className="border-b mb-6">
                <TabsList className="bg-transparent h-auto p-0 mb-0 gap-4">
                  <TabsTrigger 
                    value="recommendations" 
                    className="text-sm md:text-base px-2 py-3 h-auto data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Pathways
                  </TabsTrigger>
                  <TabsTrigger 
                    value="saved" 
                    className="text-sm md:text-base px-2 py-3 h-auto data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Saved Programs
                  </TabsTrigger>
                  <TabsTrigger 
                    value="applications" 
                    className="text-sm md:text-base px-2 py-3 h-auto data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 rounded-none transition-all duration-200"
                    disabled={!user}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Applications
                    {!user && <Lock className="w-3 h-3 ml-1" />}
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent 
                value="recommendations"
                className="mt-0 animate-in fade-in-50 duration-300 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=inactive]:duration-150"
              >
                <PathwayExplorer 
                  userProfile={profileForExplorer}
                  onStartGeneration={startProgressSimulation} 
                  onStopGeneration={stopProgressSimulation} 
                /> 
              </TabsContent>
              
              <TabsContent value="saved">
                <div className="flex flex-col space-y-6">
                  {user ? (
                    <SavedProgramsView userProfile={mapSupabaseProfileToUserProfile(typedProfile)} />
                  ) : (
                    <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="inline-flex items-center justify-center p-3 bg-white rounded-full border border-slate-200 shadow-sm mb-4">
                        <Heart className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">Sign in to save programs</h3>
                      <p className="text-slate-600 mb-6 max-w-md mx-auto">
                        Create an account to save your favorite programs and access them anytime, anywhere.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="applications">
                {user ? (
                  <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="inline-flex items-center justify-center p-3 bg-white rounded-full border border-slate-200 shadow-sm mb-4">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">No applications yet</h3>
                    <p className="text-slate-600 mb-6 max-w-md mx-auto">
                      Your education program applications will appear here when you start applying.
                    </p>
                    <Button variant="outline" disabled className="px-6 bg-white"> 
                      <Star className="w-4 h-4 mr-2 text-amber-400" />
                      Coming Soon
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="inline-flex items-center justify-center p-3 bg-white rounded-full border border-slate-200 shadow-sm mb-4">
                      <Lock className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Sign in to track applications</h3>
                    <p className="text-slate-600 mb-6 max-w-md mx-auto">
                      Create an account to manage your program applications and keep track of their status.
                    </p>
                    <Button 
                      onClick={() => router.push('/signup')}
                      className="px-6 py-2"
                    >
                      Create Account
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        </div>
      </TooltipProvider>
    </PageWrapper>
  );
} 