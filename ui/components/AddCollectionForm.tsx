
import React, { useState, useEffect } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DeleteIcon } from './icons/DeleteIcon'; 
import { ConfirmModal } from './ConfirmModal'; // Import the new modal

interface AddCollectionFormProps {
  onAddCollection: (collectionName: string, content: string) => Promise<void>;
  isLoading: boolean; 
  clearMessages: () => void;
  collections: string[];
  refreshCollections: () => Promise<void>;
  onDeleteCollection: (collectionName: string) => Promise<void>;
}

export const AddCollectionForm: React.FC<AddCollectionFormProps> = ({ 
  onAddCollection, 
  isLoading, 
  clearMessages,
  collections,
  refreshCollections,
  onDeleteCollection,
}) => {
  const [collectionName, setCollectionName] = useState('');
  const [content, setContent] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  
  // State for custom confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [collectionPendingDeletion, setCollectionPendingDeletion] = useState<string | null>(null);

  const validateCollectionName = (name: string): boolean => {
    if (!name) {
      setNameError('Collection name is required.');
      return false;
    }
    const isValid = /^[a-zA-Z0-9_-]+$/.test(name);
    if (!isValid) {
      setNameError('Collection name can only contain alphanumeric characters, underscores, and hyphens.');
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCollectionName(collectionName) || !content.trim()) {
      if (!content.trim()) alert('Content is required.'); 
      return;
    }
    await onAddCollection(collectionName, content);
    const submissionSuccessful = !isLoading && !nameError; 
    if (submissionSuccessful) { 
        setCollectionName(''); 
        setContent('');
    }
  };
  
  const handleRefreshCollections = () => {
    clearMessages(); 
    refreshCollections();
  };

  const handleDeleteClicked = (collName: string) => {
    console.log('[AddCollectionForm] handleDeleteClicked for collection:', collName);
    setCollectionPendingDeletion(collName);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (collectionPendingDeletion) {
      console.log('[AddCollectionForm] handleConfirmDelete: Deleting collection', collectionPendingDeletion);
      await onDeleteCollection(collectionPendingDeletion);
      // The modal will be closed by its onConfirm which calls its onClose
    }
    // Resetting state is handled by modal's onClose
  };

  const handleCloseConfirmModal = () => {
    console.log('[AddCollectionForm] handleCloseConfirmModal: Closing modal');
    setIsConfirmModalOpen(false);
    setCollectionPendingDeletion(null);
  };

  // Removed useEffect that used window.confirm

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete the collection "<strong>{collectionPendingDeletion}</strong>"? 
            This action cannot be undone.
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
      />
      <div className="flex flex-col h-full bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Form Section */}
        <div className="p-6">
          <h2 className="text-3xl font-semibold text-slate-700 mb-6">Add New Collection</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="collectionName" className="block text-sm font-medium text-slate-600 mb-1">
                Collection Name
              </label>
              <input
                type="text"
                id="collectionName"
                value={collectionName}
                onChange={(e) => {
                  setCollectionName(e.target.value);
                  if (nameError) validateCollectionName(e.target.value);
                }}
                className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-700 text-white placeholder-slate-400 ${nameError ? 'border-red-500' : 'border-slate-600'}`}
                placeholder="e.g., project_alpha_docs"
                required
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameError && <p id="name-error" className="text-xs text-red-600 mt-1">{nameError}</p>}
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-slate-600 mb-1">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12} 
                className="w-full h-64 resize-y px-4 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-700 text-white placeholder-slate-400"
                placeholder="Paste or type the content for this collection..."
                required
              />
            </div>
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="min-w-[200px] flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <SpinnerIcon className="w-5 h-5 mr-2 animate-spin" /> : null}
                Submit Collection
              </button>
            </div>
          </form>
        </div>

        {/* Table Section */}
        <div className="flex flex-col flex-1 p-6 border-t border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-slate-700">Available Collections</h3>
            <button
              onClick={handleRefreshCollections}
              disabled={isLoading}
              title="Refresh collections"
              className="p-2 border border-slate-300 rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 disabled:opacity-50 transition-colors"
              aria-label="Refresh available collections"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isLoading && collections.length === 0 ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading && collections.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <SpinnerIcon className="w-8 h-8 text-sky-600 animate-spin" />
                <p className="ml-2 text-slate-500">Loading collections...</p>
              </div>
            ) : collections.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No collections available. Add one above!</p>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-md">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Collection Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {collections.map((colName) => (
                    <tr key={colName} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{colName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteClicked(colName)} 
                          disabled={isLoading || isConfirmModalOpen} 
                          className="text-red-600 hover:text-red-800 disabled:text-slate-400 disabled:cursor-not-allowed p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
                          aria-label={`Delete collection ${colName}`}
                          title={`Delete ${colName}`}
                        >
                          <DeleteIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
