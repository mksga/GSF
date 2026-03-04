import React, { useState } from 'react';
import { ServiceSite, Language } from '../types';
import { translations } from '../translations';

interface SiteCardProps {
  site: ServiceSite;
  index: number;
  onDelete: (id: string) => void;
  onBlock: (site: ServiceSite) => void;
  onGeneratePromo: (site: ServiceSite) => Promise<void>;
  onMarkAsRead: (id: string) => void;
  onView: (id: string) => void;
  language: Language;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, index, onDelete, onBlock, onGeneratePromo, onMarkAsRead, onView, language }) => {
  const [activeTab, setActiveTab] = useState<'native' | 'russian'>('native');
  const [copiedHeadlines, setCopiedHeadlines] = useState(false);
  const [copiedDescIndex, setCopiedDescIndex] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(true);
  
  const t = translations[language];
  const currentContent = activeTab === 'native' 
    ? (site.nativePromo || (site as any).nativeAds || { headlines: [], descriptions: [] })
    : (site.russianPromo || (site as any).russianAds || { headlines: [], descriptions: [] });

  // Determine localized category display
  // Use the currently selected app language
  const displayCategory = site.serviceCategory[language] || site.serviceCategory.en || site.serviceCategory.ru || "Service";
  
  // Determine localized location display
  const displayCountry = typeof site.country === 'string' ? site.country : (site.country[language] || site.country.en || site.country.ru || "Unknown");
  const displayCity = site.city ? (typeof site.city === 'string' ? site.city : (site.city[language] || site.city.en || site.city.ru || "")) : "";
  const displayLocation = displayCity ? `${displayCity}, ${displayCountry}` : displayCountry;

  const handleCopyHeadlines = () => {
    const headlinesToCopy = currentContent.headlines || (currentContent as any).keywords || [];
    const textToCopy = headlinesToCopy.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedHeadlines(true);
      setTimeout(() => setCopiedHeadlines(false), 2000);
    });
  };

  const handleCopyDescription = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDescIndex(idx);
      setTimeout(() => setCopiedDescIndex(null), 2000);
    });
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(site.url).then(() => {
          setCopiedUrl(true);
          onView(site.id);
          setTimeout(() => setCopiedUrl(false), 2000);
      });
  };

  const handleLinkClick = () => {
    onView(site.id);
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    try {
      await onGeneratePromo(site);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col group relative ${site.isLastViewed ? 'ring-2 ring-indigo-500 shadow-lg border-indigo-200' : 'border-slate-200 shadow-sm hover:shadow-xl'}`}>
      
      {/* Header Section */}
      <div className="p-5 flex flex-col gap-3 relative z-10">
        <div className="flex justify-between items-start gap-3">
          
          <div className="flex-1 min-w-0">
             {/* Tags Row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
               {/* Index Badge */}
               <div className="inline-flex items-center justify-center h-5 px-2 rounded bg-slate-900 text-white text-[10px] font-bold shadow-sm select-none">
                  #{index + 1}
               </div>
               
               {/* Status Badges */}
               {site.isLastViewed ? (
                 <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200 shadow-sm">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Just Viewed
                 </div>
               ) : site.isViewed ? (
                 <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Viewed
                 </div>
               ) : site.isNew && (
                 <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider border border-emerald-600 shadow-sm animate-pulse">
                   New
                 </span>
               )}
            </div>

            {/* Title & Link */}
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight line-clamp-2" title={site.siteName}>
                {site.siteName}
              </h3>
            </div>
            <div className="flex items-center gap-2 group/link">
               <a 
                 href={site.url} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 onClick={handleLinkClick}
                 className="text-indigo-600 hover:text-indigo-700 transition-colors text-sm font-semibold truncate max-w-[240px] hover:underline decoration-indigo-200 underline-offset-4" 
                 title={site.url}
               >
                 {site.url}
               </a>
               <button 
                 onClick={handleCopyUrl} 
                 className={`p-1.5 rounded transition-all ${copiedUrl ? "bg-emerald-100 text-emerald-700" : "text-slate-400 opacity-100 sm:opacity-0 sm:group-hover/link:opacity-100 hover:text-slate-900 hover:bg-slate-100"}`}
                 title={t.copyUrl}
               >
                 {copiedUrl ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                 )}
               </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0 z-20">
             <button onClick={() => onBlock(site)} className="p-1.5 rounded bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm" title={t.block}>
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
             </button>
             <button onClick={() => onDelete(site.id)} className="p-1.5 rounded bg-white text-red-400 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm" title={t.delete}>
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
          </div>
        </div>

        {/* Location & Category Tags (Compact) */}
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold" title={displayLocation}>
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="truncate max-w-[160px]">{displayLocation}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold" title={displayCategory}>
            <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            <span>{displayCategory}</span>
          </div>
        </div>
      </div>

      {/* Tabs Control - Minimal */}
      {site.isPromoGenerated && (
        <div className="px-5 pb-0 border-b border-slate-100 relative z-10 flex justify-between items-end">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('native')} 
              className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'native' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabNative} 
              <span className="text-[9px] uppercase ml-1 opacity-70">({site.language})</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('russian')} 
              className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'russian' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabRussian}
            </button>
          </div>
          
          <button 
            onClick={() => setIsContentVisible(!isContentVisible)}
            className="pb-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
            title={isContentVisible ? t.collapse : t.expand}
          >
            {isContentVisible ? (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                <span className="hidden sm:inline">{t.collapse}</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                <span className="hidden sm:inline">{t.expand}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Content Body */}
      <div className="p-5 flex flex-col gap-5 bg-slate-50/50 relative z-10">
        
        {!site.isPromoGenerated ? (
          <div className="flex justify-center py-2">
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t.generatingPromo}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {t.generatePromo}
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {isContentVisible ? (
              <div className="animate-fadeIn">
                {/* Headlines - Full Width */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.headlines}</h4>
                    <button onClick={handleCopyHeadlines} className={`text-[10px] px-2 py-1 rounded font-semibold transition-all flex items-center gap-1 ${copiedHeadlines ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm'}`}>
                        {copiedHeadlines ? t.copied : t.copyAll}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 content-start">
                    {(currentContent.headlines || (currentContent as any).keywords || []).map((kw, i) => (
                      <span key={i} className="bg-white text-slate-700 text-xs font-medium px-2 py-1 rounded border border-slate-200 shadow-sm hover:border-slate-300 cursor-default select-all transition-colors">
                          {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Separator */}
                <div className="h-px bg-slate-200 w-full my-4"></div>

                {/* Descriptions - Full Width */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.descriptions}</h4>
                  <ul className="space-y-2">
                    {(currentContent.descriptions || []).map((desc, i) => {
                      if (!desc || desc.trim() === '') return null; // Don't render empty items
                      return (
                        <li 
                          key={i} 
                          onClick={() => handleCopyDescription(desc, i)} 
                          title={t.clickToCopy} 
                          className={`relative p-3 rounded-xl border transition-all cursor-pointer group shadow-sm ${copiedDescIndex === i ? 'bg-emerald-50 border-emerald-200 text-emerald-900 ring-1 ring-emerald-200' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                          <p className="text-xs leading-relaxed font-medium pr-5">{desc}</p>
                           {/* Copy Icon */}
                           <div className={`absolute top-3 right-3 transition-all duration-200 ${copiedDescIndex === i ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}>
                              {copiedDescIndex === i ? (
                                 <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                 <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              )}
                           </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 cursor-pointer hover:bg-slate-100/50 rounded-lg transition-colors" onClick={() => setIsContentVisible(true)}>
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    {t.headlinesAndDescriptions}
                 </span>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default SiteCard;