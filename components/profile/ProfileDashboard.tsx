"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, FileText, User, BookOpen, Briefcase, Settings, Edit, ArrowLeft, Loader2, Save, X, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
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

// Derive the Education type directly from the schema
type EducationSchemaType = z.infer<typeof ProfileSchema.shape.education.element>;

export default function ProfileDashboard() {
  const [expandedSection, setExpandedSection] = useState("personal");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);
  const [newEducationEntry, setNewEducationEntry] = useState<EducationSchemaType>({
    degreeLevel: "",
    institution: "",
    fieldOfStudy: "",
    graduationYear: "",
    gpa: undefined
  });
  const [isAddEducationModalOpen, setIsAddEducationModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  
  // Add effect to check auth state
  useEffect(() => {
    if (!authLoading && !user) {
      // If auth is loaded and there's no user, redirect away
      console.log("ProfileDashboard: No user found, redirecting to login.");
      router.replace('/login'); // Or '/' or '/signup'
    }
    // If user exists, proceed with fetching profile data (existing useEffect)
  }, [authLoading, user]);

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
      
      // Call the API to update the profile
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
      } else {
        setUserProfile(editedProfile);
        setEditSection(null);
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
        current = current[key];
      }
      
      const finalKey = keys[keys.length - 1];
      
      // Handle specific field types if necessary (like comma-separated strings)
      if (['skills', 'careerGoals.desiredIndustry', 'careerGoals.desiredRoles', 'preferences.preferredLocations'].includes(fieldPath)) {
          current[finalKey] = value.split(',').map((item: string) => item.trim()).filter(Boolean);
      } else if (fieldPath.startsWith('preferences.budgetRange')) {
          current[finalKey] = parseInt(value, 10) || 0;
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
      setNewEducationEntry({ degreeLevel: "", institution: "", fieldOfStudy: "", graduationYear: "", gpa: undefined }); 
  };

  const handleNewEducationEntryChange = (field: keyof EducationSchemaType, value: string) => {
      setNewEducationEntry(prev => ({ ...prev, [field]: value }));
  };

  // --- End Education Specific Handlers ---

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
    total += 4;
    
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
    total += 4;
    
    // Documents
    if (userProfile.documents?.resume) completed++;
    if (userProfile.documents?.transcripts) completed++;
    if (userProfile.documents?.statementOfPurpose) completed++;
    total += 3;
    
    return Math.round((completed / total) * 100);
  };
  
  const completionPercentage = calculateCompletion();

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
      } else {
        console.log("Profile deletion result:", result);
        
        // Check if auth user was deleted or just profile data
        if (result.authUserDeleted === false) {
          console.log("Warning: Only profile data was deleted, auth user remains");
          // We'll still sign out and redirect the user, but we can optionally show a warning
          
          // Consider showing a toast notification here if your UI supports it
          // toast.warning("Profile data deleted, but your account remains. Contact support for complete account deletion.");
        } else {
          console.log("Profile and auth user deleted successfully");
        }
        
        // Sign out the user after successful deletion (even if only partial)
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
          console.log("User signed out successfully");
          
          // Redirect to login page
          router.push('/login');
        } catch (signOutError) {
          console.error("Error during sign out:", signOutError);
          // Even if sign out fails, still redirect to login
          router.push('/login');
        }
      }
    } catch (error) {
      console.error("Error deleting profile:", error);
      setError("Failed to delete profile. Please try again later.");
      setIsDeleteDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (authLoading || (isLoading && user)) { // Show loading if auth is loading OR if auth is done, user exists, but profile is still loading
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        <p className="mt-4 text-lg text-gray-600">Loading...</p>
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

  // Render edit mode for Preferences
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold"
          >
            Your Profile Dashboard
          </motion.h1>
          <p className="text-gray-600">
            View and manage your education profile information
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-blue-800">Profile Completion</h3>
          <span className="text-sm font-semibold text-blue-700">{completionPercentage}%</span>
        </div>
        
        <div className="w-full h-3 bg-white rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${
              completionPercentage < 50 
                ? "bg-amber-500" 
                : completionPercentage < 80 
                ? "bg-blue-500" 
                : "bg-green-500"
            }`}
          />
        </div>
        
        <div className="mt-4 text-sm text-blue-600">
          {completionPercentage === 100 ? (
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Your profile is complete!
            </div>
          ) : (
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-amber-500" />
              Your profile is {completionPercentage}% complete. Consider adding more details for better recommendations.
            </div>
          )}
        </div>
      </motion.div>

      <Accordion type="single" collapsible className="w-full" defaultValue="personal" value={expandedSection} onValueChange={setExpandedSection}>
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <AccordionItem value="personal" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-blue-50 to-white data-[state=open]:bg-blue-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Personal Information</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Your basic information and contact details</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
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
              </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <AccordionItem value="education" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-purple-50 to-white data-[state=open]:bg-purple-100 transition-all duration-300">
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
              {editSection === 'education' ? (
              <div className="pl-10 space-y-4 py-2">
                   {editedProfile?.education?.map((edu, index) => 
                       editingEducationIndex === index 
                           ? renderEducationEditItem(edu, index) 
                           : renderEducationDisplayItem(edu, index)
                   )}

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
                         <div className="space-y-4 py-4">
                             <div className="space-y-2">
                                 <Label htmlFor="new-degreeLevel">Degree Level</Label>
                                 <Select 
                                     value={newEducationEntry.degreeLevel}
                                     onValueChange={(value) => handleNewEducationEntryChange("degreeLevel", value)}
                                 >
                                     <SelectTrigger id="new-degreeLevel"><SelectValue placeholder="Select degree" /></SelectTrigger>
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
                             <div className="space-y-2">
                                 <Label htmlFor="new-institution">Institution</Label>
                                 <Input id="new-institution" value={newEducationEntry.institution} onChange={(e) => handleNewEducationEntryChange("institution", e.target.value)} />
                        </div>
                             <div className="space-y-2">
                                 <Label htmlFor="new-fieldOfStudy">Field of Study</Label>
                                 <Input id="new-fieldOfStudy" value={newEducationEntry.fieldOfStudy} onChange={(e) => handleNewEducationEntryChange("fieldOfStudy", e.target.value)} />
                        </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                     <Label htmlFor="new-graduationYear">Graduation Year</Label>
                                     <Input id="new-graduationYear" value={newEducationEntry.graduationYear} onChange={(e) => handleNewEducationEntryChange("graduationYear", e.target.value)} />
                      </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="new-gpa">GPA (Optional)</Label>
                                     <Input id="new-gpa" value={newEducationEntry.gpa || ""} onChange={(e) => handleNewEducationEntryChange("gpa", e.target.value)} />
                      </div>
                        </div>
                        </div>
                         <DialogFooter>
                            <DialogClose asChild>
                               <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleAddNewEducation}>Add Entry</Button>
                         </DialogFooter>
                      </DialogContent>
                   </Dialog>

                   <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                     <Button variant="outline" onClick={handleCancelEdit}>
                       <X className="h-4 w-4 mr-2" />
                       Cancel Section Edit
                     </Button>
                     <Button onClick={handleSaveChanges} disabled={isLoading}>
                       {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                       Save All Education Changes
                     </Button>
                      </div>
                    </div>
              ) : (
                <div className="pl-10 space-y-4 py-2">
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditToggle('education')}
                      className="text-purple-600 hover:bg-purple-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Education Section
                    </Button>
              </div>
                  {userProfile?.education?.length > 0 ? (
                     userProfile.education.map(renderEducationDisplayItem)
                  ) : (
                     <p className="text-sm text-zinc-500 italic">No education history provided.</p>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Career Goals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <AccordionItem value="career" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-blue-50 to-white data-[state=open]:bg-blue-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Career Goals</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Your professional aspirations and objectives</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
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
                    <p className="font-medium whitespace-pre-wrap"> {/* Preserve line breaks */}
                    {userProfile.careerGoals?.shortTerm || "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Long-term Goals</p>
                    <p className="font-medium whitespace-pre-wrap"> {/* Preserve line breaks */}
                    {userProfile.careerGoals?.longTerm || "Not provided"}
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <AccordionItem value="preferences" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-green-50 to-white data-[state=open]:bg-green-100 transition-all duration-300">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-base">Preferences</span>
                  <p className="text-xs text-zinc-500 mt-0.5">Your preferences for educational programs</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-white">
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
                        ? new Date(userProfile.preferences.startDate + 'T00:00:00').toLocaleDateString( // Ensure correct date parsing
                          "en-US",
                          { year: "numeric", month: "long" }
                        )
                      : "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-zinc-500">Budget Range</p>
                  <p className="font-medium">
                    ${userProfile.preferences?.budgetRange?.min?.toLocaleString() || 0} - $
                      {userProfile.preferences?.budgetRange?.max?.toLocaleString() || 'Any'}
                  </p>
                </div>
              </div>
               )}
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Documents */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <AccordionItem value="documents" className="border border-blue-100 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <AccordionTrigger className="hover:no-underline px-6 py-4 bg-gradient-to-r from-amber-50 to-white data-[state=open]:bg-amber-100 transition-all duration-300">
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
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-md border border-gray-200">
                        <FileText size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Resume/CV</p>
                        <p className="text-xs text-gray-500">Your professional experience</p>
                      </div>
                    </div>
                    <div>
                      {userProfile.documents?.resume ? (
                        <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                          <Check size={14} className="mr-1" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  
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
                    <div>
                      {userProfile.documents?.transcripts ? (
                        <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                          <Check size={14} className="mr-1" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  
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
                    <div>
                      {userProfile.documents?.statementOfPurpose ? (
                        <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full flex items-center">
                          <Check size={14} className="mr-1" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>
      </Accordion>

      {/* Delete Profile Button and Dialog */}
      <div className="mt-8 border-t pt-6">
        <Button 
          variant="destructive" 
          onClick={() => setIsDeleteDialogOpen(true)}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Profile
        </Button>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Profile</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to delete your profile? This action cannot be undone.
            </p>
            <p className="text-gray-700 mt-2">
              All your profile data, recommendations, and uploaded documents will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProfile} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 