
import React from 'react';
import { Language, SearchQuery } from '../types';
import { translations } from '../translations';

interface SearchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SearchQuery[];
  onSelect: (query: SearchQuery) => void;
  onClear: () => void;
  language: Language;
}

const SearchHistoryModal: React.FC<SearchHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect,
  onClear,
  language 
}) => {
  if (!isOpen) return null;

  const t = translations[language];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.searchHistoryTitle}
            </h2>
            <p className="text-sm text-slate-500">{t.searchHistoryDesc}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <p>{t.emptySearchHistory}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((query, index) => {
                const locationParts = [];
                if (query.city) locationParts.push(query.city);
                if (query.country) locationParts.push(query.country);
                const locationText = locationParts.join(', ');

                return (
                  <button 
                    key={index} 
                    onClick={() => { onSelect(query); onClose(); }}
                    className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm transition-all group flex items-center justify-between"
                  >
                    <div className="flex flex-col items-start gap-1">
                        {query.service ? (
                            <>
                              <span className="font-bold text-indigo-600 text-lg">{query.service}</span>
                              {locationText && <span className="font-bold text-slate-600 text-base">{locationText}</span>}
                            </>
                        ) : (
                             <span className="font-bold text-slate-800 text-lg">{locationText}</span>
                        )}
                    </div>
                    <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.use} &rarr;
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between">
           <button 
            onClick={onClear}
            className="px-4 py-2 text-red-500 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
            disabled={history.length === 0}
          >
            {t.clearHistory}
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchHistoryModal;
