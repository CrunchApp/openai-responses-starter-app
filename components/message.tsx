import { MessageItem } from "@/lib/assistant";
import React from "react";
import ReactMarkdown from "react-markdown";

interface MessageProps {
  message: MessageItem;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <div className="text-sm">
      {message.role === "user" ? (
        <div className="flex justify-end">
          <div className="flex items-end gap-2">
            <div className="max-w-[85%] ml-4 rounded-2xl rounded-br-sm px-4 py-3 md:ml-10 bg-blue-100 text-gray-800 font-light shadow-sm">
              <div>
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {message.content[0].text as string}
                </ReactMarkdown>
              </div>
            </div>
            <div className="flex-shrink-0 size-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex gap-2">
            <div className="flex-shrink-0 size-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="max-w-[85%] mr-4 rounded-2xl rounded-tl-sm px-4 py-3 md:mr-10 bg-white border border-blue-100 text-gray-800 font-light shadow-sm">
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
