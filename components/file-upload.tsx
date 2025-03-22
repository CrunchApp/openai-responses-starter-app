"use client";
import React, { useCallback, useState, FormEvent, useEffect } from "react";
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
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface FileUploadProps {
  vectorStoreId?: string;
  onAddStore?: (id: string) => void;
  onUnlinkStore?: () => void;
  customTrigger?: React.ReactNode;
  dialogOpen?: boolean;
  setDialogOpen?: (open: boolean) => void;
  acceptedFileTypes?: string[];
}

export default function FileUpload({
  vectorStoreId,
  onAddStore = () => {},
  onUnlinkStore = () => {},
  customTrigger,
  dialogOpen,
  setDialogOpen: externalSetDialogOpen,
  acceptedFileTypes = []
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [userVectorStoreId, setUserVectorStoreId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState<boolean>(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  
  // Use external dialog state if provided, otherwise use internal state
  const isDialogOpen = dialogOpen !== undefined ? dialogOpen : internalDialogOpen;
  const setIsDialogOpen = externalSetDialogOpen || setInternalDialogOpen;

  // Load the user's vector store ID from localStorage on component mount
  useEffect(() => {
    const storedVectorStoreId = localStorage.getItem('userVectorStoreId');
    if (storedVectorStoreId) {
      setUserVectorStoreId(storedVectorStoreId);
      
      // If no vector store ID was provided through props, update using the stored one
      if (!vectorStoreId && typeof onAddStore === 'function') {
        onAddStore(storedVectorStoreId);
      }
    }
  }, [vectorStoreId, onAddStore]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.length ? Object.fromEntries(acceptedFileTypes.map(type => [type, []])) : undefined,
    maxFiles: 1
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
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }
    
    // Determine which vector store ID to use
    // Priority: 1. Prop vectorStoreId 2. localStorage userVectorStoreId
    const activeVectorStoreId = vectorStoreId || userVectorStoreId;
    
    if (!activeVectorStoreId) {
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

      // Use the active vector store ID for the uploaded file
      if (typeof onAddStore === 'function') {
        onAddStore(activeVectorStoreId);
      }

      // 2. Add file to vector store
      const addFileResponse = await fetch("/api/vector_stores/add_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          vectorStoreId: activeVectorStoreId,
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {customTrigger || (
          <div className="bg-white rounded-full flex items-center justify-center py-1 px-3 border border-zinc-200 gap-1 font-medium text-sm cursor-pointer hover:bg-zinc-50 transition-all">
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
            {!vectorStoreId && !userVectorStoreId ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-md text-sm">
                <p>No vector store found. Please complete your profile setup first.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-medium w-24 text-nowrap">
                    Vector store
                  </div>
                  <div className="text-zinc-400 text-xs font-mono flex-1 text-ellipsis truncate">
                    {vectorStoreId || userVectorStoreId}
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
            {file ? (
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
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={uploading || (!vectorStoreId && !userVectorStoreId)}>
              {uploading ? "Uploading..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
