"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, FileText, User, BookOpen, Briefcase, Settings, Edit, ArrowLeft, Loader2, Save, X, Plus, Trash2, Sparkles, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { gsap } from 'gsap';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { UserProfile, ProfileSchema } from "@/app/types/profile-schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { z } from 'zod';
import { useAuth } from "@/app/components/auth/AuthContext"; // Import useAuth
import DocumentUpload from "@/components/document-upload";
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox import
import { useToast } from "@/hooks/use-toast"; // Corrected import path

// Helper function to convert a Blob to a base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/json;base64,")
      const base64Content = base64.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
    reader.readAsDataURL(blob);
  });
};

// Derive the Education type directly from the schema
type EducationSchemaType = z.infer<typeof ProfileSchema.shape.education.element>;

// Derive the Language Proficiency type directly from the schema
// Fix Linter Error 1 (Attempt 3): Access the element type through ZodDefault -> ZodOptional -> ZodArray
type LanguageProficiencySchemaType = z.infer<typeof ProfileSchema.shape.languageProficiency._def.innerType._def.innerType._def.type>;

// Helper function to sync profile data to the Vector Store
const syncProfileToVectorStore = async (profileData: UserProfile, vectorStoreId: string): Promise<string> => {
  if (!vectorStoreId) {
    throw new Error("No vector store ID provided. Cannot sync profile.");
  }

  try {
    console.log("Syncing profile to Vector Store with ID:", vectorStoreId);
    console.log("Profile data to sync:", {
      profileFileId: profileData.profileFileId,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      // Include limited personal info for privacy
    });
    
    // Log document structure for debugging
    console.log("Documents structure:", JSON.stringify(profileData.documents || {}));

    // Get existing profile file ID from the profile data
    const existingProfileFileId = profileData.profileFileId;
    
    // Delete existing file if there is one
    if (existingProfileFileId) {
      console.log("Deleting existing profile file:", existingProfileFileId);
      try {
        const deleteResponse = await fetch(`/api/vector_stores/delete_file?file_id=${existingProfileFileId}`, { 
          method: "DELETE" 
        });
        console.log("Delete file response:", deleteResponse.status, await deleteResponse.text());
      } catch (deleteError) {
        console.error("Error deleting file (continuing anyway):", deleteError);
        // Continue even if deletion fails, as we'll replace it anyway
      }
    } else {
      console.log("No existing profile file ID found, skipping deletion step");
    }

    // Upload new profile JSON
    const profileJson = JSON.stringify(profileData, null, 2);
    const profileBlob = new Blob([profileJson], { type: "application/json" });
    const base64Content = await blobToBase64(profileBlob);
    const fileObject = { name: "user_profile.json", content: base64Content };
    
    const uploadResponse = await fetch("/api/vector_stores/upload_file", {
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ fileObject }),
    });
    
    if (!uploadResponse.ok) {
      throw new Error("Failed to upload profile JSON to Vector Store");
    }
    
    const uploadData = await uploadResponse.json();
    const newFileId = uploadData.id;
    
    // Add file to vector store
    const addFileResponse = await fetch("/api/vector_stores/add_file", {
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ fileId: newFileId, vectorStoreId }),
    });
    
    if (!addFileResponse.ok) {
      throw new Error("Failed to add profile file to vector store");
    }
    
    console.log("Profile synced to Vector Store successfully. New File ID:", newFileId);
    
    // Return the new file ID so it can be stored in the profile
    return newFileId;
  } catch (error) {
    console.error("Error syncing profile to Vector Store:", error);
    throw error; // Re-throw to let the caller handle it
  }
};

// Helper function to get document fileId from either format
const getDocumentFileId = (doc: any): string | undefined => {
  if (!doc) return undefined;
  
  // New format: {fileId: "file-123", vectorStoreId: "...", ...}
  if (typeof doc === 'object' && doc !== null && 'fileId' in doc) {
    return doc.fileId;
  }
  
  // Old format: "file-123" or "vs_123..."
  if (typeof doc === 'string') {
    return doc;
  }
  
  return undefined;
};

export default function ProfileDashboard() {
  const [expandedSection, setExpandedSection] = useState("personal");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);
  const [newEducationEntry, setNewEducationEntry] = useState<EducationSchemaType>({
    degreeLevel: "__NONE__", // Update default
    institution: "",
    fieldOfStudy: "",
    graduationYear: "",
    gpa: undefined
  });
  const [isAddEducationModalOpen, setIsAddEducationModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLanguageIndex, setEditingLanguageIndex] = useState<number | null>(null); // State for editing language
  const [newLanguageEntry, setNewLanguageEntry] = useState<LanguageProficiencySchemaType>({ // State for adding new language
    language: "",
    proficiencyLevel: "__NONE__",
    testType: "",
    score: ""
  });
  const [isAddLanguageModalOpen, setIsAddLanguageModalOpen] = useState(false); // State for language modal
  const router = useRouter();
  const { user, loading: authLoading, vectorStoreId: authVectorStoreId } = useAuth();
  const { toast } = useToast();
  
  // Add animation for decorative elements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const decorElements = document.querySelectorAll('.profile-decor');
      
      decorElements.forEach(el => {
        gsap.to(el, {
          y: `${Math.random() * 30 - 15}px`,
          rotation: Math.random() * 10 - 5,
          duration: 3 + Math.random() * 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });
    }
  }, []);

  // Fetch user profile from Supabase (only if user is potentially logged in)
  useEffect(() => {
    // Only fetch if auth isn't loading and user exists (or might exist soon)
    if (!authLoading && user) {
      const fetchUserProfile = async () => {
        try {
          setIsLoading(true);
          
          // Fetch profile data using the user ID
          const profileResponse = await fetch(`/api/profile/${user.id}`);
          const profileData = await profileResponse.json();
          
          if (profileData.error) {
            setError(profileData.error);
          } else {
            console.log("Fetched profile with file ID:", profileData.profile.profileFileId);
            setUserProfile(profileData.profile);
            setEditedProfile(profileData.profile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          setError("Failed to load profile. Please try again later.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserProfile();
    } else if (!authLoading && !user) {
       // Explicitly handle the case where there's no user after loading
       setIsLoading(false);
       setError("You must be logged in to view the dashboard.");
    }
    // Dependency array includes user and authLoading
  }, [authLoading, user]); // Re-run fetch if user state changes

  // Handle toggling edit mode for a section
  const handleEditToggle = (section: string) => {
    if (editSection === section) {
      setEditSection(null);
      setEditingEducationIndex(null);
      setEditingLanguageIndex(null); // Reset language editing index
    } else {
      setEditSection(section);
      setEditedProfile(JSON.parse(JSON.stringify(userProfile)));
    }
  };
  
  // Handle saving profile changes
  const handleSaveChanges = async () => {
    if (!editedProfile) return;
    
    try {
      setIsLoading(true);
      
      // First, sync with Vector Store if possible
      // Get vectorStoreId from auth context or userProfile
      const vsId = authVectorStoreId || userProfile?.vectorStoreId;
      
      if (!vsId) {
        console.error("No vector store ID available for synchronization");
        
        // If no vector store ID, just update in Supabase
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editedProfile),
        });
        
        const result = await response.json();
        
        if (result.error) {
          setError(result.error);
          return;
        }
        
        // Update local state
        setUserProfile(editedProfile);
        setEditSection(null);
      } else {
        try {
          // Sync the updated profile to the Vector Store
          const newFileId = await syncProfileToVectorStore(editedProfile, vsId);
          console.log("Profile successfully synced to Vector Store");
          
          // Update the profile with the new file ID
          const updatedProfile = {
            ...editedProfile,
            profileFileId: newFileId
          };
          
          // Save the updated profile with the file ID to Supabase
          const updateResponse = await fetch('/api/profile/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedProfile),
          });
          
          const updateResult = await updateResponse.json();
          
          if (updateResult.error) {
            console.error("Error updating profile with file ID:", updateResult.error);
            // Continue with local state update anyway
          } else {
            console.log("Successfully updated profile in Supabase with new file ID:", newFileId);
          }
          
          // Update local state with the edited profile including the new file ID
          setUserProfile(updatedProfile);
          setEditSection(null);
        } catch (syncError) {
          console.error("Error syncing profile to Vector Store:", syncError);
          // Don't block the main flow, but show a warning
          setError("Profile updated successfully but failed to sync with AI system. Some features may show outdated information.");
          
          // Fall back to just updating in Supabase
          const response = await fetch('/api/profile/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(editedProfile),
          });
          
          const result = await response.json();
          
          if (result.error) {
            setError(result.error);
            return;
          }
          
          // Update local state
          setUserProfile(editedProfile);
          setEditSection(null);
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle cancelling edit mode
  const handleCancelEdit = () => {
    setEditSection(null);
    setEditedProfile(userProfile);
    setEditingEducationIndex(null);
    setEditingLanguageIndex(null); // Reset language editing index
  };
  
  // Update editedProfile when a field changes (handles nested objects and arrays)
  const handleFieldChange = (fieldPath: string, value: any) => {
    if (!editedProfile) return;

    setEditedProfile(prevProfile => {
      if (!prevProfile) return null;

      const newProfile = JSON.parse(JSON.stringify(prevProfile)); 
      
      // Improved path handling for arrays like education[0].degreeLevel
      const keys = fieldPath.match(/[^.[\]]+/g) || []; // Split by . or []
      let current: any = newProfile;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKey = keys[i+1];
        // Check if next key is an array index
        const isNextKeyArrayIndex = /^\d+$/.test(nextKey); 
        
        if (current[key] === undefined || current[key] === null) {
           // Create nested object or array if it doesn't exist
           current[key] = isNextKeyArrayIndex ? [] : {};
        }
         // If current key points to an array and index is out of bounds, handle appropriately (though should not happen with edits)
         if (Array.isArray(current[key]) && isNextKeyArrayIndex) {
            const index = parseInt(nextKey, 10);
            if (current[key][index] === undefined || current[key][index] === null) {
               current[key][index] = {}; // Ensure object exists at index
            }
         }
         // Special handling for nested objects in preferences
         if (key === 'preferences' && !current[key]) {
             current[key] = {}; // Ensure preferences object exists
         }
         if (key === 'preferredDuration' && !current?.min && !current?.max) {
            current[key] = { min: undefined, max: undefined, unit: undefined }; // Ensure duration object exists
         }
         if (key === 'livingExpensesBudget' && !current?.min && !current?.max) {
            current[key] = { min: undefined, max: undefined, currency: "USD" }; // Ensure budget object exists
         }
        current = current[key];
      }
      
      const finalKey = keys[keys.length - 1];
      
      // Handle specific field types if necessary (like comma-separated strings)
      if (['skills', 'careerGoals.desiredIndustry', 'careerGoals.desiredRoles', 'preferences.preferredLocations'].includes(fieldPath)) {
          current[finalKey] = value.split(',').map((item: string) => item.trim()).filter(Boolean);
      } else if (fieldPath.startsWith('preferences.budgetRange')) {
          current[finalKey] = parseInt(value, 10) || 0;
      } else if (fieldPath.startsWith('preferences.preferredDuration')) {
          current[finalKey] = parseInt(value, 10) || undefined; // Store as number or undefined
      } else if (fieldPath.startsWith('preferences.livingExpensesBudget')) {
          current[finalKey] = parseInt(value, 10) || undefined; // Store as number or undefined
      } else if (fieldPath === 'preferences.residencyInterest') {
          current[finalKey] = value; // Boolean value from Checkbox
      } else {
          current[finalKey] = value;
      }

      return newProfile;
    });
  };

  // --- Education Specific Handlers ---

  const handleEducationItemChange = (index: number, field: keyof EducationSchemaType, value: string) => {
    handleFieldChange(`education.${index}.${field}`, value);
  };

  const handleRemoveEducation = (index: number) => {
    if (!editedProfile) return;
    setEditedProfile(prev => {
        if (!prev || !prev.education) return prev;
        const updatedEducation = prev.education.filter((_, i) => i !== index);
        return { ...prev, education: updatedEducation };
    });
    // Note: Changes are staged in editedProfile until the main 'Save Changes' is clicked.
  };

  const handleAddNewEducation = () => {
      if (!editedProfile) return;
      setEditedProfile(prev => {
          if (!prev) return null;
          const currentEducation = prev.education || [];
          // Ensure the new entry conforms to the expected type before adding
          const entryToAdd: EducationSchemaType = {
              ...newEducationEntry,
              // Explicitly handle potential null/undefined if necessary based on schema
              gpa: newEducationEntry.gpa === "" ? undefined : newEducationEntry.gpa 
          };
          return {
              ...prev,
              education: [...currentEducation, entryToAdd]
          };
      });
      setIsAddEducationModalOpen(false); 
      // Reset using the derived type's structure
      setNewEducationEntry({ degreeLevel: "__NONE__", institution: "", fieldOfStudy: "", graduationYear: "", gpa: undefined }); // Update default
  };

  const handleNewEducationEntryChange = (field: keyof EducationSchemaType, value: string) => {
      setNewEducationEntry(prev => ({ ...prev, [field]: value }));
  };

  // --- End Education Specific Handlers ---

  // --- Language Proficiency Specific Handlers ---

  const handleLanguageItemChange = (index: number, field: keyof LanguageProficiencySchemaType, value: string) => {
    // Fix Linter Error 2: Explicitly convert 'field' (which could be a symbol) to a string
    handleFieldChange(`languageProficiency.${index}.${String(field)}`, value);
  };

  const handleRemoveLanguage = (index: number) => {
    if (!editedProfile) return;
    setEditedProfile(prev => {
        if (!prev || !prev.languageProficiency) return prev;
        const updatedLanguages = prev.languageProficiency.filter((_, i) => i !== index);
        return { ...prev, languageProficiency: updatedLanguages };
    });
  };

  const handleAddNewLanguage = () => {
      if (!editedProfile) return;
      setEditedProfile(prev => {
          if (!prev) return null;
          const currentLanguages = prev.languageProficiency || [];
          const entryToAdd: LanguageProficiencySchemaType = { ...newLanguageEntry };
          return {
              ...prev,
              languageProficiency: [...currentLanguages, entryToAdd]
          };
      });
      setIsAddLanguageModalOpen(false);
      setNewLanguageEntry({ language: "", proficiencyLevel: "__NONE__", testType: "", score: "" }); // Reset form
  };

  const handleNewLanguageEntryChange = (field: keyof LanguageProficiencySchemaType, value: string) => {
      // Fix Linter Error 3: Add explicit type for 'prev' parameter
      setNewLanguageEntry((prev: LanguageProficiencySchemaType) => ({ ...prev, [field]: value }));
  };

  // --- End Language Proficiency Specific Handlers ---

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    if (!userProfile) return 0;
    
    let completed = 0;
    let total = 0;
    
    // Personal info
    if (userProfile.firstName) completed++;
    if (userProfile.lastName) completed++;
    if (userProfile.email) completed++;
    if (userProfile.phone) completed++;
    if (userProfile.currentLocation) completed++; // Added
    if (userProfile.nationality) completed++; // Added
    total += 6; // Updated total
    
    // Education
    userProfile.education?.forEach(edu => {
      if (edu.degreeLevel) completed++;
      if (edu.institution) completed++;
      if (edu.fieldOfStudy) completed++;
      if (edu.graduationYear) completed++;
      total += 4;
    });
    
    // Career Goals
    if (userProfile.careerGoals?.shortTerm) completed++;
    if (userProfile.careerGoals?.longTerm) completed++;
    if (userProfile.careerGoals?.desiredIndustry?.length > 0) completed++;
    if (userProfile.careerGoals?.desiredRoles?.length > 0) completed++;
    total += 4;
    
    // Skills
    if (userProfile.skills?.length > 0) completed++;
    total += 1;
    
    // Preferences
    if (userProfile.preferences?.preferredLocations?.length > 0) completed++;
    if (userProfile.preferences?.studyMode) completed++;
    if (userProfile.preferences?.startDate) completed++;
    if (userProfile.preferences?.budgetRange?.max > 0) completed++;
    // Removed targetStudyLevel from Preferences total calculation
    if (userProfile.preferences?.preferredDuration?.min || userProfile.preferences?.preferredDuration?.max) completed++; // Added
    if (userProfile.preferences?.preferredStudyLanguage) completed++; // Added
    if (userProfile.preferences?.livingExpensesBudget?.min || userProfile.preferences?.livingExpensesBudget?.max) completed++; // Added // Corrected typo userProfile -> profileData
    if (userProfile.preferences?.residencyInterest !== undefined) completed++; // Added (assuming default is false)
    // Removed languageProficiency from Preferences total calculation
    total += 8; // Updated total (was 10, removed 2)
    
    // Documents - handle both formats
    if (getDocumentFileId(userProfile.documents?.resume)) completed++;
    if (getDocumentFileId(userProfile.documents?.transcripts)) completed++;
    if (getDocumentFileId(userProfile.documents?.statementOfPurpose)) completed++;
    total += 3;
    
    return Math.round((completed / total) * 100);
  };
  
  const completionPercentage = calculateCompletion();

  // Update handleDocumentUpdate for type safety
  const handleDocumentUpdate = async (docType: 'resume' | 'transcripts' | 'statementOfPurpose', fileId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we need to delete an existing document
      const existingDoc = userProfile?.documents?.[docType];
      const existingDocFileId = getDocumentFileId(existingDoc);
      
      if (existingDocFileId) {
        console.log(`Deleting existing ${docType} file:`, existingDocFileId);
        try {
          // Delete the existing file from OpenAI
          const deleteResponse = await fetch(`/api/vector_stores/delete_file?file_id=${existingDocFileId}`, {
            method: 'DELETE'
          });
          
          if (!deleteResponse.ok) {
            console.warn(`Warning: Failed to delete previous file. Status: ${deleteResponse.status}`);
          } else {
            console.log(`Successfully deleted previous ${docType} file.`);
          }
        } catch (deleteError) {
          console.error(`Error deleting previous ${docType} file:`, deleteError);
          // Continue despite error - we'll update the document anyway
        }
      }
      
      // Create the updated document object with fileId and metadata
      const updatedDoc = {
        fileId: fileId,
        vectorStoreId: userProfile?.vectorStoreId || '',
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      };
      
      // Create a new documents object by updating the existing one
      // This preserves any other documents in their original format
      const updatedDocuments = { ...userProfile!.documents };
      
      // Update just this document with our new format
      updatedDocuments[docType] = updatedDoc;
      
      // Create a new profile with the updated documents
      const updatedProfile: UserProfile = {
        ...userProfile!,
        documents: updatedDocuments
      };
      
      // Debug log to check structure
      console.log(`Updating ${docType} document:`, {
        before: JSON.stringify(userProfile!.documents?.[docType]),
        after: JSON.stringify(updatedDoc)
      });
      
      // Get vectorStoreId from auth context or userProfile
      const vsId = authVectorStoreId || userProfile?.vectorStoreId;
      
      if (!vsId) {
        console.error("No vector store ID available for synchronization");
        throw new Error("Profile is not properly initialized with a vector store.");
      }
      
      try {
        // First, sync the updated profile to Vector Store to ensure AI has latest information
        console.log("Syncing updated profile with new document to Vector Store...");
        const newFileId = await syncProfileToVectorStore(updatedProfile, vsId);
        
        // Update the profile with both new document and the new profile file ID
        const finalUpdatedProfile = {
          ...updatedProfile,
          profileFileId: newFileId
        };
        
        // Now, update the profile in the database with both new document and profile file ID
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalUpdatedProfile),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update document');
        }
        
        // Update the local state with the new document and profile file ID
        setUserProfile(finalUpdatedProfile);
        
        console.log(`Profile successfully updated with new ${docType} document and synced to Vector Store`);
        
        // Show success message
        alert(`Your ${docType} has been successfully updated.`);
      } catch (syncError) {
        console.error("Error syncing profile with new document to Vector Store:", syncError);
        
        // Even if sync fails, still try to update just the document in Supabase
        console.log("Falling back to database-only update...");
        
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedProfile),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update document');
        }
        
        // Update the local state with the new document
        setUserProfile(updatedProfile);
        
        // Show warning message
        alert(`Your ${docType} has been updated but could not be synced with the AI system. Some features may show outdated information.`);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      setError(error instanceof Error ? error.message : 'Failed to update document. Please try again.');
      
      // Show error alert
      alert(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile deletion
  const handleDeleteProfile = async () => {
    try {
      setIsLoading(true);
      console.log("Starting profile deletion from UI");
      
      // Call the API to delete the profile
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
      });
      
      console.log("Delete API response status:", response.status);
      const result = await response.json();
      console.log("Delete API response:", result);
      
      if (result.error) {
        console.error("Error from delete API:", result.error);
        setError(result.error);
        setIsDeleteDialogOpen(false);
        toast({ title: "Deletion Failed", description: result.error, variant: "destructive" });
      } else {
        console.log("Profile deletion result:", result);
        toast({ title: "Profile Deleted", description: "Your profile has been deleted.", variant: "default" });
        
        // Sign out and redirect
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
          console.log("User signed out successfully");
          router.push('/login');
        } catch (signOutError) {
          console.error("Error during sign out:", signOutError);
          router.push('/login');
        }
      }
    } catch (error) {
      console.error("Error deleting profile:", error);
      setError("Failed to delete profile. Please try again later.");
      setIsDeleteDialogOpen(false);
       toast({ title: "Deletion Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (authLoading || (isLoading && user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-background to-background/95">
        <div className="flex justify-center w-full">
          <div style={{ position: 'relative', left: '-20px' }}>
          <AnimatedLogo size={100} />
          </div>
        </div>
        <p className="mt-6 text-lg text-foreground/70">Loading your profile...</p>
      </div>
    );
  }

  // If auth loaded, no user, show message or rely on redirect
   if (!user) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen p-6">
         <p className="text-lg text-gray-600">Redirecting to login...</p>
       </div>
     );
   }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mx-auto mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If no profile data is available, show a message
  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <User className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Profile Found</h2>
          <p className="text-gray-600 mb-6">
            You haven't created a profile yet. Create one to receive personalized education recommendations.
          </p>
          <Button 
            onClick={() => router.push('/profile-wizard')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Profile
          </Button>
        </div>
      </div>
    );
  }

  // Render edit mode for personal information
  const renderPersonalInfoEdit = () => {
    if (!editedProfile) return null;
    
    return (
      <div className="pl-10 space-y-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <Input 
              value={editedProfile.firstName} 
              onChange={(e) => handleFieldChange('firstName', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <Input 
              value={editedProfile.lastName} 
              onChange={(e) => handleFieldChange('lastName', e.target.value)} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input 
            value={editedProfile.email} 
            onChange={(e) => handleFieldChange('email', e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <Input 
            value={editedProfile.phone || ''} 
            onChange={(e) => handleFieldChange('phone', e.target.value)} 
          />
        </div>
        {/* Added Location and Nationality */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Location</label>
            <Input
              value={editedProfile.currentLocation || ''}
              onChange={(e) => handleFieldChange('currentLocation', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nationality</label>
            <Input
              value={editedProfile.nationality || ''}
              onChange={(e) => handleFieldChange('nationality', e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleCancelEdit}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSaveChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    );
  };

  // Render edit mode for Career Goals
  const renderCareerGoalsEdit = () => {
    if (!editedProfile) return null;
    
    return (
      <div className="pl-10 space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Short-term Goals</label>
          <Textarea 
            value={editedProfile.careerGoals?.shortTerm || ''} 
            onChange={(e) => handleFieldChange('careerGoals.shortTerm', e.target.value)} 
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Long-term Goals</label>
          <Textarea 
            value={editedProfile.careerGoals?.longTerm || ''} 
            onChange={(e) => handleFieldChange('careerGoals.longTerm', e.target.value)} 
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Achievements & Extracurricular Interests</label>
          <Textarea 
            value={editedProfile.careerGoals?.achievements || ''} 
            onChange={(e) => handleFieldChange('careerGoals.achievements', e.target.value)} 
            rows={4}
            placeholder="Enter your notable achievements, awards, and extracurricular interests"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Skills (comma-separated)</label>
          <Input 
            value={editedProfile.skills?.join(', ') || ''} 
            onChange={(e) => handleFieldChange('skills', e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Desired Industries (comma-separated)</label>
          <Input 
            value={editedProfile.careerGoals?.desiredIndustry?.join(', ') || ''} 
            onChange={(e) => handleFieldChange('careerGoals.desiredIndustry', e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Desired Roles (comma-separated)</label>
          <Input 
            value={editedProfile.careerGoals?.desiredRoles?.join(', ') || ''} 
            onChange={(e) => handleFieldChange('careerGoals.desiredRoles', e.target.value)} 
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleCancelEdit}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSaveChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    );
  };

  // Replace the renderPreferencesEdit function with this version that doesn't include Language Proficiency
  const renderPreferencesEdit = () => {
    if (!editedProfile) return null;
    
    return (
      <div className="pl-10 space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Preferred Locations (comma-separated)</label>
          <Input 
            value={editedProfile.preferences?.preferredLocations?.join(', ') || ''} 
            onChange={(e) => handleFieldChange('preferences.preferredLocations', e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Study Mode</label>
          <Select 
            value={editedProfile.preferences?.studyMode || 'Full-time'} 
            onValueChange={(value) => handleFieldChange('preferences.studyMode', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select study mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Full-time">Full-time</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Preferred Start Date</label>
          <Input 
            type="month" // Use month input for simplicity
            value={editedProfile.preferences?.startDate ? editedProfile.preferences.startDate.substring(0, 7) : ''} 
            onChange={(e) => handleFieldChange('preferences.startDate', e.target.value ? `${e.target.value}-01` : '')} // Store as YYYY-MM-DD
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
             <label className="text-sm font-medium">Min Budget ($)</label>
             <Input 
               type="number"
               value={editedProfile.preferences?.budgetRange?.min || 0} 
               onChange={(e) => handleFieldChange('preferences.budgetRange.min', e.target.value)} 
             />
           </div>
           <div className="space-y-2">
             <label className="text-sm font-medium">Max Budget ($)</label>
             <Input 
               type="number"
               value={editedProfile.preferences?.budgetRange?.max || 0} 
               onChange={(e) => handleFieldChange('preferences.budgetRange.max', e.target.value)} 
             />
           </div>
         </div>
         {/* --- Added Fields --- */}
         <div className="space-y-2">
            <label className="text-sm font-medium">Target Study Level</label>
            <Select
                value={editedProfile.targetStudyLevel || '__NONE__'}
                onValueChange={(value) => handleFieldChange('targetStudyLevel', value)}
            >
                <SelectTrigger><SelectValue placeholder="Select target level" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                    <SelectItem value="Master's">Master's</SelectItem>
                    <SelectItem value="Doctorate">Doctorate</SelectItem>
                    <SelectItem value="Postgraduate Diploma/Certificate">Postgraduate Diploma/Certificate</SelectItem>
                    <SelectItem value="Vocational/Trade">Vocational/Trade</SelectItem>
                    <SelectItem value="Undecided">Undecided</SelectItem>
                    <SelectItem value="__NONE__">None specified</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">Preferred Duration</label>
             <div className="grid grid-cols-3 gap-2 items-end">
               <div>
                 <Label htmlFor="prefDurationMin" className="text-xs">Min</Label>
                 <Input
                   id="prefDurationMin"
                   type="number"
                   value={editedProfile.preferences?.preferredDuration?.min || ''}
                   onChange={(e) => handleFieldChange('preferences.preferredDuration.min', e.target.value)}
                   placeholder="e.g., 1"
                 />
               </div>
               <div>
                 <Label htmlFor="prefDurationMax" className="text-xs">Max</Label>
                 <Input
                   id="prefDurationMax"
                   type="number"
                   value={editedProfile.preferences?.preferredDuration?.max || ''}
                   onChange={(e) => handleFieldChange('preferences.preferredDuration.max', e.target.value)}
                   placeholder="e.g., 4"
                 />
               </div>
               <div>
                 <Label htmlFor="prefDurationUnit" className="text-xs">Unit</Label>
                 <Select
                    value={editedProfile.preferences?.preferredDuration?.unit || 'years'}
                    onValueChange={(value) => handleFieldChange('preferences.preferredDuration.unit', value)}
                  >
                    <SelectTrigger id="prefDurationUnit">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="years">Years</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
             </div>
           </div>
           <div className="space-y-2">
             <label className="text-sm font-medium">Preferred Study Language</label>
             <Input
               value={editedProfile.preferences?.preferredStudyLanguage || ''}
               onChange={(e) => handleFieldChange('preferences.preferredStudyLanguage', e.target.value)}
               placeholder="e.g., English, German"
             />
           </div>
           <div className="space-y-2">
             <label className="text-sm font-medium">Living Expenses Budget (per month)</label>
             <div className="grid grid-cols-3 gap-2 items-end">
               <div>
                 <Label htmlFor="livingBudgetMin" className="text-xs">Min</Label>
                 <Input
                   id="livingBudgetMin"
                   type="number"
                   value={editedProfile.preferences?.livingExpensesBudget?.min || ''}
                   onChange={(e) => handleFieldChange('preferences.livingExpensesBudget.min', e.target.value)}
                   placeholder="e.g., 500"
                 />
               </div>
               <div>
                 <Label htmlFor="livingBudgetMax" className="text-xs">Max</Label>
                 <Input
                   id="livingBudgetMax"
                   type="number"
                   value={editedProfile.preferences?.livingExpensesBudget?.max || ''}
                   onChange={(e) => handleFieldChange('preferences.livingExpensesBudget.max', e.target.value)}
                   placeholder="e.g., 1500"
                 />
               </div>
               <div>
                 <Label htmlFor="livingBudgetCurrency" className="text-xs">Currency</Label>
                  <Input
                      id="livingBudgetCurrency"
                      value={editedProfile.preferences?.livingExpensesBudget?.currency || 'USD'}
                      onChange={(e) => handleFieldChange('preferences.livingExpensesBudget.currency', e.target.value)}
                      placeholder="e.g., USD"
                  />
               </div>
             </div>
           </div>
           <div className="flex items-center space-x-2 pt-2">
             <Checkbox
               id="residencyInterest"
               checked={editedProfile.preferences?.residencyInterest || false}
               onCheckedChange={(checked) => handleFieldChange('preferences.residencyInterest', checked)}
             />
             <label htmlFor="residencyInterest" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
               Interested in long-term residency/migration options?
             </label>
           </div>
         {/* --- End Added Fields --- */}

         <div className="flex justify-end gap-2 mt-6 border-t pt-4">
           <Button variant="outline" onClick={handleCancelEdit}>
             <X className="h-4 w-4 mr-2" />
             Cancel Section Edit
           </Button>
           <Button onClick={handleSaveChanges} disabled={isLoading}>
             {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
             Save All Preference Changes
           </Button>
        </div>
      </div>
    );
};

  // --- Render Functions for Education ---

  const renderEducationDisplayItem = (edu: EducationSchemaType, index: number) => (
     <motion.div
        key={`display-${index}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 * index }}
        className="p-4 border rounded-md bg-white border-purple-100 shadow-sm mb-2 relative group"
      >
        {/* Edit/Remove buttons appear on hover when section is in edit mode */}
        {editSection === 'education' && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-blue-600 hover:bg-blue-100"
                    onClick={() => setEditingEducationIndex(index)}
                 >
                    <Edit size={14} />
                 </Button>
                 {/* Only allow removal if more than one entry exists */}
                 {(editedProfile?.education?.length ?? 0) > 1 && (
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-600 hover:bg-red-100"
                        onClick={() => handleRemoveEducation(index)}
                     >
                        <Trash2 size={14} />
                     </Button>
                 )}
            </div>
        )}
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-purple-800">Education #{index + 1}</h4>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700">Degree Level</p>
              <p className="font-medium text-gray-800">
                {edu.degreeLevel || "Not provided"}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700">Field of Study</p>
              <p className="font-medium text-gray-800">
                {edu.fieldOfStudy || "Not provided"}
              </p>
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-700">Institution</p>
            <p className="font-medium text-gray-800">
              {edu.institution || "Not provided"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700">Graduation Year</p>
              <p className="font-medium text-gray-800">
                {edu.graduationYear || "Not provided"}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700">GPA</p>
              <p className="font-medium text-gray-800">{edu.gpa || "Not provided"}</p>
            </div>
          </div>
        </div>
      </motion.div>
  );

  const renderEducationEditItem = (edu: EducationSchemaType, index: number) => (
      <div key={`edit-${index}`} className="p-4 border rounded-md bg-blue-50 border-blue-200 mb-4">
          <h3 className="text-md font-medium mb-4 text-blue-800">Editing Education #{index + 1}</h3>
          <div className="space-y-4">
              {/* Degree Level */}
              <div className="space-y-2">
                  <Label htmlFor={`degreeLevel-${index}`} className="text-sm">Degree Level</Label>
                  <Select
                      value={edu.degreeLevel}
                      onValueChange={(value) => handleEducationItemChange(index, "degreeLevel", value)}
                  >
                      <SelectTrigger id={`degreeLevel-${index}`}><SelectValue placeholder="Select degree" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Associate's">Associate's Degree</SelectItem>
                          <SelectItem value="Bachelor's">Bachelor's Degree</SelectItem>
                          <SelectItem value="Master's">Master's Degree</SelectItem>
                          <SelectItem value="Doctorate">Doctorate/PhD</SelectItem>
                          <SelectItem value="Certificate">Certificate/Diploma</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              {/* Institution */}
              <div className="space-y-2">
                  <Label htmlFor={`institution-${index}`} className="text-sm">Institution</Label>
                  <Input id={`institution-${index}`} value={edu.institution} onChange={(e) => handleEducationItemChange(index, "institution", e.target.value)} />
              </div>
              {/* Field of Study */}
              <div className="space-y-2">
                  <Label htmlFor={`fieldOfStudy-${index}`} className="text-sm">Field of Study</Label>
                  <Input id={`fieldOfStudy-${index}`} value={edu.fieldOfStudy} onChange={(e) => handleEducationItemChange(index, "fieldOfStudy", e.target.value)} />
              </div>
              {/* Graduation Year & GPA */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor={`graduationYear-${index}`} className="text-sm">Graduation Year</Label>
                      <Input id={`graduationYear-${index}`} value={edu.graduationYear} onChange={(e) => handleEducationItemChange(index, "graduationYear", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor={`gpa-${index}`} className="text-sm">GPA (Optional)</Label>
                      <Input id={`gpa-${index}`} value={edu.gpa || ""} onChange={(e) => handleEducationItemChange(index, "gpa", e.target.value)} />
                  </div>
              </div>
              {/* Action Buttons for this item */}
              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingEducationIndex(null)}>Cancel Edit</Button>
                  {/* <Button size="sm" onClick={() => setEditingEducationIndex(null)}>Done</Button> */}
                  {/* No separate save needed here, main save button handles it */}
              </div>
          </div>
      </div>
  );

  // --- End Render Functions for Education ---

  // --- Render Functions for Language Proficiency ---

  const renderLanguageDisplayItem = (lang: LanguageProficiencySchemaType, index: number) => (
      <motion.div
          key={`display-lang-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 * index }}
          className="p-4 border rounded-md bg-white border-purple-100 shadow-sm mb-2 relative group"
      >
          {/* Edit/Remove buttons appear on hover when section is in edit mode */}
          {editSection === 'education' && ( // Changed from 'preferences' to 'education'
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-purple-600 hover:bg-purple-100"
                      onClick={() => setEditingLanguageIndex(index)}
                   >
                      <Edit size={14} />
                   </Button>
                   <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:bg-red-100"
                      onClick={() => handleRemoveLanguage(index)}
                   >
                      <Trash2 size={14} />
                   </Button>
              </div>
          )}
          <h4 className="font-medium text-purple-800 mb-2">Language #{index + 1}</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Language:</span> {lang.language}</p>
            <p><span className="text-gray-500">Level:</span> {lang.proficiencyLevel !== "__NONE__" ? lang.proficiencyLevel : "Not Specified"}</p>
            {lang.testType && <p><span className="text-gray-500">Test:</span> {lang.testType}</p>}
            {lang.score && <p><span className="text-gray-500">Score:</span> {lang.score}</p>}
          </div>
      </motion.div>
  );

  const renderLanguageEditItem = (lang: LanguageProficiencySchemaType, index: number) => (
      <div key={`edit-lang-${index}`} className="p-4 border rounded-md bg-purple-50 border-purple-200 mb-4">
          <h3 className="text-md font-medium mb-4 text-purple-800">Editing Language #{index + 1}</h3>
          <div className="space-y-4">
              {/* Language */}
              <div className="space-y-2">
                  <Label htmlFor={`language-${index}`} className="text-sm">Language</Label>
                  <Input id={`language-${index}`} value={lang.language} onChange={(e) => handleLanguageItemChange(index, "language", e.target.value)} />
              </div>
              {/* Proficiency Level */}
              <div className="space-y-2">
                  <Label htmlFor={`proficiencyLevel-${index}`} className="text-sm">Proficiency Level</Label>
                  <Select
                      value={lang.proficiencyLevel || "__NONE__"}
                      onValueChange={(value) => handleLanguageItemChange(index, "proficiencyLevel", value)}
                  >
                      <SelectTrigger id={`proficiencyLevel-${index}`}><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Elementary">Elementary</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Upper Intermediate">Upper Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                          <SelectItem value="Proficient">Proficient</SelectItem>
                          <SelectItem value="Native">Native</SelectItem>
                          <SelectItem value="__NONE__">Not Specified</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
               {/* Test Type & Score */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor={`testType-${index}`} className="text-sm">Test Type (Optional)</Label>
                      <Input id={`testType-${index}`} value={lang.testType || ""} onChange={(e) => handleLanguageItemChange(index, "testType", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor={`score-${index}`} className="text-sm">Score (Optional)</Label>
                      <Input id={`score-${index}`} value={lang.score || ""} onChange={(e) => handleLanguageItemChange(index, "score", e.target.value)} />
                  </div>
              </div>
              {/* Action Buttons for this item */}
              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingLanguageIndex(null)}>Cancel Edit</Button>
              </div>
          </div>
      </div>
  );

  // --- End Render Functions for Language Proficiency ---

  return (
    <div className="relative min-h-screen pb-10">
      {/* Decorative Elements - Similar to landing page */}
      <div className="fixed inset-0 w-full h-screen pointer-events-none overflow-hidden z-0">
        <div 
          className="profile-decor absolute w-40 h-40 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl"
          style={{ top: '15%', right: '10%' }}
        ></div>
        <div 
          className="profile-decor absolute w-32 h-32 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 blur-lg"
          style={{ top: '60%', left: '5%' }}
        ></div>
        <div 
          className="profile-decor absolute w-48 h-48 rounded-full bg-gradient-to-r from-purple-500/5 to-blue-500/10 blur-xl"
          style={{ bottom: '10%', right: '15%' }}
        ></div>
      </div>

      <div className="space-y-8 max-w-4xl mx-auto p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex justify-between items-center mb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                <User className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Your Profile
              </h1>
            </div>
            <p className="text-foreground/70 text-lg">
              Manage your educational details to receive personalized recommendations
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 p-6 bg-gradient-to-br from-background via-primary/5 to-background rounded-xl border border-primary/20 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-xl text-primary">Profile Completion</h3>
            </div>
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-background to-background/50 border border-primary/30 shadow-inner"
            >
              <span className="text-sm font-semibold text-primary">{completionPercentage}%</span>
            </motion.div>
          </div>
          
          <div className="w-full h-3 bg-background/80 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              className={`h-full rounded-full ${
                completionPercentage < 50 
                  ? "bg-gradient-to-r from-amber-400 to-amber-500" 
                  : completionPercentage < 80 
                  ? "bg-gradient-to-r from-blue-400 to-primary" 
                  : "bg-gradient-to-r from-green-400 to-green-500"
              }`}
            />
          </div>
          
          <div className="mt-4 text-foreground/80">
            {completionPercentage === 100 ? (
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                <span>Your profile is complete!</span>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 text-amber-500 flex-shrink-0">
                  {completionPercentage >= 50 ? <Check /> : '!'}
                </div>
                <span>Your profile is {completionPercentage}% complete. Adding more details will help us provide better recommendations.</span>
              </div>
            )}
          </div>
        </motion.div>

        <Accordion type="single" collapsible className="w-full" defaultValue="personal" value={expandedSection} onValueChange={setExpandedSection}>
          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <AccordionItem value="personal" className="border border-primary/20 rounded-xl mb-5 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-blue-50/50 to-background/80 data-[state=open]:bg-gradient-to-r data-[state=open]:from-blue-100/50 data-[state=open]:to-blue-50/30 transition-all duration-300">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-background border border-blue-200/50 text-blue-600 shadow-sm">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg text-blue-800">Personal Information</span>
                    <p className="text-xs text-blue-600/70 mt-0.5">Your basic information and contact details</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-5 bg-gradient-to-b from-white to-blue-50/30">
                {editSection === 'personal' ? (
                  renderPersonalInfoEdit()
                ) : (
                  <div className="pl-10 space-y-4 py-2">
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditToggle('personal')}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-zinc-500">First Name</p>
                        <p className="font-medium">{userProfile.firstName || "Not provided"}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-zinc-500">Last Name</p>
                        <p className="font-medium">{userProfile.lastName || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Email</p>
                      <p className="font-medium">{userProfile.email || "Not provided"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Phone</p>
                      <p className="font-medium">{userProfile.phone || "Not provided"}</p>
                    </div>
                    {/* Added Location and Nationality Display */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-zinc-500">Current Location</p>
                        <p className="font-medium">{userProfile.currentLocation || "Not provided"}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-zinc-500">Nationality</p>
                        <p className="font-medium">{userProfile.nationality || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* Education */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <AccordionItem value="education" className="border border-primary/20 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-purple-50 to-background data-[state=open]:bg-purple-100/50 transition-all duration-300">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-base">Education History</span>
                    <p className="text-xs text-zinc-500 mt-0.5">Your academic background and qualifications</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-white">
                {editSection === "education" ? (
                  <div className="pl-10 space-y-4">
                    {/* Target Study Level */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Study Level</label>
                      <Select
                        value={editedProfile?.targetStudyLevel || "__NONE__"}
                        onValueChange={(value) => handleFieldChange('targetStudyLevel', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                          <SelectItem value="Master's">Master's</SelectItem>
                          <SelectItem value="Doctorate">Doctorate</SelectItem>
                          <SelectItem value="Postgraduate Diploma/Certificate">Postgraduate Diploma/Certificate</SelectItem>
                          <SelectItem value="Vocational/Trade">Vocational/Trade</SelectItem>
                          <SelectItem value="Undecided">Undecided</SelectItem>
                          <SelectItem value="__NONE__">None specified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Existing education fields editing */}
                    {editedProfile?.education?.map((edu, index) => 
                        editingEducationIndex === index 
                            ? renderEducationEditItem(edu, index) 
                            : renderEducationDisplayItem(edu, index)
                    )}
                    
                    {/* Add Education Button and Dialog */}
                    <Dialog open={isAddEducationModalOpen} onOpenChange={setIsAddEducationModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full mt-4 border-dashed border-purple-400 text-purple-600 hover:bg-purple-50"
                        >
                          <Plus size={16} className="mr-2" /> Add Education Entry
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Education Entry</DialogTitle>
                        </DialogHeader>
                        {/* Modal content for adding education */}
                      </DialogContent>
                    </Dialog>

                    {/* Add the Language Proficiency section right here */}
                    {/* Language Proficiency Edit Section */}
                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-md font-medium mb-3 text-purple-800">Language Proficiency</h3>
                      {editedProfile?.languageProficiency?.map((lang, index) =>
                        editingLanguageIndex === index
                          ? renderLanguageEditItem(lang, index)
                          : renderLanguageDisplayItem(lang, index)
                      )}

                      <Dialog open={isAddLanguageModalOpen} onOpenChange={setIsAddLanguageModalOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full mt-4 border-dashed border-purple-400 text-purple-600 hover:bg-purple-50"
                          >
                            <Plus size={16} className="mr-2" /> Add Language Proficiency
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Language Proficiency</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {/* Language */}
                            <div className="space-y-2">
                              <Label htmlFor="new-language">Language</Label>
                              <Input id="new-language" value={newLanguageEntry.language} onChange={(e) => handleNewLanguageEntryChange("language", e.target.value)} placeholder="e.g., English" />
                            </div>
                            {/* Proficiency Level */}
                            <div className="space-y-2">
                              <Label htmlFor="new-proficiencyLevel">Proficiency Level</Label>
                              <Select
                                value={newLanguageEntry.proficiencyLevel || "__NONE__"}
                                onValueChange={(value) => handleNewLanguageEntryChange("proficiencyLevel", value)}
                              >
                                <SelectTrigger id="new-proficiencyLevel"><SelectValue placeholder="Select level" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Beginner">Beginner</SelectItem>
                                  <SelectItem value="Elementary">Elementary</SelectItem>
                                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                                  <SelectItem value="Upper Intermediate">Upper Intermediate</SelectItem>
                                  <SelectItem value="Advanced">Advanced</SelectItem>
                                  <SelectItem value="Proficient">Proficient</SelectItem>
                                  <SelectItem value="Native">Native</SelectItem>
                                  <SelectItem value="__NONE__">Not Specified</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Test Type & Score */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="new-testType">Test Type (Optional)</Label>
                                <Input id="new-testType" value={newLanguageEntry.testType || ""} onChange={(e) => handleNewLanguageEntryChange("testType", e.target.value)} placeholder="e.g., IELTS, TOEFL" />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="new-score">Score (Optional)</Label>
                                <Input id="new-score" value={newLanguageEntry.score || ""} onChange={(e) => handleNewLanguageEntryChange("score", e.target.value)} placeholder="e.g., 7.5, 100" />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleAddNewLanguage}>Add Language</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {/* End Language Proficiency Edit Section */}
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSaveChanges}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pl-10 space-y-4 py-2">
                    {/* Display Target Study Level */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-500">Target Study Level</p>
                      <p className="font-medium">{userProfile?.targetStudyLevel && userProfile.targetStudyLevel !== "__NONE__" ? userProfile.targetStudyLevel : "Not specified"}</p>
                    </div>
                    
                    {/* Display Education History Section Title */}
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-sm text-purple-700">Education History</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditToggle("education")}
                        className="text-purple-600 hover:bg-purple-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    
                    {/* Display Education Items */}
                    {userProfile?.education?.map((edu, index) => renderEducationDisplayItem(edu, index))}
                    {(!userProfile?.education || userProfile.education.length === 0) && <p className="text-sm text-zinc-500">No education history provided.</p>}
                    
                    {/* Display Language Proficiency Section Title */}
                    <h4 className="font-medium text-sm text-purple-700 mt-6 mb-2">Language Proficiency</h4>
                    
                    {/* Display Language Proficiency Items */}
                    {userProfile?.languageProficiency && userProfile.languageProficiency.length > 0 ? (
                      userProfile.languageProficiency.map((lang, index) => (
                        <motion.div
                          key={`lang-display-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="p-3 bg-purple-50 rounded-lg mb-2 flex justify-between items-center flex-wrap gap-2"
                        >
                          <div>
                            <span className="font-medium text-sm mr-2">{lang.language}:</span>
                            <span className="text-sm text-purple-700">{lang.proficiencyLevel && lang.proficiencyLevel !== "__NONE__" ? lang.proficiencyLevel : 'Not specified'}</span>
                          </div>
                          {(lang.testType || lang.score) && (
                            <div className="text-xs text-zinc-500">
                              {lang.testType && <span>Test: {lang.testType}</span>}
                              {lang.score && <span className="ml-2">Score: {lang.score}</span>}
                            </div>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No language proficiency provided.</p>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* Career Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <AccordionItem value="career" className="border border-primary/20 rounded-xl mb-5 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-primary/10 to-background/80 data-[state=open]:bg-gradient-to-r data-[state=open]:from-primary/20 data-[state=open]:to-primary/5 transition-all duration-300">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-background border border-primary/30 text-primary shadow-sm">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg text-primary/70">Career Goals</span>
                    <p className="text-xs text-primary/70 mt-0.5">Your professional aspirations and objectives</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-5 bg-gradient-to-b from-white to-primary/5">
                {editSection === 'career' ? (
                  renderCareerGoalsEdit()
                ) : (
                  <div className="pl-10 space-y-4 py-2">
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditToggle('career')}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Short-term Goals</p>
                      <p className="font-medium whitespace-pre-wrap">
                        {userProfile.careerGoals?.shortTerm || "Not provided"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Long-term Goals</p>
                      <p className="font-medium whitespace-pre-wrap">
                        {userProfile.careerGoals?.longTerm || "Not provided"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-2">Achievements & Extracurricular Interests</p>
                      <p className="font-medium whitespace-pre-wrap">
                        {userProfile.careerGoals?.achievements || "Not provided"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userProfile.skills?.length > 0 ? (
                          userProfile.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary">{skill}</Badge>
                          ))
                        ) : (
                            <span className="text-zinc-500 text-sm">No skills provided</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-2">Desired Industries</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userProfile.careerGoals?.desiredIndustry?.length > 0 ? (
                          userProfile.careerGoals.desiredIndustry.map(
                            (industry, index) => (
                                <Badge key={index} variant="outline" className="bg-green-50 border-green-200 text-green-800">{industry}</Badge>
                            )
                          )
                        ) : (
                            <span className="text-zinc-500 text-sm">
                            No desired industries provided
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-2">Desired Roles</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userProfile.careerGoals?.desiredRoles?.length > 0 ? (
                          userProfile.careerGoals.desiredRoles.map((role, index) => (
                              <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-800">{role}</Badge>
                          ))
                        ) : (
                            <span className="text-zinc-500 text-sm">
                            No desired roles provided
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <AccordionItem value="preferences" className="border border-primary/20 rounded-xl mb-5 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-green-50/50 to-background/80 data-[state=open]:bg-gradient-to-r data-[state=open]:from-green-100/50 data-[state=open]:to-green-50/30 transition-all duration-300">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-green-100 to-background border border-green-200/50 text-green-600 shadow-sm">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg text-green-800">Preferences</span>
                    <p className="text-xs text-green-600/70 mt-0.5">Your preferences for educational programs</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-5 bg-gradient-to-b from-white to-green-50/30">
                {editSection === 'preferences' ? (
                  renderPreferencesEdit()
                ) : (
                  <div className="pl-10 space-y-4 py-2">
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditToggle('preferences')}
                        className="text-green-600 hover:bg-green-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-2">Preferred Locations</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userProfile.preferences?.preferredLocations?.length > 0 ? (
                          userProfile.preferences.preferredLocations.map(
                            (location, index) => (
                                <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">{location}</Badge>
                            )
                          )
                        ) : (
                            <span className="text-zinc-500 text-sm">
                            No preferred locations provided
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Study Mode</p>
                      <p className="font-medium">
                        {userProfile.preferences?.studyMode || "Not provided"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Preferred Start Date</p>
                      <p className="font-medium">
                        {userProfile.preferences?.startDate
                            ? new Date(userProfile.preferences.startDate + 'T00:00:00').toLocaleDateString(
                              "en-US",
                              { year: "numeric", month: "long" }
                            )
                          : "Not provided"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Budget Range (Tuition)</p>
                      <p className="font-medium">
                        ${userProfile.preferences?.budgetRange?.min?.toLocaleString() || 0} - $
                          {userProfile.preferences?.budgetRange?.max?.toLocaleString() || 'Any'}
                      </p>
                    </div>
                    {/* --- Added Fields Display --- */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Preferred Duration</p>
                      <p className="font-medium">
                          {userProfile.preferences?.preferredDuration?.min || userProfile.preferences?.preferredDuration?.max
                            ? `${userProfile.preferences.preferredDuration.min || '?'} - ${userProfile.preferences.preferredDuration.max || '?'} ${userProfile.preferences.preferredDuration.unit || 'units'}`
                            : "Not specified"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Preferred Study Language</p>
                      <p className="font-medium">
                          {userProfile.preferences?.preferredStudyLanguage || "Not specified"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Living Expenses Budget (per month)</p>
                      <p className="font-medium">
                          {userProfile.preferences?.livingExpensesBudget?.min || userProfile.preferences?.livingExpensesBudget?.max
                            ? `${userProfile.preferences.livingExpensesBudget.min?.toLocaleString() || '?'} - ${userProfile.preferences.livingExpensesBudget.max?.toLocaleString() || '?'} ${userProfile.preferences.livingExpensesBudget.currency || 'USD'}`
                            : "Not specified"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-zinc-500">Interest in Residency/Migration</p>
                      <p className="font-medium">
                          {userProfile.preferences?.residencyInterest ? "Yes" : "No"}
                      </p>
                    </div>
                    {/* --- End Added Fields Display --- */}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* Documents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <AccordionItem value="documents" className="border border-primary/20 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-amber-50 to-background data-[state=open]:bg-amber-100/50 transition-all duration-300">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-base">Documents</span>
                    <p className="text-xs text-zinc-500 mt-0.5">Uploaded files that enhance your recommendations</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-white">
                <div className="pl-10 space-y-4 py-2">
                  <div className="space-y-3">
                    {/* Resume */}
                    <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-md border border-gray-200">
                          <FileText size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Resume/CV</p>
                          <p className="text-xs text-gray-500">Your educational and professional experience</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userProfile?.documents?.resume ? (
                          <>
                            <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                              <Check size={14} className="mr-1" />
                              Uploaded
                            </span>
                            <DocumentUpload
                              onSuccess={(fileId) => handleDocumentUpdate('resume', fileId)}
                              allowedFileTypes={['.pdf', '.docx', '.doc']}
                              className="h-8"
                              vectorStoreId={userProfile?.vectorStoreId || ''}
                              disabled={!userProfile?.vectorStoreId}
                            >
                              <div className="flex items-center justify-center h-full p-1 text-center">
                                <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-800">
                                  <Edit size={14} className="mr-1" /> Replace
                                </Button>
                              </div>
                            </DocumentUpload>
                          </>
                        ) : (
                          <>
                            <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                              Not uploaded
                            </span>
                            <DocumentUpload
                              onSuccess={(fileId) => handleDocumentUpdate('resume', fileId)}
                              allowedFileTypes={['.pdf', '.docx', '.doc']}
                              className="h-8"
                              vectorStoreId={userProfile?.vectorStoreId || ''}
                              disabled={!userProfile?.vectorStoreId}
                            >
                              <div className="flex items-center justify-center h-full p-1 text-center">
                                <Button variant="outline" size="sm" className="h-8 text-blue-600 hover:text-blue-800">
                                  <Plus size={14} className="mr-1" /> Upload
                                </Button>
                              </div>
                            </DocumentUpload>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Transcripts */}
                    <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-md border border-gray-200">
                          <FileText size={20} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Transcripts</p>
                          <p className="text-xs text-gray-500">Your academic records</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userProfile?.documents?.transcripts ? (
                          <>
                            <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                              <Check size={14} className="mr-1" />
                              Uploaded
                            </span>
                            <DocumentUpload
                              onSuccess={(fileId) => handleDocumentUpdate('transcripts', fileId)}
                              allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                              className="h-8"
                              vectorStoreId={userProfile?.vectorStoreId || ''}
                              disabled={!userProfile?.vectorStoreId}
                            >
                              <div className="flex items-center justify-center h-full p-1 text-center">
                                <Button variant="ghost" size="sm" className="h-8 text-purple-600 hover:text-purple-800">
                                  <Edit size={14} className="mr-1" /> Replace
                                </Button>
                              </div>
                            </DocumentUpload>
                          </>
                        ) : (
                          <>
                            <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                              Not uploaded
                            </span>
                            <DocumentUpload
                              onSuccess={(fileId) => handleDocumentUpdate('transcripts', fileId)}
                              allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                              className="h-8"
                              vectorStoreId={userProfile?.vectorStoreId || ''}
                              disabled={!userProfile?.vectorStoreId}
                            >
                              <div className="flex items-center justify-center h-full p-1 text-center">
                                <Button variant="outline" size="sm" className="h-8 text-purple-600 hover:text-purple-800">
                                  <Plus size={14} className="mr-1" /> Upload
                                </Button>
                              </div>
                            </DocumentUpload>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Statement of Purpose */}
                    <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-md border border-gray-200">
                          <FileText size={20} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Statement of Purpose</p>
                          <p className="text-xs text-gray-500">Your educational goals</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userProfile?.documents?.statementOfPurpose ? (
                          <>
                            <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                              <Check size={14} className="mr-1" />
                              Uploaded
                            </span>
                            <DocumentUpload
                              onSuccess={(fileId) => handleDocumentUpdate('statementOfPurpose', fileId)}
                              allowedFileTypes={['.pdf', '.docx', '.doc', '.txt']}
                              className="h-8"
                              vectorStoreId={userProfile?.vectorStoreId || ''}
                              disabled={!userProfile?.vectorStoreId}
                            >
                              <div className="flex items-center justify-center h-full p-1 text-center">
                                <Button variant="ghost" size="sm" className="h-8 text-amber-600 hover:text-amber-800">
                                  <Edit size={14} className="mr-1" /> Replace
                                </Button>
                              </div>
                            </DocumentUpload>
                          </>
                        ) : (
                          <>
                            <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                              Not uploaded
                            </span>
                            <DocumentUpload
                              onSuccess={(fileId) => handleDocumentUpdate('statementOfPurpose', fileId)}
                              allowedFileTypes={['.pdf', '.docx', '.doc', '.txt']}
                              className="h-8"
                              vectorStoreId={userProfile?.vectorStoreId || ''}
                              disabled={!userProfile?.vectorStoreId}
                            >
                              <div className="flex items-center justify-center h-full p-1 text-center">
                                <Button variant="outline" size="sm" className="h-8 text-amber-600 hover:text-amber-800">
                                  <Plus size={14} className="mr-1" /> Upload
                                </Button>
                              </div>
                            </DocumentUpload>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Language Tests / Other */}
                    <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-md border border-gray-200">
                          <Languages size={20} className="text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Language Tests / Other</p>
                          <p className="text-xs text-gray-500">Additional supporting documents</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(userProfile?.documents?.otherDocuments && userProfile.documents.otherDocuments.length > 0) ? (
                          <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                            <Check size={14} className="mr-1" />
                            {userProfile.documents.otherDocuments.length} Uploaded
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                            Not uploaded
                          </span>
                        )}
                        <DocumentUpload
                          onSuccess={(fileId) => {
                            // Create a function to handle multiple documents
                            // This is a simplified version that just appends to the array
                            const updatedDocs = userProfile?.documents?.otherDocuments || [];
                            const newDoc = {
                              fileId: fileId,
                              vectorStoreId: userProfile?.vectorStoreId || '',
                              uploadedAt: new Date().toISOString(),
                              status: 'uploaded'
                            };
                            
                            // Update user profile with new other document
                            if (userProfile) {
                              const updatedDocuments = { ...userProfile.documents };
                              updatedDocuments.otherDocuments = [...updatedDocs, newDoc];
                              
                              const updatedProfile = {
                                ...userProfile,
                                documents: updatedDocuments
                              };
                              
                              // Update in database and state
                              fetch('/api/profile/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatedProfile),
                              }).then(response => {
                                if (response.ok) {
                                  setUserProfile(updatedProfile);
                                  toast({ 
                                    title: "Document Uploaded", 
                                    description: "Your additional document has been uploaded successfully.", 
                                    variant: "default" 
                                  });
                                }
                              }).catch(error => {
                                console.error("Error uploading other document:", error);
                                toast({ 
                                  title: "Upload Failed", 
                                  description: "Failed to upload document. Please try again.", 
                                  variant: "destructive" 
                                });
                              });
                            }
                          }}
                          allowedFileTypes={['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png']}
                          className="h-8"
                          vectorStoreId={userProfile?.vectorStoreId || ''}
                          disabled={!userProfile?.vectorStoreId}
                        >
                          <div className="flex items-center justify-center h-full p-1 text-center">
                            <Button variant="outline" size="sm" className="h-8 text-cyan-600 hover:text-cyan-800">
                              <Plus size={14} className="mr-1" /> Upload
                            </Button>
                          </div>
                        </DocumentUpload>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        </Accordion>

        {/* Delete Profile Button and Dialog */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-8 border-t border-primary/20 pt-6"
        >
          <Button 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Profile
          </Button>
        </motion.div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-gradient-to-b from-background to-background/95 border border-primary/20 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-red-600 text-xl">Delete Profile</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-foreground/80 mb-3">
                Are you sure you want to delete your profile? This action cannot be undone.
              </p>
              <p className="text-foreground/70">
                All your profile data, recommendations, and uploaded documents will be permanently removed.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProfile} 
                disabled={isLoading}
                className="bg-gradient-to-r from-red-500 to-red-600"
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 