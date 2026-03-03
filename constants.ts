
// Intentionally excluded categories as per requirements
export const EXCLUDED_CATEGORIES = [
  // Medical & Health
  "Medical Services", "Doctors", "Hospitals", "Clinics", "Dentists", "Orthodontists",
  "Psychologists", "Therapists", "Pharmacies", "Health Centers", "Veterinarians",
  
  // Retail & E-commerce
  "Online Stores", "E-commerce", "Retail Shops", "Shopping Malls",
  "Clothing Stores", "Electronics Stores", "Grocery Stores", "Supermarkets",
  "Shops", "Stores", "Boutiques", "Marketplaces", "Webshops", "Retailers",
  
  // Legal & Financial (Strict)
  "Legal Services", "Lawyers", "Attorneys", "Law Firms", "Notaries", 
  "Solicitors", "Barristers", "Legal Consultants", "Banks", "Insurance",
  
  // Repair (Electronics/Small Tech)
  "Electronics Repair", "Phone Repair", "Computer Repair", "Laptop Repair",
  "Mobile Repair", "Tablet Repair", "Appliance Repair", "Console Repair",
  
  // Other
  "Gambling", "Betting", "Adult Services", "Religious Organizations", 
  "Political Organizations", "Government", "Schools (K-12)", "Universities"
];

// Allowed service categories to guide the AI
// Greatly expanded to ensure variety
export const TARGET_CATEGORIES = [
  // Home Services
  "Plumbing",
  "Landscaping & Gardening",
  "House Cleaning",
  "HVAC Services",
  "Roofing & Guttering",
  "Pest Control",
  "Pool Maintenance",
  "Locksmiths",
  "Moving Services",
  "Interior Design",
  "Flooring & Tiling",
  "Painting & Decorating",
  "Window Cleaning",
  "Solar Panel Installation",
  "Security System Installation",
  
  // Events & Hospitality
  "Event Planning",
  "Catering",
  "Wedding Photography",
  "DJ Services",
  "Florists (Service focus)",
  "Venue Rental",
  
  // Professional Services (Non-Legal/Non-Medical)
  "Architecture",
  "Marketing Agencies",
  "SEO Agencies",
  "Web Design Agencies",
  "Accounting & Bookkeeping",
  "HR Consulting",
  "Translation Services",
  "Graphic Design",
  "Video Production",
  "Real Estate Agencies",
  "Surveying",
  
  // Personal Services
  "Fitness Training",
  "Yoga Studios",
  "Pet Grooming",
  "Dog Walking",
  "Driving Schools",
  "Tutoring/Education",
  "Music Lessons",
  "Dry Cleaning & Laundry",
  "Tailoring & Alterations",
  "Beauty Salons (Hair/Nails)",
  "Barbershops",
  "Tattoo Studios",
  
  // Automotive & Transport (Non-Electronics)
  "Auto Detailing",
  "Car Rental",
  "Limo Services",
  "Towing Services",
  "Auto Body Shops (Bodywork)",
  "Tire Services",
  
  // Business & Industrial
  "Waste Management",
  "Commercial Printing",
  "Logistics & Freight",
  "Warehousing",
  "Office Cleaning",
  "Industrial Equipment Rental",
  "Signage Companies"
];

// Updated to include only CIS (СНГ), Europe, and Americas
export const COUNTRIES = [
  // North America
  "USA", "Canada", "Mexico",
  
  // South America
  "Brazil", "Argentina", "Chile", "Colombia", "Peru",
  
  // Europe
  "UK", "Germany", "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway", 
  "Poland", "Turkey", "Belgium", "Switzerland", "Austria", "Portugal", "Denmark", 
  "Finland", "Ireland", "Czech Republic", "Hungary", "Romania", "Greece",
  
  // CIS (Commonwealth of Independent States) & Neighbors
  "Russia", "Kazakhstan", "Belarus", "Uzbekistan", "Azerbaijan", "Armenia", 
  "Kyrgyzstan", "Moldova"
];
