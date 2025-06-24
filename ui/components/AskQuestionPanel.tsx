import React, { useState, useEffect, useRef } from 'react';
import { type ChatMessage } from '../types';
import { ChatDisplay } from './ChatDisplay';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { UpArrowIcon } from './icons/UpArrowIcon'; // Changed from QuestionMarkIcon
import { StopIcon } from './icons/StopIcon';

interface AskQuestionPanelProps {
  collections: string[];
  onAskQuestion: (collectionName: string, question: string) => Promise<void>;
  chatMessages: ChatMessage[];
  isLoading: boolean; // Global loading state for "Ask" action
  isFetchingCollections: boolean; // Specific state for initial collection load
  clearMessages: () => void;
  refreshCollections: () => void; // This function in App.tsx sets global isLoading
}

export const AskQuestionPanel: React.FC<AskQuestionPanelProps> = ({
  collections,
  onAskQuestion,
  chatMessages,
  isLoading,
  isFetchingCollections,
  clearMessages,
  refreshCollections,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [question, setQuestion] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (collections.length > 0 && !selectedCollection) {
      setSelectedCollection(collections[0]);
    }
  }, [collections, selectedCollection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!selectedCollection || !question.trim()) {
      return;
    }
    await onAskQuestion(selectedCollection, question);
    setQuestion('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (formRef.current && !isLoading && selectedCollection && question.trim() && collections.length > 0) {
         const submitButton = formRef.current.querySelector('button[type="submit"]') as HTMLButtonElement | null;
         if (submitButton && !submitButton.disabled) {
            formRef.current.requestSubmit();
         }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg shadow-xl overflow-hidden">
      {/* Header Part */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-3xl font-semibold text-slate-100">Ask a Question</h2>
      </div>

      {/* Chat Display Area */}
      <div className="flex-1 overflow-y-auto bg-white"> {/* Added bg-white here */}
        <ChatDisplay messages={chatMessages} />
      </div>

      {/* Input Area (Fixed at the bottom) */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        {/* Collection Selection and Refresh */}
        <div className="flex items-end space-x-3 mb-3">
          <div className="flex-grow">
            <label htmlFor="collection" className="block text-sm font-medium text-slate-300 mb-1">
              Select Collection
            </label>
            <div className="relative">
              <select
                id="collection"
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                disabled={isFetchingCollections || collections.length === 0 || isLoading}
                className="w-full pl-4 pr-10 py-2.5 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 appearance-none bg-slate-700 text-slate-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isFetchingCollections && <option value="" className="text-slate-500">Loading collections...</option>}
                {!isFetchingCollections && collections.length === 0 && <option value="" className="text-slate-500">No collections available</option>}
                {collections.map(col => (
                  <option key={col} value={col} className="bg-slate-700 text-slate-100">{col}</option>
                ))}
              </select>
              <ChevronDownIcon className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <button
            type="button"
            onClick={refreshCollections}
            disabled={isLoading} 
            title="Refresh collections"
            className="flex-shrink-0 p-2.5 border border-slate-600 rounded-md shadow-sm text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 disabled:opacity-50 transition-colors h-[42px] w-[42px] flex items-center justify-center"
            aria-label="Refresh available collections"
          >
            {isLoading && !chatMessages.some(msg => msg.id.startsWith('user-')) ? 
              <SpinnerIcon className="w-5 h-5 animate-spin" /> :
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            }
          </button>
        </div>

        {/* Question Input Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex items-stretch space-x-3">
          <div className="flex-grow">
            <label htmlFor="question-input" className="sr-only">Your Question</label>
            <textarea
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 bg-slate-700 text-slate-100 placeholder:text-slate-400 transition-colors resize-none disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder={collections.length === 0 ? "Select or add a collection first" : "Type your question (Shift+Enter for new line)..."}
              disabled={isLoading || collections.length === 0 || isFetchingCollections}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !selectedCollection || !question.trim() || collections.length === 0 || isFetchingCollections}
            className="flex-shrink-0 p-2.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:bg-slate-500 disabled:hover:bg-slate-500 disabled:cursor-not-allowed transition-colors w-[42px] flex items-center justify-center"
            aria-label={isLoading ? "Stop processing question" : "Ask question"}
          >
            {isLoading ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <UpArrowIcon className="w-5 h-5" />
            )}
          </button>
        </form>
        {isLoading && (
          <p className="text-xs text-slate-400 mt-2 text-center" aria-live="polite">
            Generating response...
          </p>
        )}
      </div>
    </div>
  );
};