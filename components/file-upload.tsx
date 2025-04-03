"use client";
import React, { useCallback, useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { FilePlus2, Plus, Trash2, CircleX } from "lucide-react";
import { useDropzone } from "react-dropzone";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface FileUploadProps {
  vectorStoreId: string; // Make required
  onAddStore?: (id: string) => void;
  onUnlinkStore?: () => void;
  customTrigger?: React.ReactNode;
  dialogOpen?: boolean;
  setDialogOpen?: (open: boolean) => void;
  acceptedFileTypes?: string[];
  disabled?: boolean; // Add disabled prop
}

export default function FileUpload({
  vectorStoreId,
  onAddStore = () => {},
  onUnlinkStore = () => {},
  customTrigger,
  dialogOpen,
  setDialogOpen: externalSetDialogOpen,
  acceptedFileTypes = [],
  disabled = false // Default to false
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState<boolean>(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  
  // Use external dialog state if provided, otherwise use internal state
  const isDialogOpen = dialogOpen !== undefined ? dialogOpen : internalDialogOpen;
  // Prevent opening dialog if disabled
  const setIsDialogOpen = disabled 
    ? () => {} // No-op when disabled 
    : (externalSetDialogOpen || setInternalDialogOpen);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.length ? Object.fromEntries(acceptedFileTypes.map(type => [type, []])) : undefined,
    maxFiles: 1,
    disabled: disabled // Disable dropzone when component is disabled
  });

  const removeFile = () => {
    setFile(null);
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return; // Prevent submit if disabled
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }
    
    if (!vectorStoreId) {
      setStoreError("No vector store found. Please complete your profile setup first.");
      return;
    }
    
    setUploading(true);
    setStoreError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Content = arrayBufferToBase64(arrayBuffer);
      const fileObject = {
        name: file.name,
        content: base64Content,
      };

      // 1. Upload file
      const uploadResponse = await fetch("/api/vector_stores/upload_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileObject,
        }),
      });
      if (!uploadResponse.ok) {
        throw new Error("Error uploading file");
      }
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      if (!fileId) {
        throw new Error("Error getting file ID");
      }
      console.log("Uploaded file:", uploadData);

      // Notify parent that the file has been uploaded
      if (typeof onAddStore === 'function') {
        onAddStore(fileId);
      }

      // 2. Add file to vector store
      const addFileResponse = await fetch("/api/vector_stores/add_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          vectorStoreId,
        }),
      });
      if (!addFileResponse.ok) {
        throw new Error("Error adding file to vector store");
      }
      const addFileData = await addFileResponse.json();
      console.log("Added file to vector store:", addFileData);
      setFile(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error during file upload process:", error);
      setStoreError(error instanceof Error ? error.message : "There was an error processing your file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={!disabled && isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {customTrigger || (
          <div className={`bg-white rounded-full flex items-center justify-center py-1 px-3 border border-zinc-200 gap-1 font-medium text-sm transition-all ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer hover:bg-zinc-50'
          }`}>
            <Plus size={16} />
            Upload
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] md:max-w-[600px] max-h-[80vh] overflow-y-scrollfrtdtd">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add files to your vector store</DialogTitle>
          </DialogHeader>
          <div className="my-6">
            {!vectorStoreId || disabled ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-md text-sm">
                <p>
                  {disabled 
                    ? "File upload is currently disabled." 
                    : "No vector store found. Please complete your profile setup first."}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-medium w-24 text-nowrap">
                    Vector store
                  </div>
                  <div className="text-zinc-400 text-xs font-mono flex-1 text-ellipsis truncate">
                    {vectorStoreId}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleX
                          onClick={() => {
                            if (typeof onUnlinkStore === 'function') {
                              onUnlinkStore();
                            }
                          }}
                          size={16}
                          className="cursor-pointer text-zinc-400 mb-0.5 shrink-0 mt-0.5 hover:text-zinc-700 transition-all"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Unlink vector store</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
          
          {storeError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm mb-4">
              <p>{storeError}</p>
            </div>
          )}
          
          <div className="flex justify-center items-center mb-4 h-[200px]">
            {disabled ? (
              <div className="text-center text-zinc-500">
                File upload is currently disabled.
              </div>
            ) : file ? (
              <div className="flex flex-col items-start">
                <div className="text-zinc-400">Loaded file</div>
                <div className="flex items-center mt-2">
                  <div className="text-zinc-900 mr-2">{file.name}</div>

                  <Trash2
                    onClick={removeFile}
                    size={16}
                    className="cursor-pointer text-zinc-900"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div
                  {...getRootProps()}
                  className="p-6 flex items-center justify-center relative focus-visible:outline-0"
                >
                  <input {...getInputProps()} />
                  <div
                    className={`absolute rounded-full transition-all duration-300 ${
                      isDragActive
                        ? "h-56 w-56 bg-zinc-100"
                        : "h-0 w-0 bg-transparent"
                    }`}
                  ></div>
                  <div className="flex flex-col items-center text-center z-10 cursor-pointer">
                    <FilePlus2 className="mb-4 size-8 text-zinc-700" />
                    <div className="text-zinc-700">Upload a file</div>
                    <div className="text-xs text-zinc-400 mt-1">
                      or drag and drop
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              disabled={!file || uploading || !vectorStoreId || disabled}
              className="w-full"
              type="submit"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
