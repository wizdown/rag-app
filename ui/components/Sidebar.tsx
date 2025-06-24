import React from 'react';
import { ViewMode } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { QuestionMarkIcon } from './icons/QuestionMarkIcon';

interface SidebarProps {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { view: ViewMode.AskQuestion, label: 'Ask Question', icon: <QuestionMarkIcon className="w-5 h-5 mr-3" /> },
    { view: ViewMode.AddCollection, label: 'Add Collection', icon: <PlusIcon className="w-5 h-5 mr-3" /> },
  ];

  return (
    <aside className="w-64 bg-slate-800 p-4 space-y-4 flex flex-col">
      <h1 className="text-2xl font-semibold text-white mb-6 px-2">RAG Chat</h1>
      <nav className="flex-grow">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`w-full flex items-center px-3 py-3 text-left text-sm font-medium rounded-md transition-colors duration-150
              ${currentView === item.view
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="text-xs text-slate-500 mt-auto text-center">
        Minimalistic RAG UI
      </div>
    </aside>
  );
};