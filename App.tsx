
import React, { useState, useEffect, useCallback } from 'react';
import { findNewSites, generatePromoForSite } from './services/geminiService';
import { ServiceSite, Language, SearchQuery } from './types';
import SiteCard from './components/SiteCard';
import BlacklistModal from './components/BlacklistModal';
import SearchHistoryModal from './components/SearchHistoryModal';
import { translations } from './translations';

const MAX_SITES = 100;
const MAX_SEARCH_HISTORY = 10;

function App() {
  // Visible sites
  const [sites, setSites] = useState<ServiceSite[]>(() => {
    const saved = localStorage.getItem('serviceSites');
    if (!saved) return [];
    try {
       const parsed = JSON.parse(saved);
       // Migration for legacy data where serviceCategory was a string
       return parsed.map((s: any) => {
          if (typeof s.serviceCategory === 'string') {
             return {
                ...s,
                serviceCategory: {
                   en: s.serviceCategory,
                   ru: s.serviceCategory,
                   uk: s.serviceCategory
                }
             };
          }
          return s;
       });
    } catch(e) {
       return [];
    }
  });

  // Global history of ALL URLs ever found (persisted) to prevent duplicates in current session
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('serviceFinder_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Blacklist state
  const [blacklist, setBlacklist] = useState<string[]>(() => {
    const saved = localStorage.getItem('serviceFinder_blacklist');
    return saved ? JSON.parse(saved) : [];
  });

  // Search Query History (Country/City/Service combinations)
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>(() => {
    const saved = localStorage.getItem('serviceFinder_queryHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [isSearchHistoryOpen, setIsSearchHistoryOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  // NEW: State for progress animation
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  
  // Inputs
  const [specificCountry, setSpecificCountry] = useState('');
  const [specificCity, setSpecificCity] = useState('');
  const [specificService, setSpecificService] = useState('');
  
  const [language, setLanguage] = useState<Language>('ru');
  
  const t = translations[language];

  // Save visible sites
  useEffect(() => {
    localStorage.setItem('serviceSites', JSON.stringify(sites));
  }, [sites]);

  // Save history
  useEffect(() => {
    localStorage.setItem('serviceFinder_history', JSON.stringify(history));
  }, [history]);

  // Save blacklist
  useEffect(() => {
    localStorage.setItem('serviceFinder_blacklist', JSON.stringify(blacklist));
  }, [blacklist]);

  // Save search queries
  useEffect(() => {
    localStorage.setItem('serviceFinder_queryHistory', JSON.stringify(searchQueries));
  }, [searchQueries]);

  // Clears only the visible list (Workspace)
  const handleClearWorkspace = () => {
    setSites([]);
    setError(null);
  };

  // Clears EVERYTHING (Visible + History)
  const handleFullReset = () => {
    if (window.confirm(t.resetConfirm)) {
      setSites([]);
      setHistory([]);
      setError(null);
    }
  };

  const handleDeleteSite = (id: string) => {
    setSites(prev => prev.filter(site => site.id !== id));
  };

  const handleBlockSite = (siteToBlock: ServiceSite) => {
    if (window.confirm(`${t.block}?\n${siteToBlock.url}`)) {
      // Add to blacklist
      setBlacklist(prev => {
        const newSet = new Set(prev);
        newSet.add(siteToBlock.url);
        return Array.from(newSet);
      });
      // Remove from current view
      handleDeleteSite(siteToBlock.id);
    }
  };

  const handleRemoveFromBlacklist = (url: string) => {
    setBlacklist(prev => prev.filter(item => item !== url));
  };

  const handleClearSearchHistory = () => {
    setSearchQueries([]);
  };

  const handleGeneratePromo = async (site: ServiceSite) => {
    try {
      const updates = await generatePromoForSite(site);
      setSites(prev => prev.map(s => s.id === site.id ? { ...s, ...updates } : s));
    } catch (err: any) {
      console.error(err);
      alert(translations[language].errorGeneric || "Failed to generate promo");
      throw err;
    }
  };

  const handleUseSearchQuery = (q: SearchQuery) => {
    setSpecificCountry(q.country);
    setSpecificCity(q.city);
    setSpecificService(q.service);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatInputForHistory = (text: string) => {
    if (!text) return '';
    return text
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleMarkSiteAsRead = (id: string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, isNew: false } : s));
  };

  const handleSiteView = (id: string) => {
    setSites(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, isViewed: true, isLastViewed: true, isNew: false };
      }
      return { ...s, isLastViewed: false };
    }));
  };

  const findSite = useCallback(async (countryOverride?: string) => {
    if (sites.length >= MAX_SITES) {
      setError(translations[language].errorMax);
      return;
    }

    setIsLoading(true);
    setLoadingProgress(5);
    setLoadingStatus("Starting search...");
    setError(null);

    // Save to Search Query History if specific inputs are used
    const usingSpecifics = specificService.trim() || specificCity.trim() || specificCountry.trim();
    if (usingSpecifics) {
        setSearchQueries(prev => {
            const newQuery = {
                country: formatInputForHistory(specificCountry),
                city: formatInputForHistory(specificCity),
                service: formatInputForHistory(specificService),
                timestamp: Date.now()
            };
            
            // Remove exact duplicates
            const filtered = prev.filter(p => 
                !(p.country === newQuery.country && p.city === newQuery.city && p.service === newQuery.service)
            );
            
            // Add to top, limit to MAX
            return [newQuery, ...filtered].slice(0, MAX_SEARCH_HISTORY);
        });
    }

    try {
      // Exclude CURRENT sites, HISTORY, AND BLACKLISTED sites
      const currentUrls = sites.map(s => s.url);
      const allExcludedUrls = Array.from(new Set([...currentUrls, ...history, ...blacklist]));
      
      // Use inputs from state
      const serviceToUse = specificService;
      const cityToUse = specificCity;

      // Logic: If user clicked "Find Specific" but didn't pass countryOverride directly (from click), use input state
      const targetCountry = countryOverride || specificCountry;

      const newSites = await findNewSites(
          allExcludedUrls, 
          targetCountry, 
          serviceToUse, 
          cityToUse,
          // Callback for progress updates
          (status, progress) => {
              setLoadingStatus(status);
              setLoadingProgress(progress);
          },
          // Callback for incremental site updates
          (newSite) => {
              setSites(prev => {
                  // Check if site already exists to avoid duplicates
                  if (prev.some(s => s.url === newSite.url)) return prev;
                  // Add to top, but keep existing sites below
                  return [newSite, ...prev];
              });
              // Update history immediately too
              setHistory(prev => Array.from(new Set([...prev, newSite.url])));
          }
      );
      
      // Final sync (though incremental should have handled most)
      setSites(prev => {
        // Clear isNew from old sites (those that weren't just added)
        // Actually, the user wants NEW to stay until clicked, so we don't clear it here anymore
        return prev;
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || translations[language].errorGeneric);
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  }, [sites, history, blacklist, language, specificService, specificCity, specificCountry]);

  // Helper to determine if "Specific" button should be enabled
  const isSpecificSearchEnabled = specificCountry.trim().length > 0 || specificCity.trim().length > 0 || specificService.trim().length > 0;

  // Reusable Language Switcher Component
  const LanguageSwitcher = () => (
    <div className="flex items-center bg-white/60 backdrop-blur-md rounded-lg p-1 border border-slate-200 shadow-sm">
        <button 
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 text-xs font-bold rounded ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
        >
          EN
        </button>
        <button 
          onClick={() => setLanguage('ru')}
          className={`px-3 py-1.5 text-xs font-bold rounded ${language === 'ru' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
        >
          RU
        </button>
        <button 
          onClick={() => setLanguage('uk')}
          className={`px-3 py-1.5 text-xs font-bold rounded ${language === 'uk' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
        >
          UA
        </button>
     </div>
  );

  const showHeaderControls = sites.length > 0 || isLoading || !!error;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden">
      
      {/* Background Ambience (Light Mode) */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply"></div>
          <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-purple-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
      </div>

      <BlacklistModal 
        isOpen={isBlacklistOpen} 
        onClose={() => setIsBlacklistOpen(false)} 
        blacklist={blacklist}
        onRemove={handleRemoveFromBlacklist}
        language={language}
      />

      <SearchHistoryModal
        isOpen={isSearchHistoryOpen}
        onClose={() => setIsSearchHistoryOpen(false)}
        history={searchQueries}
        onSelect={handleUseSearchQuery}
        onClear={handleClearSearchHistory}
        language={language}
      />

      {/* Sticky Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${showHeaderControls ? 'bg-white/80 backdrop-blur-xl py-3 border-b border-slate-200/60 shadow-sm' : 'bg-transparent border-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center justify-between w-full xl:w-auto gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                {t.appTitle}
              </h1>
            </div>

            <div className={!showHeaderControls ? "xl:hidden" : ""}>
                <LanguageSwitcher />
            </div>
          </div>
          
          {/* Active Search Controls */}
          {showHeaderControls ? (
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto flex-1 justify-end animate-fadeIn">
                {/* Inputs Group */}
                <div className="flex flex-col sm:flex-row items-center w-full lg:w-auto bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-1 max-w-3xl min-w-[200px]">
                    <input
                        type="text"
                        value={specificService}
                        onChange={(e) => setSpecificService(e.target.value)}
                        placeholder={t.servicePlaceholder}
                        className="w-full min-w-0 px-3 py-2 sm:py-1.5 text-sm bg-transparent border-b sm:border-b-0 border-slate-100 focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400 font-medium"
                    />
                    <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1 shrink-0"></div>
                    <input
                        type="text"
                        value={specificCity}
                        onChange={(e) => setSpecificCity(e.target.value)}
                        placeholder={t.cityPlaceholder}
                        className="w-full min-w-0 px-3 py-2 sm:py-1.5 text-sm bg-transparent border-b sm:border-b-0 border-slate-100 focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400 font-medium"
                    />
                    <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1 shrink-0"></div>
                    <input
                        type="text"
                        value={specificCountry}
                        onChange={(e) => setSpecificCountry(e.target.value)}
                        placeholder={t.countryPlaceholder}
                        className="w-full min-w-0 px-3 py-2 sm:py-1.5 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400 font-medium"
                    />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                    <button
                        onClick={() => findSite(specificCountry)}
                        disabled={isLoading || sites.length >= MAX_SITES || !isSpecificSearchEnabled}
                        className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none"
                        title={t.findSpecific}
                    >
                        {isLoading && isSpecificSearchEnabled ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        )}
                        <span className="hidden sm:inline">{t.findSpecific}</span>
                    </button>

                    <button
                        onClick={() => findSite()}
                        disabled={isLoading || sites.length >= MAX_SITES}
                        className="h-10 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-sm flex-1 sm:flex-none"
                        title={t.findRandom}
                    >
                        {isLoading && !isSpecificSearchEnabled ? (
                           <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                        ) : (
                           <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        <span className="hidden sm:inline">{t.findRandom}</span>
                    </button>

                    {/* Tools */}
                    <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-sm shrink-0">
                        <button onClick={() => setIsSearchHistoryOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                        <button onClick={() => setIsBlacklistOpen(true)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></button>
                        <button onClick={handleClearWorkspace} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>
            </div>
          ) : (
            <div className="hidden xl:block shrink-0">
                <LanguageSwitcher />
            </div>
          )}
        </div>
      </header>

      {/* Main Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between animate-fadeIn shadow-sm">
            <div className="flex gap-3 items-center">
              <div className="bg-red-100 p-1.5 rounded-full">
                 <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <span className="text-red-800 font-medium text-sm">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
          </div>
        )}

        {/* Hero Section (Empty State) */}
        {sites.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 animate-fadeIn">
            
            {/* Nav Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
               <button onClick={() => setIsSearchHistoryOpen(true)} className="flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 transition-all text-slate-600 hover:text-slate-900 text-sm font-medium shadow-sm hover:shadow">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {t.searchHistoryTitle} <span className="ml-1 bg-slate-100 px-1.5 rounded text-xs text-slate-600 border border-slate-200">{searchQueries.length}</span>
               </button>
               <button onClick={() => setIsBlacklistOpen(true)} className="flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 transition-all text-slate-600 hover:text-slate-900 text-sm font-medium shadow-sm hover:shadow">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  {t.openBlacklist} <span className="ml-1 bg-slate-100 px-1.5 rounded text-xs text-slate-600 border border-slate-200">{blacklist.length}</span>
               </button>
               {history.length > 0 && (
                 <button onClick={handleFullReset} className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 transition-all text-red-600 hover:text-red-700 text-sm font-medium">
                   {t.resetHistory}
                 </button>
               )}
            </div>

            <div className="text-center max-w-2xl mx-auto mb-10">
               <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                 {t.readyTitle}
               </h2>
               <p className="text-lg text-slate-500 leading-relaxed font-medium">
                 {t.readyDesc}
               </p>
            </div>

            {/* Big Inputs - REDESIGNED FOR VISIBILITY */}
            <div className="w-full max-w-4xl flex flex-col gap-3 mb-8">
              <div className="bg-white p-2 sm:p-3 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row gap-2 shadow-xl shadow-slate-200/50 border border-slate-100 ring-1 ring-slate-900/5">
                 <input
                    type="text"
                    value={specificService}
                    onChange={(e) => setSpecificService(e.target.value)}
                    placeholder={t.servicePlaceholder}
                    className="flex-1 min-w-0 px-4 py-3 md:px-6 md:py-4 bg-slate-50/50 border border-transparent focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 text-slate-900 placeholder-slate-400 text-base md:text-lg font-semibold text-center md:text-left rounded-xl transition-all outline-none"
                 />
                 <div className="h-px md:h-auto md:w-px bg-slate-200 mx-2 hidden md:block"></div>
                 <input
                    type="text"
                    value={specificCity}
                    onChange={(e) => setSpecificCity(e.target.value)}
                    placeholder={t.cityPlaceholder}
                    className="flex-1 min-w-0 px-4 py-3 md:px-6 md:py-4 bg-slate-50/50 border border-transparent focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 text-slate-900 placeholder-slate-400 text-base md:text-lg font-semibold text-center md:text-left rounded-xl transition-all outline-none"
                 />
                 <div className="h-px md:h-auto md:w-px bg-slate-200 mx-2 hidden md:block"></div>
                 <input
                    type="text"
                    value={specificCountry}
                    onChange={(e) => setSpecificCountry(e.target.value)}
                    placeholder={t.countryPlaceholder}
                    className="flex-1 min-w-0 px-4 py-3 md:px-6 md:py-4 bg-slate-50/50 border border-transparent focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 text-slate-900 placeholder-slate-400 text-base md:text-lg font-semibold text-center md:text-left rounded-xl transition-all outline-none"
                 />
              </div>
            </div>

            {/* Big Actions */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button 
                onClick={() => findSite(specificCountry)}
                disabled={!isSpecificSearchEnabled}
                className="flex-1 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold shadow-lg shadow-slate-900/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {t.findSpecific}
              </button>
              <button 
                onClick={() => findSite()}
                className="flex-1 py-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-lg font-bold shadow-sm transform hover:-translate-y-0.5 transition-all"
              >
                {t.findRandom}
              </button>
            </div>

            {/* Recent Chips */}
            {searchQueries.length > 0 && (
                <div className="mt-12 flex flex-col items-center gap-3 animate-fadeIn w-full">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {t.recentSearches}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
                        {searchQueries.slice(0, 5).map((q, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => handleUseSearchQuery(q)} 
                                className="group px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm text-sm font-bold flex items-center gap-2"
                            >
                               {[q.service, q.city, q.country].filter(Boolean).join(' • ')}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}

        {/* Loading State - MODERN ANIMATION */}
        {isLoading && (
          <div className="max-w-md mx-auto py-20 text-center animate-fadeIn">
             <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                
                {/* Decorational Pulse */}
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                
                <div className="flex flex-col items-center gap-4">
                  {/* Icon */}
                  <div className="relative">
                     <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center relative z-10 border border-slate-100">
                        <svg className="w-8 h-8 text-indigo-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                     </div>
                  </div>

                  {/* Text Status */}
                  <div className="space-y-1">
                     <h3 className="text-lg font-bold text-slate-800 transition-all duration-300">
                        {loadingStatus || t.loading}
                     </h3>
                     <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        {isSpecificSearchEnabled ? `${specificCountry || specificCity}` : t.loadingRandom}
                     </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full mt-2">
                     <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                        <span>Processing</span>
                        <span>{loadingProgress}%</span>
                     </div>
                     <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out relative"
                           style={{ width: `${loadingProgress}%` }}
                        >
                        </div>
                     </div>
                  </div>
                </div>

             </div>
          </div>
        )}

        {/* Results List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 items-start">
          {sites.map((site, index) => (
            <SiteCard 
              key={site.id} 
              site={site} 
              index={sites.length - 1 - index} 
              onDelete={handleDeleteSite}
              onBlock={handleBlockSite}
              onGeneratePromo={handleGeneratePromo}
              onMarkAsRead={handleMarkSiteAsRead}
              onView={handleSiteView}
              language={language}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
