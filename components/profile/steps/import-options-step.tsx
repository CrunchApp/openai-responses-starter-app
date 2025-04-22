"use client";
import React, { useState, useEffect } from "react";
import { ImportOptionsStepProps } from "../profile-wizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "@/components/document-upload";
import { 
  ArrowRight, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  BookOpen,
  CheckCircle,
  GraduationCap,
  ScrollText,
  Languages,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useProfileStore from "@/stores/useProfileStore";
import { UserProfile } from "@/app/types/profile-schema";

export default function ImportOptionsStep({
  profileData,
  setProfileData,
  onComplete,
}: ImportOptionsStepProps) {
  const [activeTab, setActiveTab] = useState("documents");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [extractingInfo, setExtractingInfo] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  const [extractionStage, setExtractionStage] = useState<number>(0);
  const [streamingDots, setStreamingDots] = useState("");
  const [streamingText, setStreamingText] = useState<string[]>([]);
  const [animatedValues, setAnimatedValues] = useState<{[key: string]: number}>({});
  const extractionStages = [
    "Analyzing your documents...",
    "Searching for relevant information...",
    "Extracting profile details...",
    "Updating your profile..."
  ];
  const [uploadedFiles, setUploadedFiles] = useState<{
    resume: boolean;
    transcripts: boolean;
    statementOfPurpose: boolean;
    otherDocuments: boolean;
  }>({
    resume: !!profileData.documents?.resume?.fileId,
    transcripts: !!profileData.documents?.transcripts?.fileId,
    statementOfPurpose: !!profileData.documents?.statementOfPurpose?.fileId,
    otherDocuments: !!profileData.documents?.otherDocuments && profileData.documents.otherDocuments.length > 0,
  });
  
  // Get vectorStoreId AND hydration state from store
  const { vectorStoreId: storeVectorStoreId, hydrated } = useProfileStore();

  // Add a useEffect for streaming animations
  useEffect(() => {
    let dotsInterval: NodeJS.Timeout;
    let textInterval: NodeJS.Timeout;
    let valueInterval: NodeJS.Timeout;
    
    if (extractingInfo) {
      // Animated dots for loading indicators
      dotsInterval = setInterval(() => {
        setStreamingDots(prev => {
          if (prev.length >= 3) return "";
          return prev + ".";
        });
      }, 400);
      
      // Streaming text animation
      const textItems = [
        "Reading document structure",
        "Identifying education history",
        "Parsing skills and experiences",
        "Extracting career objectives",
        "Detecting contact information",
        "Finding achievements and certifications",
        "Analyzing personal statement",
        "Processing technical skills",
        "Identifying academic achievements",
        "Extracting work history"
      ];
      
      textInterval = setInterval(() => {
        setStreamingText(prev => {
          if (prev.length < textItems.length) {
            const nextItem = textItems[prev.length];
            return [...prev, nextItem];
          }
          return prev;
        });
      }, 1200);
      
      // Animated values
      valueInterval = setInterval(() => {
        setAnimatedValues(prev => {
          const newValues: {[key: string]: number} = {...prev};
          const keys = ["accuracy", "confidence", "completeness", "relevance"];
          
          keys.forEach(key => {
            if (!newValues[key]) newValues[key] = 0;
            
            // Gradually increase values up to certain thresholds
            if (key === "accuracy" && newValues[key] < 98) {
              newValues[key] = Math.min(98, newValues[key] + Math.random() * 8);
            } else if (key === "confidence" && newValues[key] < 95) {
              newValues[key] = Math.min(95, newValues[key] + Math.random() * 6);
            } else if (key === "completeness" && newValues[key] < 90) {
              newValues[key] = Math.min(90, newValues[key] + Math.random() * 7);
            } else if (key === "relevance" && newValues[key] < 96) {
              newValues[key] = Math.min(96, newValues[key] + Math.random() * 5);
            }
          });
          
          return newValues;
        });
      }, 800);
    }
    
    return () => {
      clearInterval(dotsInterval);
      clearInterval(textInterval);
      clearInterval(valueInterval);
    };
  }, [extractingInfo]);

  // Handle when a file is added to the vector store
  const handleFileUploaded = (fileId: string, type: string) => {
    setProfileData((prevData): UserProfile => {
      const newDocument = {
        fileId: fileId,
        vectorStoreId: storeVectorStoreId ?? undefined,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      };

      if (type === 'otherDocuments') {
        // Handle array update for otherDocuments
        const existingDocs = prevData.documents?.otherDocuments ?? [];
        return {
          ...prevData,
          documents: {
            ...(prevData.documents ?? {}),
            otherDocuments: [...existingDocs, newDocument],
          },
        } as UserProfile;
      } else {
        // Handle single document update for resume, transcripts, sop
        return {
          ...prevData,
          documents: {
            ...(prevData.documents ?? {}),
            [type]: newDocument,
          },
        } as UserProfile;
      }
    });

    setUploadedFiles((prev) => ({
      ...prev,
      [type as keyof typeof prev]: true,
    }));
  };

  // Handle when the user clicks "Continue"
  const handleContinue = async () => {
    // Check if any documents have been uploaded
    const hasUploadedDocuments = Object.values(uploadedFiles).some(Boolean);
    
    // If no documents, just proceed to the next step
    if (!hasUploadedDocuments) {
      onComplete();
      return;
    }
    
    try {
      // Start extracting information from documents if any exist
      if (hasUploadedDocuments) {
        // Reset animation states
        setStreamingText([]);
        setStreamingDots("");
        setAnimatedValues({});
        
        setExtractingInfo(true);
        setExtractionStage(0);
        setExtractionProgress(extractionStages[0]);
        
        // Check hydration and get vector store ID from the store
        if (!hydrated) {
          throw new Error("Application is still loading. Please wait a moment and try again.");
        }
        
        if (!storeVectorStoreId) {
          throw new Error("Vector store not found. Please complete the welcome step first.");
        }
        
        // Collect document IDs (Updated to include otherDocuments)
        const documentIds: string[] = [];
        if (profileData.documents?.resume?.fileId) documentIds.push(profileData.documents.resume.fileId);
        if (profileData.documents?.transcripts?.fileId) documentIds.push(profileData.documents.transcripts.fileId);
        if (profileData.documents?.statementOfPurpose?.fileId) documentIds.push(profileData.documents.statementOfPurpose.fileId);
        if (profileData.documents?.otherDocuments) {
          profileData.documents.otherDocuments.forEach(doc => {
            if (doc?.fileId) {
              documentIds.push(doc.fileId);
            }
          });
        }
        
        if (documentIds.length === 0) {
          throw new Error("No document IDs found.");
        }
        
        // Log the document IDs we're using
        console.log("Extracting profile from document IDs:", documentIds);
        
        // Progress to the next stage
        setExtractionStage(1);
        setExtractionProgress(extractionStages[1]);
        
        // Set up a timer to simulate progress through stages
        const progressTimer = setInterval(() => {
          setExtractionStage(prev => {
            const nextStage = prev + 1;
            if (nextStage < extractionStages.length) {
              setExtractionProgress(extractionStages[nextStage]);
              return nextStage;
            }
            return prev;
          });
        }, 3000);
        
        // Call the API to extract profile information
        const response = await fetch('/api/profile/extract-from-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vectorStoreId: storeVectorStoreId,
            documentIds,
          }),
        });
        
        // Clear the progress timer
        clearInterval(progressTimer);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error:", errorData);
          throw new Error(errorData.error || errorData.details || "Failed to extract information from documents");
        }
        
        const data = await response.json();
        
        if (!data.profile) {
          throw new Error("No profile data extracted");
        }
        
        // Final stage
        setExtractionStage(extractionStages.length - 1);
        setExtractionProgress(extractionStages[extractionStages.length - 1]);
        
        // Update profile data with extracted information, merging with existing data
        setProfileData(prevData => {
          const extractedProfile = data.profile as UserProfile; // Assert type for better checking
          
          // Helper function to merge arrays of strings without duplicates
          const mergeStringArrays = (existing: string[] | undefined, extracted: string[] | undefined): string[] => {
            const existingSet = new Set(existing || []);
            (extracted || []).forEach(item => {
              if (item && typeof item === 'string') {
                existingSet.add(item);
              }
            });
            return Array.from(existingSet);
          };

          // Helper function to check if a value is considered "empty" or default
          const isEmptyOrNone = (value: any): boolean => {
            return value === null || value === undefined || value === '' || value === '__NONE__' || 
              (Array.isArray(value) && value.length === 0) ||
              // Special case for preferences fields that might be returned as __NONE__ by the API
              (typeof value === 'object' && value !== null && value === '__NONE__');
          }
          
          // Helper function to clean __NONE__ values from strings and objects
          const cleanNoneValues = (value: any): any => {
            if (value === '__NONE__') {
              return ''; // Convert __NONE__ strings to empty strings
            } else if (Array.isArray(value)) {
              // Filter any __NONE__ values from arrays
              return value.filter(item => item !== '__NONE__');
            } else if (typeof value === 'object' && value !== null) {
              // For objects, recursively clean properties
              const cleanedObj: any = {};
              Object.entries(value).forEach(([k, v]) => {
                cleanedObj[k] = cleanNoneValues(v);
              });
              return cleanedObj;
            }
            return value;
          }
          
          try {
            // Create a new profile object, starting with previous data
            const newProfileData: UserProfile = { ...prevData };

            // Special handling for critical fields that aren't displaying properly
            if (extractedProfile.currentLocation && extractedProfile.currentLocation !== '__NONE__') {
              newProfileData.currentLocation = extractedProfile.currentLocation;
            }
            
            if (extractedProfile.nationality && extractedProfile.nationality !== '__NONE__') {
              newProfileData.nationality = extractedProfile.nationality;
            }
            
            // Properly handle targetStudyLevel - this is an enum field
            if (extractedProfile.targetStudyLevel && extractedProfile.targetStudyLevel !== '__NONE__') {
              newProfileData.targetStudyLevel = extractedProfile.targetStudyLevel;
            }
            
            // Special handling for languageProficiency array
            if (Array.isArray(extractedProfile.languageProficiency) && extractedProfile.languageProficiency.length > 0) {
              // Always replace with extracted languages if they exist
              newProfileData.languageProficiency = extractedProfile.languageProficiency.map(lang => ({
                ...lang,
                // Convert '__NONE__' values to appropriate defaults
                proficiencyLevel: lang.proficiencyLevel === '__NONE__' ? 'Intermediate' : lang.proficiencyLevel,
                testType: lang.testType === '__NONE__' ? null : lang.testType,
                score: lang.score === '__NONE__' ? null : lang.score
              }));
              console.log("Updated language proficiency:", newProfileData.languageProficiency);
            }
            
            // Handle preferences object fields properly
            if (extractedProfile.preferences) {
              const extractedPrefs = extractedProfile.preferences;
              
              // Start with previous preferences
              newProfileData.preferences = { ...prevData.preferences };
              
              // Handle preferredLocations array specially - clean out any '__NONE__' values
              if (Array.isArray(extractedPrefs.preferredLocations)) {
                newProfileData.preferences.preferredLocations = extractedPrefs.preferredLocations.filter(loc => loc !== '__NONE__');
              }
              
              // Handle studyMode
              if (extractedPrefs.studyMode && extractedPrefs.studyMode !== '__NONE__') {
                newProfileData.preferences.studyMode = extractedPrefs.studyMode;
              }
              
              // Handle startDate
              if (extractedPrefs.startDate && extractedPrefs.startDate !== '__NONE__') {
                newProfileData.preferences.startDate = extractedPrefs.startDate;
              }
              
              // Handle budgetRange - should be an object
              if (extractedPrefs.budgetRange) {
                if (typeof extractedPrefs.budgetRange === 'object' && extractedPrefs.budgetRange !== null) {
                  // Only use if it's a valid object
                  newProfileData.preferences.budgetRange = extractedPrefs.budgetRange;
                }
              }
              
              // Handle preferredDuration - should be an object
              if (extractedPrefs.preferredDuration) {
                if (typeof extractedPrefs.preferredDuration === 'object' && extractedPrefs.preferredDuration !== null) {
                  // Only use if it's a valid object
                  newProfileData.preferences.preferredDuration = extractedPrefs.preferredDuration;
                }
              }
              
              // Handle preferredStudyLanguage
              if (extractedPrefs.preferredStudyLanguage && extractedPrefs.preferredStudyLanguage !== '__NONE__') {
                newProfileData.preferences.preferredStudyLanguage = extractedPrefs.preferredStudyLanguage;
              }
              
              // Handle livingExpensesBudget - should be an object
              if (extractedPrefs.livingExpensesBudget) {
                if (typeof extractedPrefs.livingExpensesBudget === 'object' && extractedPrefs.livingExpensesBudget !== null) {
                  // Only use if it's a valid object
                  newProfileData.preferences.livingExpensesBudget = extractedPrefs.livingExpensesBudget;
                }
              }
              
              // Handle residencyInterest - convert to boolean
              if (extractedPrefs.residencyInterest !== undefined) {
                // Convert string '__NONE__' to false, and any other value to boolean
                const value = extractedPrefs.residencyInterest;
                newProfileData.preferences.residencyInterest = 
                  typeof value === 'string' && value === '__NONE__' ? 
                    false : 
                    Boolean(value);
              }
            }
            
            // Handle iterating through remaining keys (excluding ones we've handled specifically)
            const handledKeys = ['currentLocation', 'nationality', 'targetStudyLevel', 'languageProficiency', 'preferences'];
            
            // Iterate through the keys of the extracted profile that we haven't specifically handled
            (Object.keys(extractedProfile) as Array<keyof UserProfile>)
              .filter(key => !handledKeys.includes(key as string))
              .forEach(key => {
                const extractedValue = extractedProfile[key];
                const previousValue = prevData[key];

                // Special case for nested objects/arrays
                if (key === 'careerGoals') {
                  const prevGoals = prevData.careerGoals || { shortTerm: '', longTerm: '', achievements: '', desiredIndustry: [], desiredRoles: [] };
                  const extractedGoals = extractedProfile.careerGoals || {};
                  newProfileData.careerGoals = {
                    shortTerm: isEmptyOrNone(prevGoals.shortTerm) ? (extractedGoals.shortTerm || '') : prevGoals.shortTerm,
                    longTerm: isEmptyOrNone(prevGoals.longTerm) ? (extractedGoals.longTerm || '') : prevGoals.longTerm,
                    achievements: isEmptyOrNone(prevGoals.achievements) ? (extractedGoals.achievements || '') : prevGoals.achievements,
                    desiredIndustry: mergeStringArrays(prevGoals.desiredIndustry, cleanNoneValues(extractedGoals.desiredIndustry)),
                    desiredRoles: mergeStringArrays(prevGoals.desiredRoles, cleanNoneValues(extractedGoals.desiredRoles)),
                  };
                } else if (key === 'education') {
                   // If previous education is empty or default, take extracted. Otherwise keep previous.
                   const prevEducationIsEmpty = !prevData.education || prevData.education.length === 0 || (prevData.education.length === 1 && isEmptyOrNone(prevData.education[0].institution));
                   newProfileData.education = prevEducationIsEmpty && Array.isArray(extractedProfile.education) ? extractedProfile.education : prevData.education;
                } else if (key === 'skills') {
                   newProfileData.skills = mergeStringArrays(prevData.skills, cleanNoneValues(extractedProfile.skills));
                } else if (key === 'documents') {
                   // Document merging might need specific logic if we add more types
                   // For now, keep existing logic if it works, or simply keep prevData
                   newProfileData.documents = prevData.documents;
                } 
                // Handle top-level simple fields
                else if (isEmptyOrNone(previousValue) && !isEmptyOrNone(extractedValue)) {
                    // If the previous value is empty/default and extracted value is not empty, use the extracted value
                   (newProfileData as any)[key] = extractedValue;
                } else {
                   // Otherwise, keep the existing previous value
                   (newProfileData as any)[key] = previousValue;
                }
              });

            console.log("Final merged profile data:", JSON.stringify(newProfileData, null, 2));
            return newProfileData;

          } catch (error) {
            console.error("Error merging profile data:", error);
            // If there's an error merging, return previous data unchanged to prevent corruption
            return prevData;
          }
        });
        
        setExtractionProgress("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error extracting profile information:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to extract profile information");
    } finally {
      setExtractingInfo(false);
      
      // Proceed to the next step
      onComplete();
    }
  };

  // Calculate the number of uploaded documents
  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;
  const hasImportedData = uploadedCount > 0;

  // Determine if document upload should be enabled
  const isDocumentUploadEnabled = hydrated && !!storeVectorStoreId;

  // Add this extraction animation JSX at the appropriate point in your return statement (inside document upload content)
  const renderExtractionAnimation = () => {
    if (!extractingInfo) return null;
    
    return (
      <motion.div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-blue-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9"></path>
              </svg>
            </motion.div>
            <span>Processing Documents</span>
          </h3>
          
          {/* Main extraction progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{extractionProgress}{streamingDots}</span>
              <span className="text-blue-600 font-medium">Stage {extractionStage + 1}/{extractionStages.length}</span>
            </div>
            
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${(extractionStage / (extractionStages.length - 1)) * 100}%` }}
                transition={{ type: "spring", damping: 30, stiffness: 100 }}
              />
            </div>
          </div>
          
          {/* Streaming text animation */}
          <div className="mb-6 bg-gray-50 rounded-lg p-3 h-40 overflow-y-auto text-sm">
            <AnimatePresence>
              {streamingText.map((text, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-2 flex items-start gap-2"
                >
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Animated metrics */}
          {Object.keys(animatedValues).length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.entries(animatedValues).map(([key, value]) => (
                <div key={key} className="bg-blue-50 rounded-md p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium capitalize">{key}</span>
                    <motion.span 
                      className="text-xs font-bold text-blue-700"
                      key={Math.floor(value)}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {Math.floor(value)}%
                    </motion.span>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-sm text-gray-500 italic text-center">
            Analyzing your documents to extract relevant profile information
          </p>
        </motion.div>
      </motion.div>
    );
  };

  // Show loading indicator until store is hydrated
  if (!hydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-zinc-600">Loading profile options...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-2xl font-semibold">Tell Vista About Yourself</h2>
        <p className="text-zinc-500 max-w-md mx-auto">
          Upload documents to help Vista understand your background.
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
                  You can upload documents to automatically fill parts of your profile.
                  This step is optional. You can also enter all information manually in the next steps.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden mb-6">
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

        <TabsContent value="documents" className="p-0 border-none">
          <div className="text-sm text-zinc-700 mb-4">
            Upload your educational documents to help us better understand your background and goals.
            {!isDocumentUploadEnabled && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-md">
                <p className="flex items-center mb-1">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="font-medium">Document upload not available</span>
                </p>
                <p className="text-xs pl-6">
                  Vector store ID is missing. Please complete the welcome step first to initialize your profile storage.
                </p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Resume Upload */}
            <DocumentUpload
              onSuccess={(fileId) => handleFileUploaded(fileId, 'resume')}
              allowedFileTypes={['.pdf', '.docx', '.doc']}
              className="h-36"
              vectorStoreId={storeVectorStoreId || ''}
              disabled={!isDocumentUploadEnabled}
            >
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <FileText className="mb-2 h-8 w-8 text-blue-500" />
                <p className="font-medium text-sm">Resume/CV</p>
                <p className="text-xs text-zinc-500 mt-1">PDF, DOCX</p>
                {uploadedFiles.resume && (
                  <div className="mt-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> Uploaded
                  </div>
                )}
              </div>
            </DocumentUpload>
            
            {/* Transcripts Upload */}
            <DocumentUpload
              onSuccess={(fileId) => handleFileUploaded(fileId, 'transcripts')}
              allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
              className="h-36"
              vectorStoreId={storeVectorStoreId || ''}
              disabled={!isDocumentUploadEnabled}
            >
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <GraduationCap className="mb-2 h-8 w-8 text-blue-500" />
                <p className="font-medium text-sm">Transcripts</p>
                <p className="text-xs text-zinc-500 mt-1">PDF, JPG, PNG</p>
                {uploadedFiles.transcripts && (
                  <div className="mt-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> Uploaded
                  </div>
                )}
              </div>
            </DocumentUpload>
            
            {/* Statement of Purpose Upload */}
            <DocumentUpload
              onSuccess={(fileId) => handleFileUploaded(fileId, 'statementOfPurpose')}
              allowedFileTypes={['.pdf', '.docx', '.doc', '.txt']}
              className="h-36"
              vectorStoreId={storeVectorStoreId || ''}
              disabled={!isDocumentUploadEnabled}
            >
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <ScrollText className="mb-2 h-8 w-8 text-blue-500" />
                <p className="font-medium text-sm">Statement of Purpose</p>
                <p className="text-xs text-zinc-500 mt-1">PDF, DOCX, TXT</p>
                {uploadedFiles.statementOfPurpose && (
                  <div className="mt-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> Uploaded
                  </div>
                )}
              </div>
            </DocumentUpload>

            {/* NEW: Other Documents Upload */}
            <DocumentUpload
              onSuccess={(fileId) => handleFileUploaded(fileId, 'otherDocuments')}
              allowedFileTypes={['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png']}
              className="h-36"
              vectorStoreId={storeVectorStoreId || ''}
              disabled={!isDocumentUploadEnabled}
            >
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Languages className="mb-2 h-8 w-8 text-blue-500" />
                <p className="font-medium text-sm">Language Tests / Other</p>
                <p className="text-xs text-zinc-500 mt-1">PDF, DOCX, JPG, etc.</p>
                {uploadedFiles.otherDocuments && (
                  <div className="mt-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> Uploaded
                  </div>
                )}
              </div>
            </DocumentUpload>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t mt-6">
            <p className="text-sm text-zinc-500 mb-4 sm:mb-0">
              {hasImportedData 
                ? "You can continue filling your profile in the next steps."
                : "You can continue without importing data and fill your profile manually."}
            </p>
            <Button 
              onClick={handleContinue}
              className="flex items-center space-x-2 min-w-[150px]"
              size="lg"
              disabled={extractingInfo}
            >
              {extractingInfo ? (
                <>
                  <span>{extractionProgress || "Analyzing documents..."}</span>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ml-2"></div>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {/* Show extraction error if there is one */}
          {errorMessage && !extractingInfo && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {errorMessage}
            </div>
          )}
          
          {/* Add the extraction animation just before closing div */}
          <AnimatePresence>
            {extractingInfo && renderExtractionAnimation()}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
} 