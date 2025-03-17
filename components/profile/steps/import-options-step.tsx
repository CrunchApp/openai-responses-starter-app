"use client";
import React, { useState } from "react";
import { ImportOptionsStepProps } from "../profile-wizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth0 } from "@auth0/auth0-react";
import FileUpload from "@/components/file-upload";
import { 
  ArrowRight, 
  Linkedin, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  BookOpen 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImportOptionsStep({
  profileData,
  setProfileData,
  onComplete,
}: ImportOptionsStepProps) {
  const [activeTab, setActiveTab] = useState("linkedin");
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<{
    resume: boolean;
    transcripts: boolean;
    statementOfPurpose: boolean;
  }>({
    resume: !!profileData.documents.resume,
    transcripts: !!profileData.documents.transcripts,
    statementOfPurpose: !!profileData.documents.statementOfPurpose,
  });
  
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

  // Handle when a file is added to the vector store
  const handleFileUploaded = (fileId: string, type: string) => {
    setProfileData((prevData) => ({
      ...prevData,
      documents: {
        ...prevData.documents,
        [type]: fileId,
      },
    }));

    setUploadedFiles((prev) => ({
      ...prev,
      [type as keyof typeof prev]: true,
    }));
  };

  // Calculate the number of uploaded documents
  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;
  const uploadProgress = (uploadedCount / 3) * 100;
  const linkedInImported = importStatus === "success";

  const hasImportedData = linkedInImported || uploadedCount > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-2xl font-semibold">Tell Vista About Yourself</h2>
        <p className="text-zinc-500 max-w-md mx-auto">
          Import your professional profile or upload documents to help Vista understand your background.
        </p>
      </div>

      <AnimatePresence>
        {showTip && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 p-4 rounded-md border border-blue-200 relative overflow-hidden mb-4"
          >
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute top-2 right-2" 
              onClick={() => setShowTip(false)}
            >
              <X size={16} />
            </Button>
            <div className="flex items-start">
              <BookOpen className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Save time with imports</p>
                <p className="text-xs text-blue-600 mt-1">
                  You can import from LinkedIn and upload documents to automatically fill parts of your profile.
                  This step is optional—you can also enter all information manually in the next steps.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger 
            value="linkedin" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Linkedin size={16} />
            LinkedIn Import
            {linkedInImported && (
              <CheckCircle2 size={16} className="text-green-500 data-[state=active]:text-white" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <FileText size={16} />
            Upload Documents
            {uploadedCount > 0 && (
              <span className="bg-blue-100 text-blue-800 data-[state=active]:bg-white data-[state=active]:text-blue-800 text-xs rounded-full px-2 py-0.5">
                {uploadedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linkedin" className="space-y-4">
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
                className={`w-full ${importStatus === "success" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-blue-700 hover:bg-blue-800"} text-white`}
                size="lg"
              >
                {importStatus === "loading" 
                  ? "Importing..." 
                  : importStatus === "success" 
                    ? "Successfully Imported" 
                    : "Import from LinkedIn"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resume Upload */}
            <Card className="p-4 border bg-white shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <h3 className="font-medium">Resume/CV</h3>
              </div>

              {uploadedFiles.resume ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-sm">Uploaded</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-700 hover:bg-green-50 h-8"
                    onClick={() => {
                      setProfileData((prevData) => ({
                        ...prevData,
                        documents: {
                          ...prevData.documents,
                          resume: undefined,
                        },
                      }));
                      setUploadedFiles((prev) => ({ ...prev, resume: false }));
                    }}
                  >
                    <X size={14} className="mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <FileUpload
                  allowedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                  maxSizeMB={5}
                  endpoint="/api/upload/document"
                  onSuccess={(fileId) => handleFileUploaded(fileId, "resume")}
                  className="h-20"
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <Upload size={16} className="mb-1 text-blue-500" />
                    <span className="text-xs text-center text-gray-500">Upload Resume</span>
                  </div>
                </FileUpload>
              )}
            </Card>

            {/* Transcripts Upload */}
            <Card className="p-4 border bg-white shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <h3 className="font-medium">Transcripts</h3>
              </div>

              {uploadedFiles.transcripts ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-sm">Uploaded</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-700 hover:bg-green-50 h-8"
                    onClick={() => {
                      setProfileData((prevData) => ({
                        ...prevData,
                        documents: {
                          ...prevData.documents,
                          transcripts: undefined,
                        },
                      }));
                      setUploadedFiles((prev) => ({ ...prev, transcripts: false }));
                    }}
                  >
                    <X size={14} className="mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <FileUpload
                  allowedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                  maxSizeMB={5}
                  endpoint="/api/upload/document"
                  onSuccess={(fileId) => handleFileUploaded(fileId, "transcripts")}
                  className="h-20"
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <Upload size={16} className="mb-1 text-blue-500" />
                    <span className="text-xs text-center text-gray-500">Upload Transcripts</span>
                  </div>
                </FileUpload>
              )}
            </Card>

            {/* Statement of Purpose Upload */}
            <Card className="p-4 border bg-white shadow-sm transition-all duration-300 hover:shadow-md md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <h3 className="font-medium">Statement of Purpose</h3>
              </div>

              {uploadedFiles.statementOfPurpose ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-sm">Uploaded</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-700 hover:bg-green-50 h-8"
                    onClick={() => {
                      setProfileData((prevData) => ({
                        ...prevData,
                        documents: {
                          ...prevData.documents,
                          statementOfPurpose: undefined,
                        },
                      }));
                      setUploadedFiles((prev) => ({ ...prev, statementOfPurpose: false }));
                    }}
                  >
                    <X size={14} className="mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <FileUpload
                  allowedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                  maxSizeMB={5}
                  endpoint="/api/upload/document"
                  onSuccess={(fileId) => handleFileUploaded(fileId, "statementOfPurpose")}
                  className="h-20"
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <Upload size={16} className="mb-1 text-blue-500" />
                    <span className="text-xs text-center text-gray-500">Upload Statement of Purpose</span>
                  </div>
                </FileUpload>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t mt-6">
        <p className="text-sm text-zinc-500 mb-4 sm:mb-0">
          {hasImportedData 
            ? "You can continue filling your profile in the next steps."
            : "You can continue without importing data and fill your profile manually."}
        </p>
        <Button 
          onClick={onComplete}
          className="flex items-center space-x-2 min-w-[150px]"
          size="lg"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 