"use client";
import React, { useState } from "react";
import { ProfileData } from "../profile-wizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth0 } from "@auth0/auth0-react";
import { ArrowRight, Linkedin, AlertCircle, CheckCircle2 } from "lucide-react";

interface LinkedInImportStepProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
  onManualEntry: () => void;
}

export default function LinkedInImportStep({
  profileData,
  setProfileData,
  onManualEntry,
}: LinkedInImportStepProps) {
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { loginWithPopup, getAccessTokenSilently, user } = useAuth0();

  const handleLinkedInImport = async () => {
    setImportStatus("loading");
    setErrorMessage(null);
    
    try {
      // Login with Auth0, specifying LinkedIn as the connection
      await loginWithPopup({
        authorizationParams: {
          connection: 'linkedin',
          scope: 'openid profile email',
        }
      });
      
      // Get the access token
      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://api.linkedin.com/',
          scope: 'openid profile email r_emailaddress r_liteprofile r_basicprofile',
        },
      });
      
      // Fetch LinkedIn profile data
      const response = await fetch('/api/auth/linkedin-profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch LinkedIn profile data');
      }
      
      const linkedInData = await response.json();
      
      // Update profile data with LinkedIn information
      setProfileData(prevData => ({
        ...prevData,
        firstName: linkedInData.firstName || prevData.firstName,
        lastName: linkedInData.lastName || prevData.lastName,
        email: linkedInData.email || prevData.email,
        phone: linkedInData.phone || prevData.phone,
        linkedInProfile: linkedInData.profileUrl,
        // Map education data if available
        ...(linkedInData.education && {
          education: linkedInData.education.map((edu: any) => ({
            degreeLevel: edu.degree || "",
            institution: edu.schoolName || "",
            fieldOfStudy: edu.fieldOfStudy || "",
            graduationYear: edu.endDate?.year?.toString() || "",
          })),
        }),
        // Map career and skills data if available
        ...(linkedInData.positions && {
          careerGoals: {
            ...prevData.careerGoals,
            desiredIndustry: 
              linkedInData.positions.map((pos: any) => pos.industry || "").filter(Boolean),
            desiredRoles: 
              linkedInData.positions.map((pos: any) => pos.title || "").filter(Boolean),
          },
          skills: linkedInData.skills?.map((skill: any) => skill.name || "").filter(Boolean) || [],
        }),
      }));
      
      setImportStatus("success");
    } catch (error) {
      console.error("LinkedIn import error:", error);
      setImportStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to import LinkedIn profile");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Import Your Professional Profile</h2>
        <p className="text-zinc-500">
          Let us help you create a personalized education journey by importing your professional data.
        </p>
      </div>

      <Card className="p-6 border-2 border-dashed border-blue-200 bg-blue-50">
        <div className="flex flex-col items-center space-y-4">
          <Linkedin className="h-12 w-12 text-blue-700" />
          <h3 className="text-xl font-medium text-center">Import from LinkedIn</h3>
          <p className="text-sm text-center text-zinc-600 max-w-md">
            Automatically fill your profile details with information from your LinkedIn account.
            We'll only access the data you authorize.
          </p>
          
          {importStatus === "success" && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md w-full">
              <CheckCircle2 className="h-5 w-5" />
              <span>Successfully imported your LinkedIn profile!</span>
            </div>
          )}
          
          {importStatus === "error" && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md w-full">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage || "Failed to import LinkedIn profile. Please try again."}</span>
            </div>
          )}
          
          <Button 
            onClick={handleLinkedInImport}
            disabled={importStatus === "loading"}
            className="bg-blue-700 hover:bg-blue-800 text-white w-full"
            size="lg"
          >
            {importStatus === "loading" ? "Importing..." : "Import from LinkedIn"}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col items-center space-y-4 pt-4">
        <p className="text-sm text-zinc-500">
          Prefer to enter your information manually?
        </p>
        <Button 
          variant="outline" 
          onClick={onManualEntry}
          className="flex items-center space-x-2"
        >
          <span>Continue with manual entry</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 