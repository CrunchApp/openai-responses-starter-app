"use client";
import React, { useState, useEffect } from "react";
import { ProfileData } from "../profile-wizard";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/file-upload";
import { FileText, Check, X, Upload, AlertCircle, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentsStepProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
}

export default function DocumentsStep({
  profileData,
  setProfileData,
}: DocumentsStepProps) {
  const [activeTab, setActiveTab] = useState("resume");
  const [showTip, setShowTip] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<{
    resume: boolean;
    transcripts: boolean;
    statementOfPurpose: boolean;
    otherDocuments: boolean;
  }>({
    resume: !!profileData.documents.resume,
    transcripts: !!profileData.documents.transcripts,
    statementOfPurpose: !!profileData.documents.statementOfPurpose,
    otherDocuments: !!profileData.documents.otherDocuments && profileData.documents.otherDocuments.length > 0,
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

  // Handle adding a store ID to the profile data
  const handleAddStore = (id: string) => {
    // Update the profile data with the vector store ID if not already set
    setProfileData((prevData) => ({
      ...prevData,
      vectorStoreId: prevData.vectorStoreId || id,
    }));
    
    console.log(`Vector store created/added with ID: ${id}`);
  };

  // Handle unlinking a store
  const handleUnlinkStore = () => {
    // Only remove the association, don't delete the store itself
    setProfileData((prevData) => ({
      ...prevData,
      vectorStoreId: undefined,
    }));
    
    console.log("Store unlinked from profile");
  };

  // Calculate the number of uploaded documents
  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;
  const uploadProgress = (uploadedCount / 3) * 100;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
          <p className="text-sm text-zinc-500">
            Upload relevant documents to enhance your profile and get personalized recommendations.
          </p>
        </div>
        
        <motion.div 
          className="bg-blue-50 p-2 rounded-full w-20 h-20 flex flex-col items-center justify-center"
          animate={{ 
            scale: [1, 1.05, 1],
            borderColor: uploadProgress === 100 ? "#10B981" : "#3B82F6"
          }}
          transition={{ duration: 0.5, repeat: uploadProgress === 100 ? 0 : Infinity, repeatType: "reverse" }}
        >
          <svg className="w-12 h-12">
            <circle
              className="text-gray-200"
              strokeWidth="5"
              stroke="currentColor"
              fill="transparent"
              r="20"
              cx="24"
              cy="24"
            />
            <circle
              className={`${uploadProgress === 100 ? "text-green-500" : "text-blue-600"}`}
              strokeWidth="5"
              strokeDasharray="125"
              strokeDashoffset={125 - (125 * uploadProgress) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="20"
              cx="24"
              cy="24"
            />
          </svg>
          <span className="text-xs font-medium mt-1">{uploadedCount}/3</span>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showTip && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 p-4 rounded-md border border-blue-200 relative overflow-hidden"
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
                <p className="text-sm text-blue-800 font-medium">Documents enhance your recommendations</p>
                <p className="text-xs text-blue-600 mt-1">
                  Uploading your documents allows our AI assistant to provide more personalized guidance and recommendations
                  tailored to your specific qualifications and goals.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs 
        defaultValue={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="resume" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">
            Resume/CV
            {uploadedFiles.resume && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Check size={16} className="text-green-600 data-[state=active]:text-white" />
              </motion.div>
            )}
          </TabsTrigger>
          <TabsTrigger value="transcripts" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">
            Transcripts
            {uploadedFiles.transcripts && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Check size={16} className="text-green-600 data-[state=active]:text-white" />
              </motion.div>
            )}
          </TabsTrigger>
          <TabsTrigger value="statement" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300">
            Statement
            {uploadedFiles.statementOfPurpose && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Check size={16} className="text-green-600 data-[state=active]:text-white" />
              </motion.div>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume" className="space-y-4">
          <div className="p-6 border rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-4 mb-5">
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Resume or CV</h3>
                <p className="text-sm text-zinc-500">
                  Upload your resume or CV in PDF format
                </p>
              </div>
            </div>

            {uploadedFiles.resume ? (
              <motion.div 
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 text-green-700">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Check size={16} className="text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium">Successfully uploaded</span>
                    <p className="text-xs text-green-600">Your resume is ready for analysis</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-700 hover:bg-green-50"
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
              </motion.div>
            ) : (
              <motion.div 
                className="mt-4 bg-gray-50 rounded-lg p-6 border border-dashed border-gray-300"
                whileHover={{ scale: 1.01, borderColor: "#3B82F6" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-blue-500 mb-3" />
                  <h4 className="text-base font-medium mb-1">Upload your Resume/CV</h4>
                  <p className="text-sm text-gray-500 text-center mb-4">PDF, DOCX, or TXT file (Max 5MB)</p>
                  
                  <FileUpload
                    vectorStoreId={profileData.vectorStoreId ?? ""}
                    onAddStore={(id) => {
                      handleAddStore(id);
                      handleFileUploaded(id, "resume");
                    }}
                    onUnlinkStore={handleUnlinkStore}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transcripts" className="space-y-4">
          <div className="p-6 border rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-4 mb-5">
              <div className="p-3 bg-purple-100 rounded-full">
                <FileText size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Academic Transcripts</h3>
                <p className="text-sm text-zinc-500">
                  Upload your academic transcripts or school records
                </p>
              </div>
            </div>

            {uploadedFiles.transcripts ? (
              <motion.div 
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 text-green-700">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Check size={16} className="text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium">Successfully uploaded</span>
                    <p className="text-xs text-green-600">Your transcripts are ready for analysis</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-700 hover:bg-green-50"
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
              </motion.div>
            ) : (
              <motion.div 
                className="mt-4 bg-gray-50 rounded-lg p-6 border border-dashed border-gray-300"
                whileHover={{ scale: 1.01, borderColor: "#8B5CF6" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-purple-500 mb-3" />
                  <h4 className="text-base font-medium mb-1">Upload your Transcripts</h4>
                  <p className="text-sm text-gray-500 text-center mb-4">PDF or image files (Max 10MB)</p>
                  
                  <FileUpload
                    vectorStoreId={profileData.vectorStoreId ?? ""}
                    onAddStore={(id) => {
                      handleAddStore(id);
                      handleFileUploaded(id, "transcripts");
                    }}
                    onUnlinkStore={handleUnlinkStore}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="statement" className="space-y-4">
          <div className="p-6 border rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-4 mb-5">
              <div className="p-3 bg-amber-100 rounded-full">
                <FileText size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Statement of Purpose</h3>
                <p className="text-sm text-zinc-500">
                  Upload a statement of purpose or personal statement
                </p>
              </div>
            </div>

            {uploadedFiles.statementOfPurpose ? (
              <motion.div 
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 text-green-700">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Check size={16} className="text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium">Successfully uploaded</span>
                    <p className="text-xs text-green-600">Your statement is ready for analysis</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-700 hover:bg-green-50"
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
              </motion.div>
            ) : (
              <motion.div 
                className="mt-4 bg-gray-50 rounded-lg p-6 border border-dashed border-gray-300"
                whileHover={{ scale: 1.01, borderColor: "#F59E0B" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-amber-500 mb-3" />
                  <h4 className="text-base font-medium mb-1">Upload your Statement</h4>
                  <p className="text-sm text-gray-500 text-center mb-4">PDF or DOCX file (Max 5MB)</p>
                  
                  <FileUpload
                    vectorStoreId={profileData.vectorStoreId ?? ""}
                    onAddStore={(id) => {
                      handleAddStore(id);
                      handleFileUploaded(id, "statementOfPurpose");
                    }}
                    onUnlinkStore={handleUnlinkStore}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <motion.div 
        className="mt-6 rounded-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
          <div className="bg-white p-4">
            <div className="flex items-start">
              <AlertCircle className="text-blue-600 mr-3 mt-1 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Documents enhance your profile</p>
                <p className="text-sm text-gray-600 mt-1">
                  All documents are securely stored and will be available to the AI assistant to provide 
                  personalized guidance based on your specific qualifications and goals.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {uploadedCount > 0 ? (
                    <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
                      {uploadedCount} documents uploaded
                    </div>
                  ) : (
                    <div className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-medium">
                      No documents uploaded yet
                    </div>
                  )}
                  {uploadedCount === 3 && (
                    <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                      All required documents uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 