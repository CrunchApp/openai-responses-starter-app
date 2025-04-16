"use client";
import { Edit, Trash2, HelpCircle, RefreshCw, UserCog, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AnimatedLogo from "@/components/ui/AnimatedLogo";
import { useRouter } from "next/navigation";

interface RecommendationOptionsModalProps {
  user: any;
  typedProfile: any;
  isInitializing: boolean;
  isGuestResetting: boolean;
  isAuthResetting: boolean;
  isActionLoading: boolean;
  handleGuestReset: () => Promise<void>;
  handleAuthReset: () => Promise<void>;
}

export function RecommendationOptionsModal({
  user,
  typedProfile,
  isInitializing,
  isGuestResetting,
  isAuthResetting,
  isActionLoading,
  handleGuestReset,
  handleAuthReset,
}: RecommendationOptionsModalProps) {
  const router = useRouter();
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full p-2 h-8 w-8 flex items-center justify-center bg-white shadow-sm">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          <span className="sr-only">Recommendation Options</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span>Improve Your Recommendations</span>
          </DialogTitle>
          <DialogDescription>
            Looking for better recommendations? Here are some options to help you get more personalized results.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2 p-4 rounded-lg border bg-blue-50">
            <h3 className="font-medium text-lg flex items-center gap-2 text-blue-700">
              <UserCog className="h-5 w-5" />
              <span>Update Your Profile</span>
            </h3>
            <p className="text-sm text-blue-700/80 leading-relaxed mb-3">
              Provide more details about your goals, education history, skills, and preferences. 
              The more complete your profile, the more accurate our recommendations will be.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start bg-white border-blue-200 hover:bg-blue-100 hover:text-blue-700 w-fit"
              onClick={() => {
                router.push(user ? "/profile" : "/profile-wizard?edit=true");
              }}
              disabled={!!(user && !typedProfile && !isInitializing)}
            >
              <Edit className="w-4 h-4 mr-2" />
              {user ? "Edit Profile" : "Edit Guest Profile"}
            </Button>
          </div>

          <div className="grid gap-2 p-4 rounded-lg border bg-red-50">
            <h3 className="font-medium text-lg flex items-center gap-2 text-red-700">
              <RefreshCw className="h-5 w-5" />
              <span>Start Fresh</span>
            </h3>
            <p className="text-sm text-red-700/80 leading-relaxed mb-3">
              If the current recommendations aren't aligned with your expectations, 
              you can reset them and generate a new set based on your profile.
            </p>
            
            {user ? (
              <TooltipProvider>
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="justify-start bg-white border-red-200 hover:bg-red-100 hover:text-red-700 w-fit"
                          disabled={isActionLoading || isAuthResetting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Reset All Recommendations
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    {isActionLoading || isAuthResetting ? (
                      <TooltipContent>
                        <p>Resetting in progress...</p>
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Recommendations?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark all your current pathways and their associated program explorations as deleted. 
                        You can then generate a fresh set of pathways. Are you sure?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
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
              </TooltipProvider>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start bg-white border-red-200 hover:bg-red-100 hover:text-red-700 w-fit"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Guest Profile?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear any profile information you entered as a guest. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
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

          <div className="rounded-lg border-l-4 border-green-400 bg-green-50 p-4">
            <h3 className="font-medium text-green-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span>Pro Tips for Better Recommendations</span>
            </h3>
            <ul className="text-sm text-green-700 mt-2 space-y-2 list-disc pl-5">
              <li>Be specific about your career goals and desired industry</li>
              <li>Include all relevant education history and qualifications</li>
              <li>Specify location preferences if you have any</li>
              <li>Set a realistic budget range for your education</li>
              <li>List your skills and strengths to help match with suitable programs</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 