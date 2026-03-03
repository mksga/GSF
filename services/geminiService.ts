
// services/geminiService.ts
import { ServiceSite } from "../types";
import { COUNTRIES, TARGET_CATEGORIES, EXCLUDED_CATEGORIES } from "../constants";

// Helper to get Groq API key
const getGroqApiKey = (): string => {
  let keysStr = "";
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    keysStr = import.meta.env.VITE_GROQ_API_KEY || "";
  } else if (typeof process !== 'undefined' && process.env) {
    keysStr = process.env.GROQ_API_KEY || "";
  }
  
  if (!keysStr) return "";
  const keys = keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length === 0) return "";
  return keys[Math.floor(Math.random() * keys.length)];
};

// Helper to get Serper API key
const getSerperApiKey = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SERPER_API_KEY || "";
  } else if (typeof process !== 'undefined' && process.env) {
    return process.env.SERPER_API_KEY || "";
  }
  return "";
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_TEXT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
];

async function callGroq(messages: any[], model?: string, temperature = 0.4, jsonMode = false) {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("API key is missing. Please set VITE_GROQ_API_KEY.");

  // If no model is specified, or if the old decommissioned model is passed, pick a random active model
  const selectedModel = (model && !model.includes("llama3-70b-8192")) 
    ? model 
    : GROQ_TEXT_MODELS[Math.floor(Math.random() * GROQ_TEXT_MODELS.length)];

  const body: any = {
    model: selectedModel,
    messages,
    temperature
  };
  
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function searchGoogleAndMaps(query: string, location: string) {
  const apiKey = getSerperApiKey();
  if (!apiKey) throw new Error("Serper API key is missing. Please set VITE_SERPER_API_KEY to enable Google Search & Maps.");

  const [searchRes, placesRes] = await Promise.all([
    fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${query} in ${location}`, num: 10 })
    }).then(res => res.json()).catch(() => ({ organic: [] })),
    fetch("https://google.serper.dev/places", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${query} in ${location}` })
    }).then(res => res.json()).catch(() => ({ places: [] }))
  ]);

  let context = "--- GOOGLE SEARCH RESULTS ---\n";
  searchRes.organic?.forEach((r: any) => {
    context += `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}\n\n`;
  });

  context += "--- GOOGLE MAPS (PLACES) RESULTS ---\n";
  placesRes.places?.forEach((r: any) => {
    if (r.website) { // Only include places with websites
      context += `Name: ${r.title}\nWebsite: ${r.website}\nAddress: ${r.address}\n\n`;
    }
  });

  return context;
}

// --- API CONFIGURATION ---

// Helper to shuffle categories
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const PADDING_HEADLINES_EN = [
    "Best Service", "Top Quality", "Professional", "Expert Help", "Contact Us", 
    "Available Now", "Great Value", "Trusted", "Recommended", "Local Pros", 
    "Fast Service", "Premium", "Certified", "Reliable", "Affordable"
];

const PADDING_HEADLINES_RU = [
    "Лучший Сервис", "Топ Качество", "Профессионально", "Эксперты", "Свяжитесь", 
    "Доступно", "Выгодно", "Надежно", "Рекомендуем", "Местные Профи", 
    "Быстро", "Премиум", "Сертифицировано", "Надежно", "Недорого"
];

const PADDING_LOCALIZED: Record<string, string[]> = {
  "Polish": ["Najlepszy Serwis", "Wysoka Jakość", "Profesjonalnie", "Eksperci", "Kontakt", "Dostępne Teraz", "Dobra Cena", "Zaufany", "Polecany", "Lokalni Pro", "Szybki Serwis", "Premium", "Certyfikowany", "Solidny", "Tanio"],
  "German": ["Bester Service", "Top Qualität", "Professionell", "Expertenhilfe", "Kontaktieren", "Verfügbar", "Guter Preis", "Vertrauenswürdig", "Empfohlen", "Lokale Profis", "Schneller Service", "Premium", "Zertifiziert", "Zuverlässig", "Günstig"],
  "French": ["Meilleur Service", "Top Qualité", "Professionnel", "Aide Expert", "Contactez-nous", "Disponible", "Bon Prix", "De Confiance", "Recommandé", "Pros Locaux", "Service Rapide", "Premium", "Certifié", "Fiable", "Abordable"],
  "Spanish": ["Mejor Servicio", "Alta Calidad", "Profesional", "Ayuda Experta", "Contáctenos", "Disponible", "Buen Precio", "Confiable", "Recomendado", "Pros Locales", "Servicio Rápido", "Premium", "Certificado", "Fiable", "Económico"],
  "Italian": ["Miglior Servizio", "Alta Qualità", "Professionale", "Aiuto Esperto", "Contattaci", "Disponibile", "Buon Prezzo", "Affidabile", "Consigliato", "Professionisti", "Servizio Rapido", "Premium", "Certificato", "Sicuro", "Economico"],
  "Portuguese": ["Melhor Serviço", "Alta Qualidade", "Profissional", "Ajuda Especial", "Contate-nos", "Disponível", "Bom Preço", "Confiável", "Recomendado", "Pros Locais", "Serviço Rápido", "Premium", "Certificado", "Seguro", "Acessível"],
  "Turkish": ["En İyi Hizmet", "Yüksek Kalite", "Profesyonel", "Uzman Yardımı", "Bize Ulaşın", "Mevcut", "İyi Fiyat", "Güvenilir", "Önerilen", "Yerel Uzmanlar", "Hızlı Hizmet", "Premium", "Sertifikalı", "Sağlam", "Uygun Fiyat"],
  "Dutch": ["Beste Service", "Top Kwaliteit", "Professioneel", "Expert Hulp", "Neem Contact Op", "Beschikbaar", "Goede Prijs", "Betrouwbaar", "Aanbevolen", "Lokale Pros", "Snelle Service", "Premium", "Gecertificeerd", "Degelijk", "Betaalbaar"],
  "Swedish": ["Bästa Service", "Hög Kvalitet", "Professionell", "Experthjälp", "Kontakta Oss", "Tillgänglig", "Bra Pris", "Pålitlig", "Rekommenderad", "Lokala Proffs", "Snabb Service", "Premium", "Certifierad", "Trygg", "Prisvärd"],
  "Russian": PADDING_HEADLINES_RU,
  "English": PADDING_HEADLINES_EN
};

function determineTargetLanguage(countryInput: string): string {
  const c = countryInput.toLowerCase().trim();
  if ([
    "russia", "belarus", "kazakhstan", "ukraine", "belorussia", "republic of belarus", "minsk", "moscow", "kiev", "kyiv",
    "россия", "беларусь", "казахстан", "украина", "минск", "москва", "киев", "спб", "санкт-петербург", "астана", "алматы", "ташкент", "бишкек", "душанбе", "ереван", "баку", "тбилиси", "кишинев",
    "uzbekistan", "armenia", "azerbaijan", "kyrgyzstan", "moldova", "узбекистан", "армения", "азербайджан", "киргизия", "молдова"
  ].some(key => c.includes(key))) return "Russian";

  if ([
    "usa", "uk", "united kingdom", "canada", "australia", "ireland", "new zealand", "great britain", "london", "new york", "toronto",
    "сша", "великобритания", "англия", "канада", "австралия", "ирландия", "новая зеландия"
  ].some(key => c.includes(key))) return "English";

  if (c.includes("poland") || c.includes("warsaw") || c.includes("польша")) return "Polish";
  if (c.includes("germany") || c.includes("berlin") || c.includes("austria") || c.includes("vienna") || c.includes("германия") || c.includes("австрия")) return "German";
  if (c.includes("france") || c.includes("paris") || c.includes("belgium") || c.includes("switzerland") || c.includes("франция") || c.includes("бельгия") || c.includes("швейцария")) return "French";
  if (c.includes("italy") || c.includes("rome") || c.includes("италия")) return "Italian";
  if (c.includes("spain") || c.includes("madrid") || c.includes("mexico") || c.includes("argentina") || c.includes("colombia") || c.includes("chile") || c.includes("peru") || c.includes("испания") || c.includes("мексика") || c.includes("аргентина")) return "Spanish";
  if (c.includes("brazil") || c.includes("rio") || c.includes("portugal") || c.includes("brazilia") || c.includes("бразилия") || c.includes("португалия")) return "Portuguese";
  if (c.includes("turkey") || c.includes("istanbul") || c.includes("турция")) return "Turkish";
  if (c.includes("netherlands") || c.includes("amsterdam") || c.includes("нидерланды") || c.includes("голландия")) return "Dutch";
  if (c.includes("sweden") || c.includes("stockholm") || c.includes("швеция")) return "Swedish";
  if (c.includes("norway") || c.includes("oslo") || c.includes("норвегия")) return "Norwegian";
  if (c.includes("denmark") || c.includes("copenhagen") || c.includes("дания")) return "Danish";
  if (c.includes("finland") || c.includes("helsinki") || c.includes("финляндия")) return "Finnish";
  if (c.includes("greece") || c.includes("athens") || c.includes("греция")) return "Greek";
  if (c.includes("czech") || c.includes("prague") || c.includes("чехия")) return "Czech";
  if (c.includes("hungary") || c.includes("budapest") || c.includes("венгрия")) return "Hungarian";
  if (c.includes("romania") || c.includes("bucharest") || c.includes("румыния")) return "Romanian";

  return "Local";
}

function normalizeDomain(url: string): string {
  try {
    let cleanUrl = url.toLowerCase().trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
    const urlObj = new URL(cleanUrl);
    let hostname = urlObj.hostname;
    if (hostname.startsWith('www.')) hostname = hostname.substring(4);
    return hostname;
  } catch (e) {
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

function cleanQuotes(text: string): string {
  return text ? text.replace(/^"|"$/g, '').trim() : "";
}

function truncateDescription(text: string): string {
  if (!text) return "";
  let cleaned = cleanQuotes(text);
  if (cleaned.length <= 85) return cleaned;
  
  // We need room for the ellipsis or period, so we cut at 84
  let truncated = cleaned.substring(0, 84);
  const lastSpace = truncated.lastIndexOf(" ");
  
  // Try to cut at the last word boundary if it's reasonable
  if (lastSpace > 60) {
      truncated = truncated.substring(0, lastSpace);
  }
  
  // Clean up trailing punctuation and add a period
  return truncated.replace(/[.,!?;:\s]+$/, "") + ".";
}

function deduplicatePairs(nativeArr: string[], russianArr: string[]) {
  const seen = new Set<string>();
  const newNative: string[] = [];
  const newRussian: string[] = [];

  for (let i = 0; i < nativeArr.length; i++) {
    const nat = nativeArr[i]?.trim();
    const rus = russianArr[i]?.trim();
    if (nat && !seen.has(nat.toLowerCase())) {
      seen.add(nat.toLowerCase());
      newNative.push(nat);
      newRussian.push(rus || "");
    }
  }
  return { native: newNative, russian: newRussian };
}

async function generateAdsFromSiteContent(
    siteName: string, 
    url: string, 
    textContent: string, 
    instructionLanguage: string, 
    isCis: boolean,
    category?: string
): Promise<any> {
    
    let contextStr = "";
    if (!textContent || textContent.length < 50) {
        contextStr = `CONTEXT: The website name is "${siteName}". The service category is "${category || 'General Service'}". Generate ads based on this business type.`;
    } else {
        // textContent is already extracted text
        contextStr = `CONTENT PREVIEW:\n${textContent.slice(0, 4000)}...`;
    }

    const prompt = `
      TASK: You are a Senior SEO & Marketing Specialist.
      Analyze the website content for "${siteName}" (${url}).
      
      ${contextStr}

      OBJECTIVE:
      Identify the CORE BUSINESS SERVICES and Unique Selling Points.
      Generate strictly relevant Google Ads Headlines and Descriptions.

      STRICT RULES:
      1. IGNORE Generic Web Terms: Do NOT use "Home", "Contact", "Login", "Privacy", "Imprint", "Internet", "Mobile", "Sitemap".
      2. IGNORE Peripheral Content: Do NOT use terms related to the website's clients or partners (e.g., if a GIS company lists a "Driving School" as a client, do NOT use "Driving School" as a keyword).
      3. FOCUS: Only include services the company OFFERS.
      4. Native Language: ${instructionLanguage}
      5. If CIS (${isCis}): Native output must be Russian.
      6. LENGTH LIMITS (CRITICAL):
         - Headlines MUST be 30 characters or less.
         - Descriptions MUST be 85 characters or less.
      
      OUTPUT REQUIREMENTS:
      - 15 Google Ads Headlines (Max 30 chars).
      - 4 Google Ads Descriptions (Max 85 chars).
      
      Return the result as a JSON object:
      {
        "promo": {
           "native": { "headlines": ["..."], "descriptions": ["..."] },
           "russian": { "headlines": ["Translated..."], "descriptions": ["Translated..."] },
           "language": "Detected Language"
        }
      }
    `;

    const text = await callGroq([{ role: "user", content: prompt }], undefined, 0.4, true);
    
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse Ad Generation JSON:", e, "Raw text:", text);
        throw new Error("Failed to parse Ad Generation JSON");
    }
}

// Strict check to see if a domain resolves and is accessible
async function verifySiteFast(url: string): Promise<boolean> {
    const secureUrl = url.replace(/^http:\/\//i, 'https://');
    
    // 1. Try a direct HEAD request first (fastest, but might fail due to CORS)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // Reduced to 1s
        const res = await fetch(secureUrl, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        // If it doesn't throw, the server exists and responded (even if opaque)
        return true; 
    } catch (e) {
        // Direct fetch failed (CORS, network error, or dead site), fallback to proxies
    }

    // 2. We use multiple proxies to avoid rate limits and ensure the site is actually reachable
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(secureUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(secureUrl)}`
    ];

    // Check proxies in parallel and return IMMEDIATELY when the first one succeeds
    return new Promise((resolve) => {
        let failedCount = 0;
        
        const checkProxy = async (proxyUrl: string) => {
            try {
                const proxyController = new AbortController();
                const proxyTimeout = setTimeout(() => proxyController.abort(), 1500); // Super fast 1.5s timeout
                const res = await fetch(proxyUrl, { signal: proxyController.signal });
                clearTimeout(proxyTimeout);
                
                if (res.ok) {
                    resolve(true); // Resolve immediately on first success
                    return;
                }
            } catch (e) {
                // Ignore individual proxy failures
            }
            
            failedCount++;
            if (failedCount === proxies.length) {
                resolve(false); // All proxies failed
            }
        };

        proxies.forEach(checkProxy);
    });
}

export const findNewSites = async (
  existingUrls: string[], 
  targetCountry?: string, 
  targetService?: string, 
  targetCity?: string,
  onProgress?: (status: string, progress: number) => void,
  onSiteFound?: (site: ServiceSite) => void
): Promise<ServiceSite[]> => {
  let countryToUse = targetCountry;
  if (!countryToUse?.trim() && !targetCity?.trim()) {
      countryToUse = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  }
  return await attemptToFindSites(existingUrls, countryToUse || "", targetService, targetCity, onProgress, onSiteFound);
};

async function attemptToFindSites(
  existingUrls: string[], 
  targetCountry: string, 
  targetService: string | undefined, 
  targetCity: string | undefined,
  onProgress?: (status: string, progress: number) => void,
  onSiteFound?: (site: ServiceSite) => void
): Promise<ServiceSite[]> {
  const currentExcludedDomains = new Set(existingUrls.map(u => normalizeDomain(u)));
  
  let locationPrompt = targetCountry;
  let forcedNativeLanguage = "English";

  if (targetCountry?.trim()) {
    forcedNativeLanguage = determineTargetLanguage(targetCountry);
    locationPrompt = targetCity?.trim() ? `${targetCity}, ${targetCountry}` : targetCountry;
  } else if (targetCity?.trim()) {
    forcedNativeLanguage = determineTargetLanguage(targetCity);
    locationPrompt = targetCity;
  }

  let instructionLanguage = forcedNativeLanguage === "Local" ? `The Official Primary Language of ${locationPrompt}` : forcedNativeLanguage;
  const isCis = instructionLanguage === "Russian" || forcedNativeLanguage === "Russian";
  const accumulatedSites: ServiceSite[] = [];

  if (onProgress) onProgress(`Searching Google & Maps via Serper...`, 30);

  let searchInstruction = "";
  let defaultCategoryLabel = "";
  let strictServiceRule = "";

  if (targetService?.trim()) {
      searchInstruction = `"${targetService.trim()}"`;
      defaultCategoryLabel = targetService.trim();
      strictServiceRule = `CRITICAL: YOU MUST ONLY RETURN BUSINESSES THAT PROVIDE "${targetService.trim()}" SERVICES. 
      CRITICAL: DO NOT RETURN ANY SHOPS, E-COMMERCE SITES, OR PLACES THAT SELL PRODUCTS. ONLY SERVICE PROVIDERS.`;
  } else {
      const randomMix = shuffleArray(TARGET_CATEGORIES).slice(0, 6).join(", ");
      searchInstruction = `a diverse mix of services including ${randomMix}`;
      defaultCategoryLabel = "General Service";
      strictServiceRule = `CRITICAL: The list must be DIVERSE. Do not focus on just one industry.
      CRITICAL: DO NOT RETURN ANY SHOPS, E-COMMERCE SITES, OR PLACES THAT SELL PRODUCTS. ONLY SERVICE PROVIDERS.`;
  }

  const searchContext = await searchGoogleAndMaps(searchInstruction, locationPrompt);

  if (onProgress) onProgress(`Analyzing results with Groq (Llama 3)...`, 45);

  const prompt = `
    TASK: You are an expert data extractor. I have performed a Google Search and Google Maps search for ${searchInstruction} in "${locationPrompt}".
    Here are the raw search results:
    
    ${searchContext}
    
    ${strictServiceRule}
    CRITICAL: ONLY RETURN REAL, EXISTING WEBSITES from the search results above.
    CRITICAL: ABSOLUTELY NO E-COMMERCE, NO ONLINE STORES, NO RETAIL SHOPS. ONLY SERVICE-BASED BUSINESSES.
    CRITICAL: The URL must point to the official website of the business, NOT a directory profile (like Yelp, YellowPages, Facebook, Instagram).
    EXCLUDE: DIRECTORIES, AGGREGATORS, SOCIAL MEDIA, PARKING PAGES, ${EXCLUDED_CATEGORIES.join(", ").toUpperCase()}.
    
    Return the result as a JSON object with a "sites" array containing the valid businesses:
    {
      "sites": [
        { 
          "siteName": "Name", 
          "url": "https://...", 
          "city": { "en": "City", "ru": "City", "uk": "City" }, 
          "country": { "en": "Country", "ru": "Country", "uk": "Country" },
          "category": { "en": "Category", "ru": "Category", "uk": "Category" }
        }
      ]
    }
  `;

  try {
    const text = await callGroq([{ role: "user", content: prompt }], undefined, 0.1, true);

    let data: any[] = [];
    try {
        const parsed = JSON.parse(text);
        data = parsed.sites || [];
    } catch (e) {
        throw new Error("Malformed JSON received from Groq.");
    }

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Groq returned an empty list.");
    }

    if (onProgress) onProgress("Validating Found Sites...", 60);

    const seenUrlsInBatch = new Set<string>();
    const potentialSites = data.filter((c: any) => {
        if (!c.url || !c.siteName) return false;
        let url = c.url;
        if (!url.startsWith('http')) url = 'https://' + url;
        
        const domain = normalizeDomain(url);
        
        // Filter out obvious social media and directories that the LLM might have missed
        const badDomains = ['facebook.com', 'instagram.com', 'yelp.', 'yellowpages.', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'tripadvisor.', 'foursquare.'];
        if (badDomains.some(bad => domain.includes(bad))) return false;

        if (currentExcludedDomains.has(domain) || seenUrlsInBatch.has(domain)) return false;
        
        seenUrlsInBatch.add(domain);
        currentExcludedDomains.add(domain);
        return true;
    });

    if (potentialSites.length > 0) {
      if (onProgress) onProgress("Checking Site Availability...", 80);
      
      const batchSize = 15;
      
      for (let i = 0; i < potentialSites.length; i += batchSize) {
          const batch = potentialSites.slice(i, i + batchSize);
          
          const checks = batch.map(async (candidate: any) => {
              let url = candidate.url;
              if (!url.startsWith('http')) url = 'https://' + url;
              
              const isAlive = await verifySiteFast(url);
              if (isAlive) {
                  const validSite: ServiceSite = {
                      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2),
                      url: url,
                      siteName: candidate.siteName,
                      country: {
                          en: candidate.country?.en || targetCountry,
                          ru: candidate.country?.ru || targetCountry,
                          uk: candidate.country?.uk || targetCountry
                      },
                      city: {
                          en: candidate.city?.en || targetCity || "",
                          ru: candidate.city?.ru || targetCity || "",
                          uk: candidate.city?.uk || targetCity || ""
                      },
                      serviceCategory: {
                          en: candidate.category?.en || defaultCategoryLabel,
                          ru: candidate.category?.ru || defaultCategoryLabel,
                          uk: candidate.category?.uk || defaultCategoryLabel
                      },
                      language: forcedNativeLanguage,
                      isNew: true,
                      privacyPolicyFound: true,
                      nativePromo: { headlines: [], descriptions: [] },
                      russianPromo: { headlines: [], descriptions: [] },
                      timestamp: Date.now(),
                      htmlContent: "",
                      isPromoGenerated: false
                   };
                  
                  if (onSiteFound) {
                      onSiteFound(validSite);
                  }
                  return validSite;
              }
              return null;
          });

          const results = await Promise.all(checks);
          const aliveSites = results.filter((r): r is ServiceSite => r !== null);
          
          accumulatedSites.push(...aliveSites);
          
          if (accumulatedSites.length >= 5) {
              break; 
          }
      }
    }
  } catch (error: any) {
    console.error("Groq/Serper Search Error:", error);
    
    // Check if it's a rate limit error (429)
    if (error.message?.includes("429")) {
        throw new Error("Превышен лимит запросов к API. Пожалуйста, подождите и попробуйте снова.");
    }
    
    throw new Error(error.message || "Unknown search error");
  }

  if (accumulatedSites.length > 0) {
      if (onProgress) onProgress("Done!", 100);
      return accumulatedSites.slice(0, 5);
  }

  throw new Error(`No valid sites found in this request. Please try again.`);
}

export const generatePromoForSite = async (site: ServiceSite): Promise<Partial<ServiceSite>> => {
    const countryStr = typeof site.country === 'string' ? site.country : (site.country?.en || site.country?.ru || "");
    const cityStr = typeof site.city === 'string' ? site.city : (site.city?.en || site.city?.ru || "");

    let locationPrompt = countryStr;
    let forcedNativeLanguage = "English";

    if (countryStr?.trim()) {
        forcedNativeLanguage = determineTargetLanguage(countryStr);
        locationPrompt = cityStr?.trim() ? `${cityStr}, ${countryStr}` : countryStr;
    } else if (cityStr?.trim()) {
        forcedNativeLanguage = determineTargetLanguage(cityStr);
        locationPrompt = cityStr || "";
    }

    let instructionLanguage = forcedNativeLanguage === "Local" ? `The Official Primary Language of ${locationPrompt}` : forcedNativeLanguage;
    const isCis = instructionLanguage === "Russian" || forcedNativeLanguage === "Russian";

    const adData = await generateAdsFromSiteContent(
        site.siteName, 
        site.url, 
        site.htmlContent || "", 
        instructionLanguage, 
        isCis,
        site.serviceCategory.en
    );

    let nativePromo = adData.promo?.native || { headlines: [], descriptions: [] };
    let russianPromo = adData.promo?.russian || { headlines: [], descriptions: [] };

    // Filtering Logic
    const validIndices: number[] = [];
    const len = Math.min(nativePromo.headlines?.length || 0, russianPromo.headlines?.length || 0);
    
    for (let i = 0; i < len; i++) {
        if (nativePromo.headlines[i]?.length <= 30 && russianPromo.headlines[i]?.length <= 30) {
            validIndices.push(i);
        }
    }
    
    nativePromo.headlines = validIndices.map((i: number) => nativePromo.headlines[i]);
    russianPromo.headlines = validIndices.map((i: number) => russianPromo.headlines[i]);

    const dedupKw = deduplicatePairs(nativePromo.headlines, russianPromo.headlines);
    nativePromo.headlines = dedupKw.native;
    russianPromo.headlines = dedupKw.russian;
    
    const dedupDesc = deduplicatePairs(nativePromo.descriptions, russianPromo.descriptions);
    nativePromo.descriptions = dedupDesc.native;
    // FIX: Ensure Russian descriptions are populated. If empty or missing, fallback to Native.
    russianPromo.descriptions = dedupDesc.russian.map((desc: string, i: number) => 
        (desc && desc.trim().length > 0) ? desc : nativePromo.descriptions[i]
    );

    // Padding
    const localizedPadding = PADDING_LOCALIZED[instructionLanguage] || PADDING_HEADLINES_EN;
    while (nativePromo.headlines.length < 15) {
        const fillIdx = nativePromo.headlines.length % localizedPadding.length;
        nativePromo.headlines.push(localizedPadding[fillIdx]);
        russianPromo.headlines.push(PADDING_HEADLINES_RU[fillIdx]);
    }

    // Truncate
    nativePromo.headlines = nativePromo.headlines.slice(0, 15);
    russianPromo.headlines = russianPromo.headlines.slice(0, 15);
    nativePromo.descriptions = nativePromo.descriptions.slice(0, 4).map(truncateDescription);
    russianPromo.descriptions = russianPromo.descriptions.slice(0, 4).map(truncateDescription);

    return {
        nativePromo,
        russianPromo,
        language: (!adData.promo?.language || adData.promo.language.includes("Official")) ? forcedNativeLanguage : adData.promo.language,
        isPromoGenerated: true
    };
};

// --- Groq Integration ---

export const generateText = async (prompt: string): Promise<string> => {
  try {
    return await callGroq([{ role: "user", content: prompt }], undefined, 0.7);
  } catch (error) {
    console.error("Groq Text Generation Error:", error);
    throw error;
  }
};

export const analyzeImage = async (base64Image: string, prompt?: string): Promise<string> => {
  try {
    // base64Image is expected to be a data URL, e.g., "data:image/png;base64,..."
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt || "Describe this image." },
          { type: "image_url", image_url: { url: base64Image } }
        ]
      }
    ];
    return await callGroq(messages, "llama-3.2-11b-vision-preview", 0.7);
  } catch (error) {
    console.error("Groq Image Analysis Error:", error);
    throw error;
  }
};
