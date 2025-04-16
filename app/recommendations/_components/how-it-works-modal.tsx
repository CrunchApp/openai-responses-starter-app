"use client";
import { Info, Lightbulb, GraduationCap, ArrowRight, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HowItWorksModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full p-2 h-8 w-8 flex items-center justify-center bg-white shadow-sm">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="sr-only">How It Works</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <span>How Our Recommendations Work</span>
          </DialogTitle>
          <DialogDescription>
            Our two-step process creates personalized education recommendations
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Two-step visual process */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Step 1: Pathways</span>
            </div>
            
            <ArrowRight className="h-6 w-6 text-gray-400 hidden sm:block" />
            <div className="rotate-90 sm:rotate-0 h-6 w-6 text-gray-400 block sm:hidden">
              <ArrowRight className="h-full w-full" />
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Search className="h-8 w-8 text-green-600" />
              </div>
              <span className="text-sm font-medium">Step 2: Programs</span>
            </div>
          </div>
          
          {/* Step 1 */}
          <div className="grid gap-2 p-4 rounded-lg border bg-blue-50">
            <h3 className="font-medium text-lg flex items-center gap-2 text-blue-700">
              <div className="flex h-6 w-6 rounded-full bg-blue-100 items-center justify-center text-blue-700 text-sm font-semibold">1</div>
              <span>Education Pathways</span>
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-4 pl-8">
              <div className="bg-white rounded-lg p-3 flex-1 shadow-sm">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 mb-2">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-medium mb-1">AI Planning</h4>
                <p className="text-xs text-muted-foreground">Analyzes your profile to suggest broad education directions</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 flex-1 shadow-sm">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 mb-2">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-medium mb-1">Tailored Paths</h4>
                <p className="text-xs text-muted-foreground">Creates focused education paths like "Data Science" or "Mechanical Engineering"</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid gap-2 p-4 rounded-lg border bg-green-50">
            <h3 className="font-medium text-lg flex items-center gap-2 text-green-700">
              <div className="flex h-6 w-6 rounded-full bg-green-100 items-center justify-center text-green-700 text-sm font-semibold">2</div>
              <span>Specific Programs</span>
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-4 pl-8">
              <div className="bg-white rounded-lg p-3 flex-1 shadow-sm">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 mb-2">
                  <Search className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="text-sm font-medium mb-1">Research</h4>
                <p className="text-xs text-muted-foreground">Searches and finds specific programs from global institutions for each pathway</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 flex-1 shadow-sm">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 mb-2">
                  <ArrowRight className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="text-sm font-medium mb-1">Matching</h4>
                <p className="text-xs text-muted-foreground">Scores each program based on your location, budget, and preferences</p>
              </div>
            </div>
          </div>
          
          {/* Quick visual tip */}
          <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
            <h3 className="font-medium text-amber-800 flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4" />
              <span>Pro Tip</span>
            </h3>
            <div className="flex items-center mt-2 text-amber-700">
              <span className="text-2xl mr-2">👤</span>
              <span className="text-xs">Complete profile</span>
              <ArrowRight className="h-3 w-3 mx-2" />
              <span className="text-2xl mr-2">🛣️</span>
              <span className="text-xs">Choose pathway</span>
              <ArrowRight className="h-3 w-3 mx-2" />
              <span className="text-2xl mr-2">🎓</span>
              <span className="text-xs">Explore programs</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 