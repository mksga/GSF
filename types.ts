
export type Language = 'en' | 'ru' | 'uk';

export interface LocalizedText {
  en: string;
  ru: string;
  uk: string;
}

export interface AdCopy {
  headlines: string[];
  descriptions: string[];
}

export interface ServiceSite {
  id: string; // Unique ID for React keys
  url: string;
  siteName: string;
  country: LocalizedText;
  city?: LocalizedText; // Optional city field
  serviceCategory: LocalizedText; // Changed to LocalizedText to support UI switching
  privacyPolicyFound: boolean;
  privacyPolicyUrl?: string; // Optional URL to the policy
  nativePromo: AdCopy; // Renamed from nativeAds
  russianPromo: AdCopy; // Renamed from russianAds
  language: string; // The detected native language
  timestamp: number;
  htmlContent?: string; // Store HTML for later promo generation
  isPromoGenerated?: boolean; // Flag to check if promo was generated
  isNew?: boolean; // Flag to mark newly found sites
}

export interface SearchState {
  sites: ServiceSite[];
  isSearching: boolean;
  error: string | null;
  totalFound: number;
}

export interface SearchQuery {
  country: string;
  city: string;
  service: string;
  timestamp: number;
}

// Canvas & Toolbar Types
export type ToolType = 'select' | 'pen' | 'text' | 'eraser' | 'ai';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

export interface TextNode {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
}
