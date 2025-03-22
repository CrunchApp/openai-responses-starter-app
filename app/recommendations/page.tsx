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
  Loader2
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
import HydrationLoading from "@/components/ui/hydration-loading";

export default function RecommendationsPage() {
  const { vectorStore, fileSearchEnabled, setFileSearchEnabled } = useToolsStore();
  const { isProfileComplete, vectorStoreId } = useProfileStore();
  const router = useRouter();
  
  // Get state from our recommendations store
  const { 
    recommendations, 
    userProfile, 
    isLoading, 
    error: errorMessage, 
    favoritesIds,
    setRecommendations,
    setUserProfile,
    setLoading,
    setError,
    toggleFavorite,
    getFavoriteRecommendations,
    hydrated
  } = useRecommendationsStore();
    
  // Local UI state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("recommendations");
  const [feedbackProgram, setFeedbackProgram] = useState<string | null>(null);
  
  // Refs to track initialization status
  const initializedRef = useRef(false);
  const fetchingRef = useRef(false);

  // Destructure the reset functions from the stores
  const { 
    resetProfile, 
    setProfileComplete, 
    setVectorStoreId 
  } = useProfileStore();
  
  const { 
    resetState: resetRecommendations 
  } = useRecommendationsStore();

  // Add reset loading state
  const [isResetting, setIsResetting] = useState(false);

  // Memoize the fetchRecommendations function to use in useEffect
  const fetchRecommendationsCallback = useCallback(fetchRecommendations, [vectorStore, favoritesIds, setRecommendations, setUserProfile, setLoading, setError, userProfile]);

  // Redirect to profile page if profile is not complete
  useEffect(() => {
    if (!isProfileComplete && !vectorStoreId) {
      router.push("/profile");
    }
  }, [isProfileComplete, vectorStoreId, router]);

  // Ensure file search is enabled and fetch recommendations once after hydration
  useEffect(() => {
    // Only run the initialization once after hydration
    if (hydrated && !initializedRef.current) {
      initializedRef.current = true;
      
      // Enable file search if needed
      if (vectorStore && vectorStore.id && !fileSearchEnabled) {
        setFileSearchEnabled(true);
      }
      
      // Fetch recommendations if needed
      if (vectorStore?.id && !recommendations.length && !isLoading && !fetchingRef.current) {
        fetchingRef.current = true;
        fetchRecommendationsCallback();
      }
    }
  }, [hydrated, vectorStore, fileSearchEnabled, recommendations.length, isLoading, fetchRecommendationsCallback, setFileSearchEnabled]);
  
  // Get favorite recommendations only after hydration
  const favoriteRecommendations = hydrated ? getFavoriteRecommendations() : [];
  
  // Fetch recommendations from the API
  async function fetchRecommendations() {
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
        
        // Call our server action to generate recommendations
        const result = await generateRecommendations(
          vectorStore.id, 
          profileToUse
        );
        
        if (result.error) {
          setError(result.error);
        } else if (result.recommendations && result.recommendations.length > 0) {
          // Set favorites based on stored favorites
          const recommendationsWithFavorites = result.recommendations.map(rec => ({
            ...rec,
            isFavorite: favoritesIds.includes(rec.id)
          }));
          
          setRecommendations(recommendationsWithFavorites);
          
          // If we don't have a user profile in the store, create one from the recommendation
          if (!userProfile && cachedUserProfile) {
            setUserProfile(cachedUserProfile);
          } else if (!userProfile && result.recommendations[0]) {
            // Create a minimal profile from the first recommendation
            const firstRec = result.recommendations[0];
            setUserProfile({
              firstName: "User", // Generic placeholder
              lastName: "",
              email: "",
              goal: firstRec.degreeType,
              desiredField: firstRec.fieldOfStudy,
              education: [{
                degreeLevel: "Bachelor's",
                institution: "Previous Institution",
                fieldOfStudy: firstRec.fieldOfStudy,
                graduationYear: "2023"
              }],
              careerGoals: {
                shortTerm: "Advance in " + firstRec.fieldOfStudy,
                longTerm: "Become a leader in " + firstRec.fieldOfStudy,
                desiredIndustry: [firstRec.fieldOfStudy],
                desiredRoles: ["Professional in " + firstRec.fieldOfStudy]
              },
              skills: [],
              preferences: {
                preferredLocations: [firstRec.location.split(',')[firstRec.location.split(',').length - 1].trim()],
                studyMode: "Full-time",
                startDate: firstRec.startDate,
                budgetRange: {
                  min: Math.max(10000, firstRec.costPerYear - 10000),
                  max: firstRec.costPerYear + 10000
                }
              }
            });
          }
        } else {
          // If no recommendations, set an error message
          setError("No recommendations found that match your profile");
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }
  }

  const handleGoToAssistant = () => {
    // Save current state to enable file search in the chat
    setFileSearchEnabled(true);
    // Navigate to the chat page
    router.push("/chat");
  };

  const handleToggleFavorite = (recommendationId: string) => {
    toggleFavorite(recommendationId);
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
      
      // Get the vector store ID
      const vectorStoreId = localStorage.getItem('userVectorStoreId');
      
      // First clean up the vector store and uploaded files
      if (vectorStoreId) {
        const cleanupResponse = await fetch(`/api/vector_stores/cleanup?vector_store_id=${vectorStoreId}`, {
          method: 'DELETE'
        });
        
        if (!cleanupResponse.ok) {
          console.error('Failed to clean up vector store:', cleanupResponse.statusText);
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('userVectorStoreId');
      localStorage.removeItem('userProfileData');
      
      // Reset all the stores
      resetProfile();
      resetRecommendations();
      setVectorStoreId(null);
      setProfileComplete(false);
      
      // Redirect to profile page
      router.push('/profile');
    } catch (error) {
      console.error('Error resetting profile:', error);
    } finally {
      setIsResetting(false);
    }
  };

  // If not hydrated yet, show loading indicator
  if (!hydrated) {
    return <HydrationLoading />;
  }

  return (
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
            </motion.div>
            
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
          </div>
          
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
              <TabsTrigger value="applications" className="text-sm md:text-base">
                <FileText className="w-4 h-4 mr-2 hidden md:inline" />
                Applications
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
                      <Button variant="outline" size="sm" onClick={() => router.push("/profile?edit=true")}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
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
                              <span className="text-sm">${program.costPerYear.toLocaleString()}/year</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.duration} months</span>
                            </div>
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.location}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-zinc-500 mr-2" />
                              <span className="text-sm">{program.startDate}</span>
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
                                          <span>{program.matchRationale.careerAlignment}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.careerAlignment} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Budget Fit</span>
                                          <span>{program.matchRationale.budgetFit}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.budgetFit} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Location Match</span>
                                          <span>{program.matchRationale.locationMatch}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.locationMatch} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span>Academic Fit</span>
                                          <span>{program.matchRationale.academicFit}%</span>
                                        </div>
                                        <Progress value={program.matchRationale.academicFit} className="h-2" />
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
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                  <div className="mb-4 bg-amber-100 p-4 inline-block rounded-full">
                    <Info className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No recommendations found</h3>
                  <p className="text-zinc-600 mb-6 max-w-md mx-auto">
                    We couldn&apos;t find programs matching your current profile. Try adjusting your preferences to see more recommendations.
                  </p>
                  <Button onClick={() => router.push("/profile?edit=true")}>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Your Profile
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="saved">
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Your Saved Programs</h2>
                
                {recommendations.filter(rec => rec.isFavorite).length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.filter(rec => rec.isFavorite).map(program => (
                      <Card key={program.id} className="flex flex-col md:flex-row overflow-hidden hover:shadow-md transition-all duration-300">
                        <div className="md:w-3/4 p-4">
                          <h3 className="font-semibold text-lg">{program.name}</h3>
                          <p className="text-sm text-zinc-600">{program.institution}</p>
                          <div className="flex gap-3 mt-2 text-sm text-zinc-700">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {program.duration} months
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${program.costPerYear.toLocaleString()}/year
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
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-10 w-10 mx-auto text-zinc-300 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 mb-2">No saved programs yet</h3>
                    <p className="text-zinc-500 mb-4">
                      When you find programs you like, click the heart icon to save them for later.
                    </p>
                    <Button variant="outline" onClick={() => setSelectedTab("recommendations")}>
                      Browse Recommendations
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="applications">
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Your Applications</h2>
                
                <div className="text-center py-8">
                  <Scroll className="h-10 w-10 mx-auto text-zinc-300 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-700 mb-2">No applications in progress</h3>
                  <p className="text-zinc-500 mb-4">
                    When you&apos;re ready to apply to programs, you can track your applications here.
                  </p>
                  <Button variant="outline" onClick={() => setSelectedTab("recommendations")}>
                    Explore Programs
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-2xl mx-auto">
          <div className="mb-4 bg-amber-100 p-4 inline-block rounded-full">
            <User className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Profile not complete</h3>
          <p className="text-zinc-600 mb-6">
            To see personalized education recommendations, you need to complete your profile first.
          </p>
          <Button onClick={() => router.push("/profile")}>
            Complete Your Profile
          </Button>
        </div>
      )}
      
      <div className="mt-12 text-center">
        <p className="text-sm text-zinc-500 mb-2">Need help exploring your options?</p>
        <Button variant="outline" onClick={handleGoToAssistant}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat with your AI Education Adviser
        </Button>
      </div>
    </div>
  );
} 