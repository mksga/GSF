
// services/geminiService.ts
import { ServiceSite, LocalizedText } from "../types";
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
  // Split by comma or newline to handle different formatting in GitHub Secrets
  const keys = keysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length === 0) return "";
  
  let idx = 0;
  if (typeof window !== 'undefined' && window.localStorage) {
    idx = parseInt(localStorage.getItem('groq_key_idx') || '0', 10);
    if (isNaN(idx)) idx = 0;
    localStorage.setItem('groq_key_idx', (idx + 1).toString());
  } else {
    idx = Math.floor(Math.random() * keys.length);
  }
  return keys[idx % keys.length];
};

// Helper to get Serper API key
const getSerperApiKey = (): string => {
  let keysStr = "";
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    keysStr = import.meta.env.VITE_SERPER_API_KEY || "";
  } else if (typeof process !== 'undefined' && process.env) {
    keysStr = process.env.SERPER_API_KEY || "";
  }
  
  if (!keysStr) return "";
  // Split by comma or newline to handle different formatting in GitHub Secrets
  const keys = keysStr.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length === 0) return "";
  
  let idx = 0;
  if (typeof window !== 'undefined' && window.localStorage) {
    idx = parseInt(localStorage.getItem('serper_key_idx') || '0', 10);
    if (isNaN(idx)) idx = 0;
    localStorage.setItem('serper_key_idx', (idx + 1).toString());
  } else {
    idx = Math.floor(Math.random() * keys.length);
  }
  return keys[idx % keys.length];
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_TEXT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct"
];

const getNextModel = (): string => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return GROQ_TEXT_MODELS[Math.floor(Math.random() * GROQ_TEXT_MODELS.length)];
  }
  
  let idx = parseInt(localStorage.getItem('groq_model_idx') || '0', 10);
  if (isNaN(idx)) idx = 0;
  
  const model = GROQ_TEXT_MODELS[idx % GROQ_TEXT_MODELS.length];
  localStorage.setItem('groq_model_idx', (idx + 1).toString());
  
  return model;
};

async function callGroqStream(messages: any[], model?: string, temperature = 0.4, onChunk?: (text: string) => void): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("API key is missing. Please set VITE_GROQ_API_KEY.");

  const selectedModel = (model && !model.includes("llama3-70b-8192")) 
    ? model 
    : getNextModel();

  console.log(`Using Groq Model: ${selectedModel}`);

  const body: any = {
    model: selectedModel,
    messages,
    temperature,
    stream: true
  };

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429) throw new Error("429 Rate Limit");
    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
  }

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    
    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const data = JSON.parse(line.slice(6));
          const content = data.choices[0]?.delta?.content || "";
          fullText += content;
          if (onChunk && content) {
            onChunk(fullText);
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }

  return fullText;
}

async function callGroq(messages: any[], model?: string, temperature = 0.4, jsonMode = false) {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("API key is missing. Please set VITE_GROQ_API_KEY.");

  // If no model is specified, or if the old decommissioned model is passed, pick the next active model
  const selectedModel = (model && !model.includes("llama3-70b-8192")) 
    ? model 
    : getNextModel();

  console.log(`Using Groq Model (Non-Stream): ${selectedModel}`);

  const body: any = {
    model: selectedModel,
    messages,
    temperature
  };
  
  // We remove response_format: { type: "json_object" } because some models 
  // (like qwen and gpt-oss) fail with json_validate_failed.
  // Our code already uses regex to extract JSON from the text output.

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

  const countryCode = getCountryCode(location);
  const glParam = countryCode ? { gl: countryCode } : {};

  const [searchRes, placesRes] = await Promise.all([
    fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${query} in ${location}`, num: 20, ...glParam })
    }).then(res => res.json()).catch(() => ({ organic: [] })),
    fetch("https://google.serper.dev/places", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${query} in ${location}`, ...glParam })
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

const ALL_CCTLDS = new Set([
  "ru", "su", "рф", "ua", "by", "бел", "kz", "қаз", "pl", "de", "fr", "it", "es", "uk", "us", "ca", "au", "nl", "se", "no", "dk", "fi", "cz", "hu", "ro", "tr", "br", "mx", "ar", "lv", "lt", "ee", "ch", "at", "be", "ie", "nz", "pt", "gr", "bg", "hr", "sk", "si", "cy", "mt", "in", "cn", "jp", "kr", "vn", "th", "id", "my", "ph", "sg", "ae", "sa", "eg", "za", "ng", "ke", "il", "ge", "am", "az", "uz", "kg", "md", "tj", "tm"
]);

function getCountryCode(country: string): string {
  const c = country.toLowerCase().trim();
  if (c.includes("uk") || c.includes("united kingdom") || c.includes("великобритания") || c.includes("англия") || c.includes("london")) return "gb";
  if (c.includes("usa") || c.includes("сша") || c.includes("new york")) return "us";
  if (c.includes("canada") || c.includes("канада")) return "ca";
  if (c.includes("australia") || c.includes("австралия")) return "au";
  if (c.includes("germany") || c.includes("германия") || c.includes("berlin")) return "de";
  if (c.includes("france") || c.includes("франция") || c.includes("paris")) return "fr";
  if (c.includes("italy") || c.includes("италия") || c.includes("rome")) return "it";
  if (c.includes("spain") || c.includes("испания") || c.includes("madrid")) return "es";
  if (c.includes("poland") || c.includes("польша") || c.includes("warsaw")) return "pl";
  if (c.includes("russia") || c.includes("россия") || c.includes("moscow")) return "ru";
  if (c.includes("ukraine") || c.includes("украина") || c.includes("kyiv") || c.includes("kiev")) return "ua";
  if (c.includes("belarus") || c.includes("беларусь") || c.includes("minsk")) return "by";
  if (c.includes("kazakhstan") || c.includes("казахстан")) return "kz";
  if (c.includes("netherlands") || c.includes("нидерланды") || c.includes("amsterdam")) return "nl";
  if (c.includes("sweden") || c.includes("швеция")) return "se";
  if (c.includes("norway") || c.includes("норвегия")) return "no";
  if (c.includes("denmark") || c.includes("дания")) return "dk";
  if (c.includes("finland") || c.includes("финляндия")) return "fi";
  if (c.includes("czech") || c.includes("чехия")) return "cz";
  if (c.includes("hungary") || c.includes("венгрия")) return "hu";
  if (c.includes("romania") || c.includes("румыния")) return "ro";
  if (c.includes("turkey") || c.includes("турция")) return "tr";
  if (c.includes("brazil") || c.includes("бразилия")) return "br";
  if (c.includes("mexico") || c.includes("мексика")) return "mx";
  if (c.includes("argentina") || c.includes("аргентина")) return "ar";
  if (c.includes("latvia") || c.includes("латвия")) return "lv";
  if (c.includes("lithuania") || c.includes("литва")) return "lt";
  if (c.includes("estonia") || c.includes("эстония")) return "ee";
  if (c.includes("switzerland") || c.includes("швейцария")) return "ch";
  if (c.includes("austria") || c.includes("австрия")) return "at";
  if (c.includes("belgium") || c.includes("бельгия")) return "be";
  if (c.includes("ireland") || c.includes("ирландия")) return "ie";
  if (c.includes("new zealand") || c.includes("новая зеландия")) return "nz";
  if (c.includes("portugal") || c.includes("португалия")) return "pt";
  if (c.includes("greece") || c.includes("греция")) return "gr";
  if (c.includes("bulgaria") || c.includes("болгария")) return "bg";
  if (c.includes("croatia") || c.includes("хорватия")) return "hr";
  if (c.includes("slovakia") || c.includes("словакия")) return "sk";
  if (c.includes("slovenia") || c.includes("словения")) return "si";
  if (c.includes("cyprus") || c.includes("кипр")) return "cy";
  if (c.includes("malta") || c.includes("мальта")) return "mt";
  if (c.includes("india") || c.includes("индия")) return "in";
  if (c.includes("china") || c.includes("китай")) return "cn";
  if (c.includes("japan") || c.includes("япония")) return "jp";
  if (c.includes("south korea") || c.includes("южная корея")) return "kr";
  if (c.includes("vietnam") || c.includes("вьетнам")) return "vn";
  if (c.includes("thailand") || c.includes("таиланд")) return "th";
  if (c.includes("indonesia") || c.includes("индонезия")) return "id";
  if (c.includes("malaysia") || c.includes("малайзия")) return "my";
  if (c.includes("philippines") || c.includes("филиппины")) return "ph";
  if (c.includes("singapore") || c.includes("сингапур")) return "sg";
  if (c.includes("uae") || c.includes("оаэ")) return "ae";
  if (c.includes("saudi arabia") || c.includes("саудовская аравия")) return "sa";
  if (c.includes("egypt") || c.includes("египет")) return "eg";
  if (c.includes("south africa") || c.includes("юар")) return "za";
  if (c.includes("nigeria") || c.includes("нигерия")) return "ng";
  if (c.includes("kenya") || c.includes("кения")) return "ke";
  if (c.includes("israel") || c.includes("израиль")) return "il";
  if (c.includes("georgia") || c.includes("грузия")) return "ge";
  if (c.includes("armenia") || c.includes("армения")) return "am";
  if (c.includes("azerbaijan") || c.includes("азербайджан")) return "az";
  if (c.includes("uzbekistan") || c.includes("узбекистан")) return "uz";
  if (c.includes("kyrgyzstan") || c.includes("кыргызстан")) return "kg";
  if (c.includes("moldova") || c.includes("молдова")) return "md";
  if (c.includes("tajikistan") || c.includes("таджикистан")) return "tj";
  if (c.includes("turkmenistan") || c.includes("туркменистан")) return "tm";
  return "";
}

function isUrlAllowedForCountry(url: string, country: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    if (parts.length < 2) return true;
    
    const tld = parts[parts.length - 1].toLowerCase();
    const sld = parts.length > 2 ? parts[parts.length - 2].toLowerCase() : "";
    
    // Check if it's a ccTLD
    if (ALL_CCTLDS.has(tld) || (tld === "uk" && sld === "co") || (tld === "ua" && sld === "com")) {
      const countryCode = getCountryCode(country);
      
      // If we don't know the country code, we can't strictly filter, so allow it
      if (!countryCode) return true;
      
      // Map country codes to allowed TLDs
      const allowedTlds: Record<string, string[]> = {
        "gb": ["uk", "co.uk", "org.uk"],
        "us": ["us"],
        "ca": ["ca"],
        "au": ["au", "com.au"],
        "de": ["de"],
        "fr": ["fr"],
        "it": ["it"],
        "es": ["es"],
        "pl": ["pl", "com.pl"],
        "ru": ["ru", "su", "рф"],
        "ua": ["ua", "com.ua", "in.ua", "org.ua"],
        "by": ["by", "бел"],
        "kz": ["kz", "қаз"],
        "nl": ["nl"],
        "se": ["se"],
        "no": ["no"],
        "dk": ["dk"],
        "fi": ["fi"],
        "cz": ["cz"],
        "hu": ["hu"],
        "ro": ["ro"],
        "tr": ["tr", "com.tr"],
        "br": ["br", "com.br"],
        "mx": ["mx", "com.mx"],
        "ar": ["ar", "com.ar"],
        "lv": ["lv"],
        "lt": ["lt"],
        "ee": ["ee"],
        "ch": ["ch"],
        "at": ["at"],
        "be": ["be"],
        "ie": ["ie"],
        "nz": ["nz", "co.nz"],
        "pt": ["pt"],
        "gr": ["gr"],
        "bg": ["bg"],
        "hr": ["hr"],
        "sk": ["sk"],
        "si": ["si"],
        "cy": ["cy"],
        "mt": ["mt"],
        "in": ["in", "co.in"],
        "cn": ["cn", "com.cn"],
        "jp": ["jp", "co.jp"],
        "kr": ["kr", "co.kr"],
        "vn": ["vn", "com.vn"],
        "th": ["th", "co.th"],
        "id": ["id", "co.id"],
        "my": ["my", "com.my"],
        "ph": ["ph", "com.ph"],
        "sg": ["sg", "com.sg"],
        "ae": ["ae"],
        "sa": ["sa", "com.sa"],
        "eg": ["eg", "com.eg"],
        "za": ["za", "co.za"],
        "ng": ["ng", "com.ng"],
        "ke": ["ke", "co.ke"],
        "il": ["il", "co.il"],
        "ge": ["ge"],
        "am": ["am"],
        "az": ["az"],
        "uz": ["uz"],
        "kg": ["kg"],
        "md": ["md"],
        "tj": ["tj"],
        "tm": ["tm"]
      };
      
      const allowed = allowedTlds[countryCode] || [];
      
      // If the TLD is in our ALL_CCTLDS list, but NOT in the allowed list for this country, reject it.
      if (ALL_CCTLDS.has(tld)) {
         if (!allowed.includes(tld)) {
             return false;
         }
      }
    }
    
    return true; // Generic TLDs (.com, .org, .net, etc.) are always allowed
  } catch (e) {
    return true;
  }
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

    let lastError: any = null;
    const maxAttempts = 8; // Try multiple models (GROQ_TEXT_MODELS.length * 2)
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        try {
            const text = await callGroq([{ role: "user", content: prompt }], undefined, 0.4, false);
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(text);
        } catch (e) {
            console.error(`Ad Generation attempt ${attempts + 1} failed:`, e);
            lastError = e;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.error(`Failed to parse Ad Generation JSON after ${maxAttempts} attempts:`, lastError);
    throw new Error("Failed to generate promo content after trying multiple models.");
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

async function translateServiceQuery(query: string, targetLanguage: string): Promise<string> {
  const prompt = `
    Translate the service search term "${query}" into ${targetLanguage}.
    If it is already in ${targetLanguage}, just return it as is.
    Return ONLY the translated term. Do not add quotes or extra text.
    Example: "Cleaning" -> "Sprzątanie"
  `;
  // Use a fast model for translation
  try {
    const result = await callGroq([{ role: "user", content: prompt }], "llama-3.1-8b-instant", 0.1, false);
    return result.trim().replace(/^"|"$/g, '');
  } catch (e) {
    return query;
  }
}

async function translateMetadata(country: string, city: string, service: string): Promise<{
    country: LocalizedText,
    city: LocalizedText,
    service: LocalizedText
}> {
    const prompt = `
    You are a professional translator. Translate the following location and service terms into English (en), Russian (ru), and Ukrainian (uk).
    
    Input:
    Country: "${country}"
    City: "${city}"
    Service: "${service}"
    
    IMPORTANT:
    1. Provide accurate translations.
    2. If a field is empty, return empty strings for all languages for that field.
    3. Return ONLY valid JSON. No markdown formatting, no code blocks, no explanations.
    
    JSON Structure:
    {
      "country": { "en": "...", "ru": "...", "uk": "..." },
      "city": { "en": "...", "ru": "...", "uk": "..." },
      "service": { "en": "...", "ru": "...", "uk": "..." }
    }
    `;
    
    try {
        // Use a more capable model for better JSON adherence and translation quality
        const text = await callGroq([{ role: "user", content: prompt }], "llama-3.3-70b-versatile", 0.1, false);
        
        // Clean up text (remove markdown code blocks if present)
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanText);
        
        return {
            country: data.country || { en: country, ru: country, uk: country },
            city: data.city || { en: city, ru: city, uk: city },
            service: data.service || { en: service, ru: service, uk: service }
        };
    } catch (e) {
        console.error("Translation Metadata Failed:", e);
        // Fallback: use original string for all
        const fallback = (s: string) => ({ en: s, ru: s, uk: s });
        return {
            country: fallback(country),
            city: fallback(city),
            service: fallback(service)
        };
    }
}

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

  if (onProgress) onProgress(`Preparing search...`, 10);

  let searchInstruction = "";
  let defaultCategoryLabel = "";
  let strictServiceRule = "";

  let serviceToSearch = targetService?.trim();
  if (!serviceToSearch) {
      serviceToSearch = shuffleArray(TARGET_CATEGORIES)[0];
  }

  let serviceQuery = serviceToSearch;
  
  // Auto-translate logic: Always translate the query to the target language to ensure local results
  const targetLangForTranslation = forcedNativeLanguage === "Local" ? `the primary official language of ${locationPrompt}` : forcedNativeLanguage;
  if (onProgress) onProgress(`Translating "${serviceQuery}" to ${targetLangForTranslation}...`, 20);
  const translated = await translateServiceQuery(serviceQuery, targetLangForTranslation);
  if (translated && translated.length < 100) { // Sanity check
      serviceQuery = translated;
  }

  searchInstruction = `"${serviceQuery}"`;
  defaultCategoryLabel = serviceToSearch; // Keep original for UI fallback
  strictServiceRule = `CRITICAL: YOU MUST ONLY RETURN BUSINESSES THAT PROVIDE "${serviceQuery}" SERVICES. 
  CRITICAL: DO NOT RETURN ANY SHOPS, E-COMMERCE SITES, OR PLACES THAT SELL PRODUCTS. ONLY SERVICE PROVIDERS.
  CRITICAL: DO NOT RETURN MEDICAL SERVICES, LEGAL SERVICES, OR ELECTRONICS REPAIR.`;

  if (onProgress) onProgress(`Searching Google & Maps via Serper...`, 30);

  // Start translation in parallel with search to save time
  const translationPromise = translateMetadata(targetCountry, targetCity || "", defaultCategoryLabel);

  let attempts = 0;
  const maxAttempts = 3;
  
  while (accumulatedSites.length < 5 && attempts < maxAttempts) {
      attempts++;
      
      let currentInstruction = searchInstruction;
      
      // Vary the search query on subsequent attempts to find more results
      if (attempts === 2) {
          if (!currentInstruction.includes("services")) {
             currentInstruction = currentInstruction.replace(/"/g, '') + " services";
          } else {
             currentInstruction = currentInstruction.replace(/"/g, '') + " company";
          }
      } else if (attempts === 3) {
          currentInstruction = currentInstruction.replace(/"/g, '') + " professional";
      }
      
      if (onProgress) onProgress(`Searching Google & Maps (Attempt ${attempts}/${maxAttempts})...`, 30 + (attempts * 10));

      const searchContext = await searchGoogleAndMaps(currentInstruction, locationPrompt);

      if (onProgress) onProgress(`Analyzing results with Groq (Attempt ${attempts})...`, 45 + (attempts * 5));

      const prompt = `
    TASK: You are an expert data extractor. I have performed a Google Search and Google Maps search for ${currentInstruction} in "${locationPrompt}".
    Here are the raw search results:
    
    ${searchContext}
    
    ${strictServiceRule}
    CRITICAL: ONLY RETURN REAL, EXISTING WEBSITES from the search results above.
    CRITICAL: ABSOLUTELY NO E-COMMERCE, NO ONLINE STORES, NO RETAIL SHOPS. ONLY SERVICE-BASED BUSINESSES.
    CRITICAL: The URL must point to the official website of the business, NOT a directory profile (like Yelp, YellowPages, Facebook, Instagram).
    EXCLUDE: DIRECTORIES, AGGREGATORS, SOCIAL MEDIA, PARKING PAGES, ${EXCLUDED_CATEGORIES.join(", ").toUpperCase()}.
    
    Return the result as a JSON object with a "sites" array containing EXACTLY 5 valid businesses:
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
    let currentJsonString = "";
    let processedUrls = new Set<string>();
    let activeChecks = 0;
    
    // We will parse the stream to find URLs as soon as they appear
    const text = await callGroqStream([{ role: "user", content: prompt }], undefined, 0.1, async (partialText) => {
        // Look for URLs in the partial JSON
        // Improved regex to handle potential whitespace or simple escaping
        const urlMatches = [...partialText.matchAll(/"url"\s*:\s*"([^"]+)"/g)];
        
        for (const match of urlMatches) {
            let rawUrl = match[1].trim();
            // Basic cleanup of backslashes if LLM escaped them
            rawUrl = rawUrl.replace(/\\/g, '');
            
            let url = rawUrl;
            if (!url.startsWith('http')) {
                // If it looks like "domain.com", add https://
                // If it looks like "https:domain.com" (missing slashes), fix it
                if (url.match(/^(https?):/)) {
                     url = url.replace(/^(https?):/, '$1://');
                } else {
                     url = 'https://' + url;
                }
            }
            
            // Validate URL structure
            try {
                new URL(url);
            } catch (e) {
                continue; // Skip invalid URLs
            }

            const domain = normalizeDomain(url);
            
            if (!processedUrls.has(domain) && accumulatedSites.length < 5) {
                processedUrls.add(domain);
                
                // Filter out obvious bad domains and wrong country domains
                const badDomains = ['facebook.com', 'instagram.com', 'yelp.', 'yellowpages.', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'tripadvisor.', 'foursquare.'];
                if (badDomains.some(bad => domain.includes(bad)) || currentExcludedDomains.has(domain) || !isUrlAllowedForCountry(url, locationPrompt)) {
                    continue;
                }
                
                currentExcludedDomains.add(domain);
                activeChecks++;
                
                // Check site immediately without waiting for the rest of the JSON
                verifySiteFast(url).then(async (isAlive) => {
                    activeChecks--;
                    if (isAlive && accumulatedSites.length < 5) {
                        // Extract siteName if possible from the partial text
                        let siteName = domain;
                        // Fix: correctly associate siteName with the current URL by looking backwards from the URL match
                        if (match.index !== undefined) {
                            const textBefore = partialText.slice(0, match.index);
                            const nameMatches = [...textBefore.matchAll(/"siteName"\s*:\s*"([^"]+)"/g)];
                            if (nameMatches.length > 0) {
                                const lastName = nameMatches[nameMatches.length - 1];
                                // Ensure no closing brace between name and url to be safe (prevents grabbing name from previous object)
                                const textBetween = textBefore.slice(lastName.index! + lastName[0].length);
                                if (!textBetween.includes('}')) {
                                    siteName = lastName[1];
                                }
                            }
                        }

                        // Wait for translation if it's not ready yet (it usually is)
                        const localizedMetadata = await translationPromise;
                        
                        const validSite: ServiceSite = {
                            id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2),
                            url: url,
                            siteName: siteName,
                            country: localizedMetadata.country,
                            city: localizedMetadata.city,
                            serviceCategory: localizedMetadata.service,
                            language: forcedNativeLanguage,
                            isNew: true,
                            privacyPolicyFound: true,
                            nativePromo: { headlines: [], descriptions: [] },
                            russianPromo: { headlines: [], descriptions: [] },
                            timestamp: Date.now(),
                            htmlContent: "",
                            isPromoGenerated: false
                        };
                        
                        accumulatedSites.push(validSite);
                        if (onSiteFound) {
                            onSiteFound(validSite);
                        }
                    }
                });
            }
        }
    });

    // Wait for any pending active checks to finish for this attempt
    let waitTime = 0;
    while (activeChecks > 0 && accumulatedSites.length < 5 && waitTime < 3000) {
        await new Promise(r => setTimeout(r, 200));
        waitTime += 200;
    }
    
    if (accumulatedSites.length >= 5) {
        break;
    }

  } catch (error: any) {
    console.error(`Groq/Serper Search Error (Attempt ${attempts}):`, error);
    
    // Check if it's a rate limit error (429)
    if (error.message?.includes("429")) {
        throw new Error("Превышен лимит запросов к API. Пожалуйста, подождите и попробуйте снова.");
    }
  }
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
        typeof site.serviceCategory === 'string' ? site.serviceCategory : (site.serviceCategory?.en || "Service")
    );

    let nativePromo = adData.promo?.native || { headlines: [], descriptions: [] };
    let russianPromo = adData.promo?.russian || { headlines: [], descriptions: [] };

    nativePromo.headlines = nativePromo.headlines || [];
    nativePromo.descriptions = nativePromo.descriptions || [];
    russianPromo.headlines = russianPromo.headlines || [];
    russianPromo.descriptions = russianPromo.descriptions || [];

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

    // Padding for Headlines
    const localizedPadding = PADDING_LOCALIZED[instructionLanguage] || PADDING_HEADLINES_EN;
    while (nativePromo.headlines.length < 15) {
        const fillIdx = nativePromo.headlines.length % localizedPadding.length;
        nativePromo.headlines.push(localizedPadding[fillIdx]);
        russianPromo.headlines.push(PADDING_HEADLINES_RU[fillIdx]);
    }

    // Padding for Descriptions
    const PADDING_DESCRIPTIONS_EN = [
        "Contact us today for professional and reliable services.",
        "We offer top quality solutions tailored to your specific needs.",
        "Our experienced team is ready to help you achieve your goals.",
        "Discover the difference with our premium service offerings."
    ];
    const PADDING_DESCRIPTIONS_RU = [
        "Свяжитесь с нами сегодня для профессиональных и надежных услуг.",
        "Мы предлагаем высококачественные решения для ваших нужд.",
        "Наша опытная команда готова помочь вам в достижении целей.",
        "Почувствуйте разницу с нашими премиальными предложениями."
    ];
    
    while (nativePromo.descriptions.length < 4) {
        const fillIdx = nativePromo.descriptions.length % PADDING_DESCRIPTIONS_EN.length;
        // If the language is Russian, use Russian padding for native as well
        if (isCis) {
            nativePromo.descriptions.push(PADDING_DESCRIPTIONS_RU[fillIdx]);
        } else {
            nativePromo.descriptions.push(PADDING_DESCRIPTIONS_EN[fillIdx]);
        }
        russianPromo.descriptions.push(PADDING_DESCRIPTIONS_RU[fillIdx]);
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
