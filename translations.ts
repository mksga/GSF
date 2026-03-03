
import { Language } from './types';

export const translations = {
  en: {
    appTitle: "Global Service Finder",
    found: "Found",
    countryPlaceholder: "Country (e.g. France)",
    cityPlaceholder: "City (e.g. Paris)",
    servicePlaceholder: "Service (e.g. Plumbing)",
    findSpecific: "Find Specific",
    findRandom: "Find Random",
    clearAll: "Clear All",
    readyTitle: "Ready to find services?",
    readyDesc: "Search for a specific country, city or service, or let AI pick randomly.",
    loading: "AI is searching Google Maps & checking privacy policies...",
    loadingSpecific: "Searching in",
    loadingRandom: "random country",
    errorMax: "Maximum limit of 100 sites reached. Please reset to start over.",
    errorGeneric: "Failed to find a valid site. Please try again.",
    
    // SiteCard
    policy: "Privacy Policy",
    delete: "Delete",
    block: "Block Site",
    tabNative: "Original",
    tabRussian: "Russian Translation",
    headlines: "Headlines",
    descriptions: "Description",
    siteLink: "Visit Website",
    copyUrl: "Copy Link",
    copyAll: "Copy all",
    copied: "Copied!",
    clickToCopy: "Click to copy",
    collapse: "Collapse",
    expand: "Expand",

    // Blacklist
    blacklistTitle: "Blacklist",
    blacklistDesc: "Sites blocked here will not appear in future searches.",
    emptyBlacklist: "Blacklist is empty.",
    restore: "Restore",
    close: "Close",
    openBlacklist: "Open Blacklist",
    
    // History (Sites)
    resetHistory: "Reset History",
    saved: "saved",
    resetConfirm: "This will delete your entire search history and allow finding the same sites again. Are you sure?",

    // Search History (Queries)
    searchHistoryTitle: "Search History",
    searchHistoryDesc: "Quickly reuse your previous search criteria.",
    emptySearchHistory: "No recent searches.",
    use: "Use",
    clearHistory: "Clear History",
    recentSearches: "Recent Searches:",
    generatePromo: "Generate Headlines & Descriptions",
    generatingPromo: "Generating..."
  },
  ru: {
    appTitle: "Поиск Услуг",
    found: "Найдено",
    countryPlaceholder: "Страна (напр. Франция)",
    cityPlaceholder: "Город (напр. Париж)",
    servicePlaceholder: "Услуга (напр. Сантехник)",
    findSpecific: "Найти (Точно)",
    findRandom: "Найти (Случайно)",
    clearAll: "Очистить все",
    readyTitle: "Готовы искать услуги?",
    readyDesc: "Ищите по конкретной стране, городу и услуге, или позвольте ИИ выбрать случайно.",
    loading: "ИИ ищет в Google Maps и проверяет политику конфиденциальности...",
    loadingSpecific: "Поиск в",
    loadingRandom: "случайной стране",
    errorMax: "Достигнут лимит в 100 сайтов. Пожалуйста, сбросьте список.",
    errorGeneric: "Не удалось найти подходящий сайт. Попробуйте еще раз.",

    // SiteCard
    policy: "Политика конфиденциальности",
    delete: "Удалить",
    block: "В черный список",
    tabNative: "Оригинал",
    tabRussian: "Перевод на русский",
    headlines: "Заголовки", 
    descriptions: "Описание", 
    siteLink: "На сайт",
    copyUrl: "Копировать ссылку",
    copyAll: "Скопировать все",
    copied: "Скопировано!",
    clickToCopy: "Нажмите для копирования",
    collapse: "Свернуть",
    expand: "Развернуть",

    // Blacklist
    blacklistTitle: "Черный список",
    blacklistDesc: "Сайты в этом списке больше не будут появляться в поиске.",
    emptyBlacklist: "Черный список пуст.",
    restore: "Вернуть",
    close: "Закрыть",
    openBlacklist: "Черный список",

    // History (Sites)
    resetHistory: "Сбросить историю",
    saved: "сохранено",
    resetConfirm: "Это удалит всю историю поиска и позволит находить одни и те же сайты снова. Вы уверены?",

    // Search History (Queries)
    searchHistoryTitle: "История запросов",
    searchHistoryDesc: "Быстро используйте предыдущие критерии поиска.",
    emptySearchHistory: "История запросов пуста.",
    use: "Использовать",
    clearHistory: "Очистить историю",
    recentSearches: "Недавние поиски:",
    generatePromo: "Сгенерировать заголовки и описания",
    generatingPromo: "Генерация..."
  },
  uk: {
    appTitle: "Пошук Послуг",
    found: "Знайдено",
    countryPlaceholder: "Країна (напр. Франція)",
    cityPlaceholder: "Місто (напр. Париж)",
    servicePlaceholder: "Послуга (напр. Сантехнік)",
    findSpecific: "Знайти (Точно)",
    findRandom: "Знайти (Випадково)",
    clearAll: "Очистити все",
    readyTitle: "Готові шукати послуги?",
    readyDesc: "Шукайте конкретну країну, місто та послугу, або дозвольте ШІ вибрати випадково.",
    loading: "ШІ шукає в Google Maps та перевіряє політику конфіденційност...",
    loadingSpecific: "Пошук у",
    loadingRandom: "випадковій країні",
    errorMax: "Досягнуто ліміт у 100 сайтів. Будь ласка, очистіть список.",
    errorGeneric: "Не вдалося знайти відповідний сайт. Спробуйте ще раз.",

    // SiteCard
    policy: "Політика конфіденційності",
    delete: "Видалити",
    block: "У чорний список",
    tabNative: "Оригінал",
    tabRussian: "Переклад російською",
    headlines: "Заголовки", 
    descriptions: "Опис",
    siteLink: "На сайт",
    copyUrl: "Копіювати посилання",
    copyAll: "Скопіювати все",
    copied: "Скопійовано!",
    clickToCopy: "Натисніть для копіювання",
    collapse: "Згорнути",
    expand: "Розгорнути",

    // Blacklist
    blacklistTitle: "Чорний список",
    blacklistDesc: "Сайти в цьому списку більше не з'являтимуться в пошуку.",
    emptyBlacklist: "Чорний список порожній.",
    restore: "Відновити",
    close: "Закрити",
    openBlacklist: "Чорний список",

    // History (Sites)
    resetHistory: "Скинути історію",
    saved: "збережено",
    resetConfirm: "Це видалить всю історію пошуку і дозволить знаходити одні й ті самі сайти знову. Ви впевнені?",

    // Search History (Queries)
    searchHistoryTitle: "Історія запитів",
    searchHistoryDesc: "Швидко використовуйте попередні критерії пошуку.",
    emptySearchHistory: "Історія запитів порожня.",
    use: "Використати",
    clearHistory: "Очистити історію",
    recentSearches: "Недавні пошуки:",
    generatePromo: "Згенерувати заголовки та описи",
    generatingPromo: "Генерація..."
  }
};
