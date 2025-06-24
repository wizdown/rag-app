
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { AddCollectionForm } from './components/AddCollectionForm';
import { AskQuestionPanel } from './components/AskQuestionPanel';
import { ingestData, fetchCollections, askQuestion as apiAskQuestion, deleteCollection as apiDeleteCollection } from './services/apiService';
import { ViewMode, type ChatMessage, type Collection } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.AskQuestion);
  const [collections, setCollections] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);


  const loadCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedCollections = await fetchCollections();
      setCollections(fetchedCollections);
      setError(null);
    } catch (err) {
      let displayMessage = 'Failed to fetch collections.';
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        displayMessage = 'Network error: Could not connect to the server. Please ensure the backend is running and accessible at http://localhost:8000.';
      } else if (err instanceof Error) {
        displayMessage = err.message || displayMessage;
      }
      setError(displayMessage);
      setCollections([]); 
      setTimeout(() => { setError(null); }, 5000); 
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies: setIsLoading, setCollections, setError

  useEffect(() => {
    loadCollections();
  }, [loadCollections]); 

  const handleAddCollection = useCallback(async (collectionName: string, content: string) => {
    setError(null); 
    setSuccessMessage(null);
    try {
      setIsLoading(true);
      await ingestData(collectionName, content);
      setSuccessMessage(`Collection "${collectionName}" added successfully!`);
      await loadCollections(); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add collection.');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 3000);
    }
  }, [loadCollections]); // Dependencies: loadCollections, setIsLoading, setError, setSuccessMessage

  const handleDeleteCollection = useCallback(async (collectionName: string) => {
    console.log('[App.tsx] handleDeleteCollection entered for:', collectionName);
    setError(null); 
    setSuccessMessage(null);
    try {
      setIsLoading(true);
      console.log('[App.tsx] handleDeleteCollection: Calling apiDeleteCollection for:', collectionName);
      await apiDeleteCollection(collectionName);
      console.log('[App.tsx] handleDeleteCollection: apiDeleteCollection successful for:', collectionName);
      setSuccessMessage(`Collection "${collectionName}" deleted successfully!`);
      await loadCollections(); 
      console.log('[App.tsx] handleDeleteCollection: loadCollections after delete successful for:', collectionName);
    } catch (err) {
      console.error('[App.tsx] handleDeleteCollection: Error for:', collectionName, err);
      setError(err instanceof Error ? err.message : `Failed to delete collection "${collectionName}".`);
    } finally {
      setIsLoading(false);
      console.log('[App.tsx] handleDeleteCollection: finally block, clearing messages timeout for:', collectionName);
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 3000);
    }
  }, [loadCollections]); // Dependencies: loadCollections, setIsLoading, setError, setSuccessMessage

  const handleAskQuestion = useCallback(async (collectionName: string, question: string) => {
    setError(null);
    setSuccessMessage(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      collectionName,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    const startTime = performance.now();
    let responseTimeSeconds: number | undefined = undefined;

    try {
      setIsLoading(true);
      const response = await apiAskQuestion(collectionName, question);
      const endTime = performance.now();
      responseTimeSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.answer,
        collectionName,
        timestamp: new Date(),
        responseTimeSeconds,
      };
      setChatMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessageText = err instanceof Error ? err.message : 'Failed to get an answer.';
      setError(errorMessageText); 
      const botErrorResponseMessage: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        sender: 'bot',
        text: `Error: ${errorMessageText}`, 
        collectionName,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botErrorResponseMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  }, [setChatMessages, setError, setIsLoading, setSuccessMessage]); // Dependencies: setChatMessages, setError, setIsLoading, setSuccessMessage


  return (
    <div className="flex h-screen bg-slate-900 text-white">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 flex flex-col p-6 bg-slate-100 text-slate-900 overflow-y-auto relative">
        {successMessage && (
          <div className="absolute top-6 right-8 bg-green-500 text-white p-3 rounded-md shadow-lg text-sm transition-opacity duration-300 z-50 animate-fadeInOut" role="alert">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="absolute top-6 right-8 bg-red-500 text-white p-3 rounded-md shadow-lg text-sm transition-opacity duration-300 z-50 animate-fadeInOut" role="alert">
            {error}
          </div>
        )}

        {currentView === ViewMode.AddCollection && (
          <AddCollectionForm 
            onAddCollection={handleAddCollection} 
            isLoading={isLoading}
            clearMessages={clearMessages} 
            collections={collections}
            refreshCollections={loadCollections}
            onDeleteCollection={handleDeleteCollection}
          />
        )}
        {currentView === ViewMode.AskQuestion && (
          <AskQuestionPanel
            collections={collections}
            onAskQuestion={handleAskQuestion}
            chatMessages={chatMessages}
            isLoading={isLoading}
            isFetchingCollections={isLoading && collections.length === 0 && currentView === ViewMode.AskQuestion} 
            clearMessages={clearMessages} 
            refreshCollections={loadCollections}
          />
        )}
      </main>
    </div>
  );
};

export default App;
