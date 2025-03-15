"use client";
import React, { useState } from "react";
import { ProfileData } from "../profile-wizard";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/file-upload";
import { FileText, Check, X } from "lucide-react";

interface DocumentsStepProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
}

export default function DocumentsStep({
  profileData,
  setProfileData,
}: DocumentsStepProps) {
  const [activeTab, setActiveTab] = useState("resume");
  const [uploadedFiles, setUploadedFiles] = useState<{
    resume: boolean;
    transcripts: boolean;
    statementOfPurpose: boolean;
    otherDocuments: boolean;
  }>({
    resume: !!profileData.documents.resume,
    transcripts: !!profileData.documents.transcripts,
    statementOfPurpose: !!profileData.documents.statementOfPurpose,
    otherDocuments: profileData.documents.otherDocuments?.length > 0,
  });

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
      [type]: true,
    }));
  };

  // Skip any real file upload handling in the component - we'll use the FileUpload component
  const handleAddStore = (id: string) => {
    console.log(`Vector store created/added with ID: ${id}`);
  };

  const handleUnlinkStore = () => {
    console.log("Store unlinked");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Upload relevant documents to enhance your profile and help us provide better recommendations.
      </p>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="resume" className="flex items-center gap-2">
            Resume/CV
            {uploadedFiles.resume && <Check size={16} className="text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="transcripts" className="flex items-center gap-2">
            Transcripts
            {uploadedFiles.transcripts && <Check size={16} className="text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="statement" className="flex items-center gap-2">
            Statement of Purpose
            {uploadedFiles.statementOfPurpose && <Check size={16} className="text-green-600" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume" className="space-y-4">
          <div className="p-4 border rounded-md bg-zinc-50">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={24} className="text-blue-600" />
              <div>
                <h3 className="font-medium">Resume or CV</h3>
                <p className="text-sm text-zinc-500">
                  Upload your resume or CV in PDF format
                </p>
              </div>
            </div>

            {uploadedFiles.resume ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <Check size={16} />
                  <span>Successfully uploaded</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
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
                  <X size={16} className="mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <FileUpload
                  vectorStoreId={profileData.vectorStoreId ?? ""}
                  onAddStore={(id) => {
                    handleAddStore(id);
                    // When a file is uploaded via the FileUpload component, it will trigger this callback
                    // In a real implementation, you'd get the file ID here and associate it with the profile
                    handleFileUploaded(id, "resume");
                  }}
                  onUnlinkStore={handleUnlinkStore}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transcripts" className="space-y-4">
          <div className="p-4 border rounded-md bg-zinc-50">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={24} className="text-blue-600" />
              <div>
                <h3 className="font-medium">Academic Transcripts</h3>
                <p className="text-sm text-zinc-500">
                  Upload your academic transcripts or school records
                </p>
              </div>
            </div>

            {uploadedFiles.transcripts ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <Check size={16} />
                  <span>Successfully uploaded</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
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
                  <X size={16} className="mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <FileUpload
                  vectorStoreId={profileData.vectorStoreId ?? ""}
                  onAddStore={(id) => {
                    handleAddStore(id);
                    handleFileUploaded(id, "transcripts");
                  }}
                  onUnlinkStore={handleUnlinkStore}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="statement" className="space-y-4">
          <div className="p-4 border rounded-md bg-zinc-50">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={24} className="text-blue-600" />
              <div>
                <h3 className="font-medium">Statement of Purpose</h3>
                <p className="text-sm text-zinc-500">
                  Upload a statement of purpose or personal statement
                </p>
              </div>
            </div>

            {uploadedFiles.statementOfPurpose ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <Check size={16} />
                  <span>Successfully uploaded</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
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
                  <X size={16} className="mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <FileUpload
                  vectorStoreId={profileData.vectorStoreId ?? ""}
                  onAddStore={(id) => {
                    handleAddStore(id);
                    handleFileUploaded(id, "statementOfPurpose");
                  }}
                  onUnlinkStore={handleUnlinkStore}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="bg-amber-50 p-4 rounded-md mt-4 border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Uploaded documents will be processed and used to enhance your
          recommendations. All documents are stored securely.
        </p>
      </div>
    </div>
  );
} 