"use client";
import React, { useState } from "react";
import { Upload } from "lucide-react";
import FileUpload from "./file-upload";

interface DocumentUploadProps {
  children: React.ReactNode;
  allowedFileTypes?: string[];
  maxSizeMB?: number;
  endpoint?: string;
  onSuccess: (fileId: string) => void;
  className?: string;
}

export default function DocumentUpload({
  children,
  allowedFileTypes = [],
  maxSizeMB = 5,
  endpoint = "/api/upload/document",
  onSuccess,
  className = "",
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get the user's vector store ID from localStorage
  const getUserVectorStoreId = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userVectorStoreId');
  };

  const handleAddStore = (storeId: string) => {
    // When a file is successfully uploaded and added to the vector store
    // We pass the file ID to the onSuccess callback
    try {
      // This simulates getting the file ID from our own upload component
      // In a real scenario, we'd extract this from the uploadData
      const fileId = storeId;
      
      if (typeof onSuccess === 'function') {
        onSuccess(fileId);
      }
    } catch (error) {
      console.error("Error in document upload: ", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setUploading(false);
    }
  };

  // Custom trigger component for upload dialog
  const CustomTrigger = (
    <div 
      className={`${className} cursor-pointer flex items-center justify-center hover:bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg transition-all`}
    >
      {children}
    </div>
  );

  return (
    <>
      <FileUpload
        vectorStoreId={getUserVectorStoreId() || undefined}
        onAddStore={handleAddStore}
        onUnlinkStore={() => {}}
        customTrigger={CustomTrigger}
        dialogOpen={isDialogOpen}
        setDialogOpen={setIsDialogOpen}
      />
      
      {error && (
        <div className="mt-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </>
  );
} 