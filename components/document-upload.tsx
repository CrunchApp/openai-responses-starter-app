"use client";
import React, { useState } from "react";
import FileUpload from "./file-upload";

interface DocumentUploadProps {
  children: React.ReactNode;
  allowedFileTypes?: string[];
  onSuccess: (fileId: string) => void;
  className?: string;
  vectorStoreId: string; // Required prop
  disabled?: boolean; // Add disabled prop
}

export default function DocumentUpload({
  children,
  allowedFileTypes = [],
  onSuccess,
  className = "",
  vectorStoreId,
  disabled = false, // Default to false
}: DocumentUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    }
  };

  // Custom trigger component for upload dialog
  const CustomTrigger = (
    <div 
      className={`${className} flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg transition-all ${
        disabled 
          ? 'opacity-50 cursor-not-allowed bg-gray-100' 
          : 'cursor-pointer hover:bg-gray-50'
      }`}
      onClick={disabled ? (e) => e.preventDefault() : undefined} // Prevent clicks when disabled
    >
      {children}
    </div>
  );

  return (
    <>
      <FileUpload
        vectorStoreId={vectorStoreId}
        onAddStore={handleAddStore}
        onUnlinkStore={() => {}}
        customTrigger={CustomTrigger}
        dialogOpen={isDialogOpen}
        setDialogOpen={setIsDialogOpen}
        acceptedFileTypes={allowedFileTypes}
        disabled={disabled} // Pass disabled state to FileUpload
      />
      
      {error && (
        <div className="mt-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </>
  );
} 