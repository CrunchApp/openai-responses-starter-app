"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  DollarSign, 
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
  Loader2,
  Lock,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useToolsStore from "@/stores/useToolsStore";
import useRecommendationsStore from "@/stores/useRecommendationsStore";
import useProfileStore from "@/stores/useProfileStore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { generateRecommendations } from "./actions";
import { RecommendationProgram } from "@/app/recommendations/types";
import HydrationLoading from "@/components/ui/hydration-loading";
import GuestLimitMonitor from "@/components/GuestLimitMonitor";
import { useAuth } from "@/app/components/auth/AuthContext";
import { PageWrapper } from "@/components/layouts/PageWrapper";

export default function RecommendationsPage() {
  const { vectorStore, fileSearchEnabled, setFileSearchEnabled } = useToolsStore();
  const { isProfileComplete, vectorStoreId, setProfileComplete, setVectorStoreId } = useProfileStore();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  
  // Get state from our recommendations store
  const { 
    recommendations, 
    userProfile, 
    isLoading, 
    error: errorMessage, 
    favoritesIds,
    isAuthenticated,
    userId,
    hasReachedGuestLimit,
    generationCount,
    setRecommendations,
    setUserProfile,
    setLoading,
    setError,
    toggleFavorite,
    hydrated
  } = useRecommendationsStore();
    
  // Local UI state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("recommendations");
  const [feedbackProgram, setFeedbackProgram] = useState<string | null>(null);
  
  // For initialization and loading state
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Refs to track initialization status
  const initializedRef = useRef(false);
  const fetchingRef = useRef(false);
  const profileCheckedRef = useRef(false);

  // Destructure the reset functions from the stores
  const { 
    resetProfile, 
  } = useProfileStore();
  
  const { 
    resetState: resetRecommendations 
  } = useRecommendationsStore();

  // Add reset loading state
  const [isResetting, setIsResetting] = useState(false);

  // Memoize the fetchRecommendations function to use in useEffect
  const fetchRecommendationsCallback = useCallback(fetchRecommendations, [vectorStore, favoritesIds, setRecommendations, setUserProfile, setLoading, setError, userProfile, isAuthenticated]);

  // Wait for hydration and auth state before proceeding
  useEffect(() => {
    if (!hydrated || authLoading) {
      console.log("Waiting for hydration or auth loading...");
      return; // Wait for store to hydrate and auth to load
    }
    
    // Get auth state from context and sync with store if needed
    const authFromContext = Boolean(user);
    const authUserId = user?.id || null;
    
    console.log("Auth state:", { 
      contextAuth: authFromContext, 
      storeAuth: isAuthenticated,
      contextUserId: authUserId,
      storeUserId: userId,
      authLoading 
    });
    
    // Check if we need to fetch the user's profile from the database
    const checkProfile = async () => {
      if (profileCheckedRef.current) return;
      profileCheckedRef.current = true;
      
      console.log("Checking profile...");
      
      try {
        // IMPORTANT: Check authentication state from the AuthContext
        if (user) {
          console.log("User is authenticated via AuthContext");
          // For authenticated users, check if their profile exists in the database
          const response = await fetch(`/api/profile/${user.id}`);
          
          if (response.status === 404) {
            // Profile doesn't exist, redirect to profile wizard
            console.log("Profile not found, redirecting to wizard");
            setIsInitializing(false);
            router.push('/profile-wizard');
            return;
          }
          
          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }
          
          const data = await response.json();
          
          if (data.profile) {
            console.log("Profile found:", data.profile);
            // Update state with the profile data
            setUserProfile(data.profile);
            
            if (data.profile.vectorStoreId) {
              setVectorStoreId(data.profile.vectorStoreId);
            }
            
            setProfileComplete(true);
          }
        }
        
        // Enable file search if vector store exists
        if (vectorStore && vectorStore.id && !fileSearchEnabled) {
          setFileSearchEnabled(true);
        }
        
        // Initialization complete
        console.log("Initialization complete");
        setIsInitializing(false);
      } catch (error) {
        console.error('Error checking profile:', error);
        setError('Failed to load profile data');
        setIsInitializing(false);
      }
    };
    
    checkProfile();
  }, [hydrated, authLoading, user, isProfileComplete, vectorStoreId, router, setUserProfile, setProfileComplete, setVectorStoreId, setFileSearchEnabled, vectorStore, fileSearchEnabled, setError, isAuthenticated, userId]);
  
  // Fetch recommendations from the API - NOT auto-triggered
  async function fetchRecommendations() {
    if (!hydrated) {
      console.log("Store not hydrated yet, cannot fetch recommendations");
      setError("Please wait for application to initialize");
      return;
    }
    
    if (authLoading) {
      console.log("Auth still loading, cannot fetch recommendations");
      setError("Please wait for authentication to complete");
      return;
    }
    
    // Get the authentication state from context, not just the store
    const authFromContext = Boolean(user);
    // Use the more reliable auth context state
    const isGuest = !authFromContext;
    const authUserId = user?.id || userId;

    console.log("Fetching recommendations with auth state:", { 
      authFromContext,
      storeAuth: isAuthenticated,
      userId: authUserId,
      isGuest
    });
    
    if (vectorStore && vectorStore.id) {
      try {
        setLoading(true);
        setError(null);
        
        // Get cached profile from localStorage as fallback
        let cachedUserProfile = null;
        try {
          const profileDataString = localStorage.getItem('userProfileData');
          if (profileDataString) {
            cachedUserProfile = JSON.parse(profileDataString);
          }
        } catch (error) {
          console.error('Error parsing cached profile data:', error);
        }
        
        // Use profile data from store or from localStorage
        const profileToUse = userProfile || cachedUserProfile;

        // Call our server action to generate recommendations with consistent guest/auth flag
        const result = await generateRecommendations(
          vectorStore.id, 
          profileToUse,
          isGuest // Pass isGuest flag directly from auth context
        );
        
        processRecommendationResults(result);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setLoading(false);
        fetchingRef.current = false;
      }
    }
  }
  
  // Helper function to process recommendation results
  function processRecommendationResults(result: any) {
    if (result.error) {
      setError(result.error);
    } else if (result.recommendations && result.recommendations.length > 0) {
      // Set favorites based on stored favorites
      const recommendationsWithFavorites = result.recommendations.map((rec: RecommendationProgram) => ({
        ...rec,
        isFavorite: favoritesIds.includes(rec.id)
      }));
      
      setRecommendations(recommendationsWithFavorites);
      
      // Handle database save errors for authenticated users
      if (result.dbSaveError) {
        console.warn("Recommendations generated but not saved properly to database:", result.dbSaveError);
        
        if (result.partialSave) {
          setError(`Some recommendations could not be saved to your account (${result.savedCount}/${result.recommendations.length} saved). The error was: ${result.dbSaveError}`);
        } else {
          setError(`Recommendations generated but couldn't be saved to your account: ${result.dbSaveError}`);
        }
      }
    } else {
      // If no recommendations, set an error message
      setError("No recommendations found that match your profile");
    }
    
    setLoading(false);
    fetchingRef.current = false;
  }

  const handleGoToAssistant = () => {
    // Save current state to enable file search in the chat
    setFileSearchEnabled(true);
    // Navigate to the chat page
    router.push("/chat");
  };

  const handleToggleFavorite = (recommendationId: string) => {
    // Check for auth first - verify user is authenticated before proceeding
    if (!isAuthenticated || !userId) {
      // Either show an authentication modal or redirect to login
      const wantsToSignUp = window.confirm(
        'You need to sign in to save favorites. Would you like to create an account now?'
      );
      
      if (wantsToSignUp) {
        router.push('/auth/signup');
        return;
      }
      return;
    }
    
    // If guest has reached limit and tries to favorite, prompt for sign up  
    if (!isAuthenticated && hasReachedGuestLimit) {
      const wantsToSignUp = window.confirm(
        'You need to sign up to save more than one set of recommendations. Would you like to create an account now?'
      );
      
      if (wantsToSignUp) {
        router.push('/auth/signup');
        return;
      }
    }
    
    try {
      // Only proceed with toggling if we're authenticated or still within guest limits
      toggleFavorite(recommendationId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Display error message to user
      alert('Failed to update favorite status. Please try again later.');
    }
  };

  const handleFeedbackSubmit = (id: string, isPositive: boolean, reason?: string) => {
    // Close feedback dialog
    setFeedbackProgram(null);
    
    // Add analytics or API call here to record feedback
    console.log(`Feedback for ${id}: ${isPositive ? 'Positive' : 'Negative'}${reason ? ` - ${reason}` : ''}`);
    
    // Could update recommendation metrics here if needed
  };
  
  // Variants for animations
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

  // Add reset function
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      // Get the vector store ID from ProfileStore
      const { vectorStoreId } = useProfileStore.getState();
      
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
      
      // Reset all the stores
      resetProfile();
      resetRecommendations();
      setVectorStoreId(null);
      setProfileComplete(false);
      
      // Redirect to profile page
      router.push('/profile-wizard');
    } catch (error) {
      console.error('Error resetting profile:', error);
    } finally {
      setIsResetting(false);
    }
  };

  // Add a banner that appears when profile is loaded until first recommendations are loaded
  useEffect(() => {
    if (!isInitializing && userProfile && !recommendations.length && !isLoading) {
      console.log("Profile loaded but no recommendations yet - showing banner");
    }
  }, [isInitializing, userProfile, recommendations.length, isLoading]);

  // If still initializing, show loading indicator
  if (isInitializing || !hydrated || authLoading) {
    return <HydrationLoading />;
  }

  // Add our guest limit monitor component
  return (
    <PageWrapper allowGuest>
      <GuestLimitMonitor />
      <div className="container mx-auto py-4 md:py-8 px-4 max-w-6xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-600">Generating personalized recommendations...</p>
            <p className="text-zinc-500 text-sm mt-2">This may take a moment as we analyze your profile.</p>
          </div>
        ) : userProfile ? (
          <>
            <div className="mb-6 flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Hi {userProfile.firstName}, welcome to your education dashboard
                </h1>
                <p className="text-zinc-600">
                  Exploring {userProfile.goal} programs in {userProfile.desiredField} based on your profile
                </p>
                
                {/* Account status indicator */}
                {!isAuthenticated && (
                  <div className="mt-2 text-amber-600 flex items-center text-sm">
                    <Shield className="h-4 w-4 mr-1" />
                    Guest mode - <Button variant="link" size="sm" className="p-0 h-auto text-sm ml-1" onClick={() => router.push('/signup')}>
                      Sign up to save your recommendations
                    </Button>
                  </div>
                )}
              </motion.div>
              
              {(!isAuthenticated) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Your Profile & Recommendations?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all your profile data, recommendations, and saved programs. You'll need to start over from the beginning. This action cannot be undone.
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
              )}
            </div>
            
            {/* Guest limit warning */}
            {!isAuthenticated && generationCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md mb-6 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-medium">Guest mode limits</p>
                  <p className="text-sm">
                    You've used {generationCount} of 1 available recommendation generation{generationCount > 1 ? 's' : ''}.{' '}
                    <Button variant="link" size="sm" className="p-0 h-auto text-sm" onClick={() => router.push('/signup')}>
                      Sign up for unlimited recommendations
                    </Button>
                  </p>
                </div>
              </div>
            )}
            
            {/* Add prominent Generate Recommendations button */}
            {!recommendations.length && userProfile && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-5 rounded-md mb-6 flex flex-col items-center justify-center">
                <h3 className="text-xl font-semibold mb-2">Ready to explore educational opportunities?</h3>
                <p className="text-center mb-4">Click below to generate recommendations based on your profile</p>
                <Button 
                  size="lg"
                  onClick={fetchRecommendations} 
                  disabled={isLoading || (!isAuthenticated && hasReachedGuestLimit)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Recommendations...
                    </>
                  ) : (
                    <>
                      <Scroll className="w-5 h-5 mr-2" />
                      Generate Recommendations Now
                    </>
                  )}
                </Button>
                
                {!isAuthenticated && hasReachedGuestLimit && (
                  <div className="mt-4 text-amber-600">
                    <p>You've reached the guest limit. <Button variant="link" className="p-0" onClick={() => router.push('/signup')}>Sign up</Button> for unlimited recommendations.</p>
                  </div>
                )}
              </div>
            )}
            
            {errorMessage && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md mb-6 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-medium">Note</p>
                  <p className="text-sm">{errorMessage}</p>
                </div>
              </div>
            )}
            
            <Tabs defaultValue="recommendations" className="w-full" onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="recommendations" className="text-sm md:text-base">
                  <BookOpen className="w-4 h-4 mr-2 hidden md:inline" />
                  Recommendations
                </TabsTrigger>
                <TabsTrigger value="saved" className="text-sm md:text-base">
                  <Heart className="w-4 h-4 mr-2 hidden md:inline" />
                  Saved Programs
                </TabsTrigger>
                <TabsTrigger value="applications" className="text-sm md:text-base" disabled={!isAuthenticated}>
                  <FileText className="w-4 h-4 mr-2 hidden md:inline" />
                  Applications
                  {!isAuthenticated && <Lock className="w-3 h-3 ml-1" />}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="recommendations">
                {recommendations.length > 0 ? (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">Programs matched to your profile</h2>
                        <p className="text-sm text-zinc-500">{recommendations.length} recommendations found</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push("/profile?edit=true")}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                        
                        {/* Only show generate new recommendations button for authenticated users 
                            or guests who haven't reached their limit */}
                        {(isAuthenticated || !hasReachedGuestLimit) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={fetchRecommendations}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Scroll className="w-4 h-4 mr-2" />
                                Generate New
                              </>
                            )}
                          </Button>
                        )}
                        
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">Sort By</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>Match Score (High to Low)</DropdownMenuItem>
                          <DropdownMenuItem>Cost (Low to High)</DropdownMenuItem>
                          <DropdownMenuItem>Duration (Short to Long)</DropdownMenuItem>
                          <DropdownMenuItem>Application Deadline</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {recommendations.map((program) => (
                    <motion.div 
                      key={program.id}
                      variants={itemVariants}
                      layout
                    >
                      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md ${program.id === expandedCardId ? 'ring-2 ring-blue-200' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg md:text-xl font-bold mb-1">
                                {program.name}
                              </CardTitle>
                              <CardDescription className="text-base">
                                {program.institution}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm font-semibold flex items-center">
                                <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
                                {program.matchScore}% Match
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="mt-2" 
                                onClick={() => handleToggleFavorite(program.id)}
                              >
                                <Heart 
                                  className={`h-5 w-5 ${program.isFavorite ? 'fill-red-500 text-red-500' : 'text-zinc-400'}`} 
                                />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">${(program.costPerYear ?? 0).toLocaleString()}/year</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.duration ?? 0} months</span>
                            </div>
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.location || 'N/A'}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.startDate || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <p className="text-sm text-zinc-700 line-clamp-2">
                              {program.description}
                            </p>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0 flex flex-col items-stretch">
                          <Accordion 
                            type="single" 
                            collapsible 
                            onValueChange={(value) => {
                              if (value) {
                                setExpandedCardId(program.id);
                              } else {
                                setExpandedCardId(null);
                              }
                            }}
                          >
                            <AccordionItem value="details" className="border-none">
                              <AccordionTrigger className="py-2 text-sm font-medium text-blue-600">
                                Show program details
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 pt-2">
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Why This Matches Your Profile</h4>
                                    <div className="space-y-2">
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Career Alignment</span>
                                          <span>{program.matchRationale?.careerAlignment ?? 0}%</span>
                                        </div>
                                        <Progress value={program.matchRationale?.careerAlignment ?? 0} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Budget Fit</span>
                                          <span>{program.matchRationale?.budgetFit ?? 0}%</span>
                                        </div>
                                        <Progress value={program.matchRationale?.budgetFit ?? 0} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Location Match</span>
                                          <span>{program.matchRationale?.locationMatch ?? 0}%</span>
                                        </div>
                                        <Progress value={program.matchRationale?.locationMatch ?? 0} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Academic Fit</span>
                                          <span>{program.matchRationale?.academicFit ?? 0}%</span>
                                        </div>
                                        <Progress value={program.matchRationale?.academicFit ?? 0} className="h-2" />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Program Highlights</h4>
                                      <ul className="list-disc pl-5 text-sm space-y-1">
                                        {program.highlights.map((highlight, index) => (
                                          <li key={index}>{highlight}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Application Requirements</h4>
                                      <ul className="list-disc pl-5 text-sm space-y-1">
                                        {program.requirements.map((req, index) => (
                                          <li key={index}>{req}</li>
                                        ))}
                                      </ul>
                                      <p className="text-xs text-zinc-500 mt-2">
                                        Application Deadline: <span className="font-medium">{program.applicationDeadline}</span>
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="pt-2 flex flex-col md:flex-row gap-3 justify-between">
                                    <div className="flex flex-col md:flex-row gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleGoToAssistant}
                                      >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Ask AI About This Program
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => setFeedbackProgram(program.id)}
                                          >
                                            <Info className="w-4 h-4 mr-2" />
                                            Give Feedback
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Program Feedback</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Is this program relevant to your educational goals?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <div className="flex flex-col gap-4 py-4">
                                            <div className="flex gap-4">
                                              <Button 
                                                variant="outline" 
                                                className="flex-1 flex gap-2"
                                                onClick={() => handleFeedbackSubmit(program.id, true)}
                                              >
                                                <ThumbsUp className="h-4 w-4" />
                                                Yes, this fits
                                              </Button>
                                              <Button 
                                                variant="outline" 
                                                className="flex-1 flex gap-2"
                                                onClick={() => handleFeedbackSubmit(program.id, false)}
                                              >
                                                <ThumbsDown className="h-4 w-4" />
                                                Not relevant
                                              </Button>
                                            </div>
                                            <div className="border-t pt-4">
                                              <h4 className="text-sm font-medium mb-3">If not relevant, why?</h4>
                                              <RadioGroup defaultValue="default">
                                                <div className="flex items-center space-x-2 mb-2">
                                                  <RadioGroupItem value="interest" id="interest" />
                                                  <Label htmlFor="interest">Changed interest area</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                  <RadioGroupItem value="cost" id="cost" />
                                                  <Label htmlFor="cost">Too expensive</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                  <RadioGroupItem value="location" id="location" />
                                                  <Label htmlFor="location">Location not suitable</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <RadioGroupItem value="requirements" id="requirements" />
                                                  <Label htmlFor="requirements">Requirements too demanding</Label>
                                                </div>
                                              </RadioGroup>
                                            </div>
                                          </div>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleFeedbackSubmit(program.id, false, "Changed interest area")}>
                                              Submit Feedback
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                    <Button>
                                      Explore Program
                                    </Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
                    <p className="text-zinc-600 mb-6">Generate recommendations based on your profile</p>
                    <Button 
                      onClick={fetchRecommendations} 
                      disabled={isLoading || (!isAuthenticated && hasReachedGuestLimit)}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Recommendations...
                        </>
                      ) : (
                        <>
                          <Scroll className="w-5 h-5 mr-2" />
                          Generate Recommendations
                        </>
                      )}
                    </Button>
                    
                    {!isAuthenticated && hasReachedGuestLimit && (
                      <div className="mt-4 text-amber-600">
                        <p>You've reached the guest limit. <Button variant="link" className="p-0" onClick={() => router.push('/signup')}>Sign up</Button> for unlimited recommendations.</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="saved">
                {favoritesIds.length > 0 ? (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <h2 className="text-xl font-semibold mb-6">Your Saved Programs</h2>
                    
                    {recommendations.filter(rec => rec.isFavorite).map(program => (
                      <Card key={program.id} className="flex flex-col md:flex-row overflow-hidden hover:shadow-md transition-all duration-300">
                        <div className="md:w-3/4 p-4">
                          <h3 className="font-semibold text-lg">{program.name}</h3>
                          <p className="text-sm text-zinc-600">{program.institution}</p>
                          <div className="flex gap-3 mt-2 text-sm text-zinc-700">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {program.duration ?? 0} months
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${(program.costPerYear ?? 0).toLocaleString()}/year
                            </span>
                          </div>
                          <p className="text-xs mt-2 text-zinc-500">Saved on {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="md:w-1/4 bg-gray-50 p-4 flex flex-col justify-center items-center">
                          <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 hover:bg-blue-50">
                            <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                            {program.matchScore}% Match
                          </Badge>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="ghost" onClick={() => handleToggleFavorite(program.id)}>
                              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                            </Button>
                            <Button size="sm">View Details</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-semibold mb-2">No saved programs yet</h3>
                    <p className="text-zinc-600 mb-6">
                      {!isAuthenticated ? 
                        "Create an account to save your favorite programs" : 
                        "Save programs by clicking the heart icon"
                      }
                    </p>
                    
                    {!isAuthenticated && (
                      <Button onClick={() => router.push('/signup')}>
                        Create Account
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="applications">
                {isAuthenticated ? (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
                    <p className="text-zinc-600 mb-6">Track your education program applications here</p>
                    <Button variant="outline">
                      Start an Application
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-semibold mb-2">Sign in to track applications</h3>
                    <p className="text-zinc-600 mb-6">Create an account to manage your program applications</p>
                    <Button onClick={() => router.push('/signup')}>
                      Create Account
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">Profile not found</h3>
            <p className="text-zinc-600 mb-6">Please complete your profile to get recommendations</p>
            <Button onClick={() => router.push('/profile-wizard')}>
              Complete Profile
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
} 