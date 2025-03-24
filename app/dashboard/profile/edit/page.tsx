"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEditRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.push("/profile?edit=true");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );
} 