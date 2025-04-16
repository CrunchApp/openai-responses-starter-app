import { MessageItem } from "@/lib/assistant";
import React from "react";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

// Define user data interface
interface UserData {
  user: any; // Using any for simplicity, would be properly typed in a production app
  profile: any;
}

interface MessageProps {
  message: MessageItem;
  userData?: UserData; // Make optional for backward compatibility
}

const Message: React.FC<MessageProps> = ({ message, userData }) => {
  return (
    <div className="text-sm">
      {message.role === "user" ? (
        <div className="flex justify-end">
          <div className="flex items-end gap-2">
            <div className="max-w-[85%] ml-4 rounded-2xl rounded-br-sm px-4 py-3 md:ml-10 bg-primary/10 text-foreground shadow-sm">
              <div>
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {message.content[0].text as string}
                </ReactMarkdown>
              </div>
            </div>
            
            {/* User Avatar - Show user's avatar if available */}
            <Avatar className="flex-shrink-0 size-8 shadow-sm border border-primary/10">
              {userData?.user ? (
                <AvatarImage 
                  src={userData.user.user_metadata?.avatar_url || ''}
                  alt={userData.profile?.first_name || 'User'}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
                {userData?.profile?.first_name?.charAt(0) || 
                 userData?.user?.email?.charAt(0) || 'U'}
                {userData?.profile?.last_name?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex gap-2">
            {/* Replace Avatar with a simple div for the image */}
            <div className="flex-shrink-0 size-8 relative shadow-sm overflow-hidden rounded-full"> 
              <Image
                src="/images/vectors/cap.png"
                alt="Vista Assistant"
                fill
                sizes="32px"
                className="object-cover" // Removed scale-110, adjust if needed
                priority
              />
              {/* Removed AvatarFallback */}
            </div>
            
            <div className="max-w-[85%] mr-4 rounded-2xl rounded-tl-sm px-4 py-3 md:mr-10 bg-white border border-primary/10 text-foreground shadow-sm">
              <div>
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {message.content[0].text as string}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
