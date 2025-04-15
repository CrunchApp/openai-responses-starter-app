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
  };
  documents?: any;
  profile_file_id?: string | null;
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
      desiredIndustry: Array.isArray(profile.career_goals.desiredIndustry) ? profile.career_goals.desiredIndustry : [],
      desiredRoles: Array.isArray(profile.career_goals.desiredRoles) ? profile.career_goals.desiredRoles : []
    } : { shortTerm: '', longTerm: '', desiredIndustry: [], desiredRoles: [] },
    skills: profile.skills || [],
    preferences: profile.preferences ? {
      preferredLocations: Array.isArray(profile.preferences.preferredLocations) ? profile.preferences.preferredLocations : [],
      studyMode: profile.preferences.studyMode || 'Full-time',
      startDate: profile.preferences.startDate || '',
      budgetRange: profile.preferences.budgetRange || { min: 0, max: 100000 }
    } : { preferredLocations: [], studyMode: 'Full-time', startDate: '', budgetRange: { min: 0, max: 100000 } },
    documents: profile.documents || {},
    vectorStoreId: profile.vector_store_id || '',
    profileFileId: profile.profile_file_id || undefined
  };
}

export default function RecommendationsPage() {
  const { vectorStore, fileSearchEnabled, setFileSearchEnabled } = useToolsStore();
  const { isProfileComplete, vectorStoreId, setProfileComplete, setVectorStoreId, resetProfile } = useProfileStore();
  const { resetAllPathways, isActionLoading, actionError } = usePathwayStore();
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  
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

  const handleGuestReset = async () => {
    if (user) {
       console.warn("Authenticated user attempting guest 'Start Over'. Action unclear.");
       alert("Please manage your profile and data from the settings page.");
       return; 
    }

    try {
      setIsGuestResetting(true);
      
      const { setVectorStore } = useToolsStore.getState();
      setVectorStore({ id: "", name: "" }); 
      resetProfile();
      
      // Use clearGuestData instead of clearStore to specifically clean guest data
      const { clearGuestData } = await import("@/stores/usePathwayStore").then(mod => mod.default.getState());
      clearGuestData(); 

      setVectorStoreId(null);
      setProfileComplete(false);
      
      console.log("[RecPage] Guest reset complete. Redirecting to wizard.");
      router.push('/profile-wizard');
    } catch (error) {
      console.error('Error resetting guest profile:', error);
      setPageError("Failed to reset profile. Please try again.");
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
  
  return (
    <PageWrapper allowGuest>
      {/* Render the Progress Modal */}
      <RecommendationProgressModal
        isOpen={isModalOpen}
        progressStages={RECOMMENDATION_STAGES_ENHANCED.slice(0, 5)} // Adjust based on used stages
        currentStageIndex={currentStageIndex}
        isComplete={isGenerationComplete}
      />

      <GuestLimitMonitor />
      <TooltipProvider>
        <div className="container mx-auto py-6 md:py-10 px-4 max-w-6xl">
          <>
            <div className="mb-6 flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  {/* <span className="bg-blue-100 text-blue-800 p-1.5 rounded-lg inline-flex">
                    <BookOpen className="h-6 w-6" />
                  </span> */}
                  <span>
                    Hi{' '}
                    <span className="text-blue-700">
                      {typedProfile?.first_name ? `${typedProfile.first_name}` : ''}
                    </span>
                    , welcome to your education dashboard
                  </span>
                </h1>
                <p className="text-muted-foreground mt-2 max-w-xl">
                  Explore personalized education pathways, save programs you're interested in, and track your applications.
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
                    <Button variant="link" size="sm" className="p-0 h-auto text-sm ml-1 text-amber-700 font-medium" onClick={() => router.push('/signup')}>
                      Sign up for full access →
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
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push(user ? "/profile" : "/profile-wizard?edit=true")}
                  disabled={!!(user && !typedProfile && !isInitializing)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {user ? "Edit Profile" : "Edit Guest Profile"}
                </Button>

                {user && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive"
                            size="sm" 
                            className="text-white-500 hover:text-red-700 hover:bg-red-50 border border-red-500 hover:border-red-700"
                            disabled={isActionLoading || isAuthResetting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Reset Recommendations
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      {isActionLoading || isAuthResetting ? (
                        <TooltipContent>
                          <p>Resetting in progress...</p>
                        </TooltipContent>
                      ) : null}
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Recommendations?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark all your current pathways and their associated program explorations as deleted. 
                          You can then generate a fresh set of pathways. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isAuthResetting || isActionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleAuthReset} 
                          className="bg-red-600 hover:bg-red-700"
                          disabled={isAuthResetting || isActionLoading}
                        >
                          {isAuthResetting || isActionLoading ? (
                            <>
                              <AnimatedLogo size={20} className="mr-2" />
                              Resetting...
                            </>
                          ) : (
                            "Yes, Reset Now"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {!user && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Start Over
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Guest Profile?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear any profile information you entered as a guest. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isGuestResetting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleGuestReset} 
                          className="bg-red-500 hover:bg-red-600"
                          disabled={isGuestResetting}
                        >
                          {isGuestResetting ? (
                            <>
                              <AnimatedLogo size={20} className="mr-2" />
                              Resetting...
                            </>
                          ) : (
                            "Reset Profile"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
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
                  userProfile={mapSupabaseProfileToUserProfile(typedProfile)} 
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
                      <Button 
                        onClick={() => router.push('/signup')}
                        className="px-6 py-2"
                      >
                        Create Account
                      </Button>
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