
import React, { useEffect, useRef } from 'react';
import { type ChatMessage } from '../types';

interface ChatDisplayProps {
  messages: ChatMessage[];
}

export const ChatDisplay: React.FC<ChatDisplayProps> = ({ messages }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatDate = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-white">
      {messages.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full text-slate-500">
          <p className="text-lg">No messages yet.</p>
          <p>Ask a question to start the conversation.</p>
        </div>
      ) : (
        messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xl lg:max-w-2xl px-4 py-3 rounded-xl shadow ${
                msg.sender === 'user'
                  ? 'bg-sky-100 text-sky-700 border border-sky-300' // User message: light blue background
                  : 'bg-white text-slate-700 border border-slate-200' // Bot message: white background
              }`}
            >
              {msg.collectionName && msg.sender === 'user' && (
                  <p className="text-xs opacity-75 mb-1">
                      To: <span className="font-medium">{msg.collectionName}</span>
                  </p>
              )}
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.sender === 'user' ? (
                <p className="text-xs mt-1.5 text-slate-400 text-right">
                  {formatDate(msg.timestamp)}
                </p>
              ) : (
                <div className="flex justify-start items-center mt-1.5">
                  <p className="text-xs text-slate-400">
                    {formatDate(msg.timestamp)}
                    {msg.responseTimeSeconds !== undefined && (
                      <span className="ml-2 text-sky-600 font-medium">
                        ({msg.responseTimeSeconds.toFixed(2)}s)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))
      )}
      <div ref={chatEndRef} />
    </div>
  );
};
