export interface WateringHistory {
  date: string;
  waterLevel: number;
  weatherTemp: number;
  weatherCondition: string;
}

export interface PlantPreferences {
  minTemp: number;
  maxTemp: number;
  minHumidity: number;
  maxHumidity: number;
  sunlight: "full" | "partial" | "shade";
}

export interface Plant {
  id: string;
  name: string;
  description: string;
  wateringDays: number;
  position: string;
  icon: string;
  lastWatered: string;
  health: number;
  imageUrl?: string;
  category: "herbs" | "succulents" | "flowers" | "vegetables" | "indoor";
  preferences: PlantPreferences;
  wateringHistory: WateringHistory[];
  createdAt: string;
  totalWaterings: number;
}

export interface Weather {
  temp: number;
  condition: string;
  humidity: number;
  precipitation: number;
  location: string;
  icon: string;
}

export const PLANT_TEMPLATES: Omit<Plant, "id" | "lastWatered" | "health" | "wateringHistory" | "createdAt" | "totalWaterings">[] = [
  // Erbe aromatiche
  {
    name: "Basilico",
    description: "Annaffiare ogni 2 giorni. Ama il sole diretto e temperature calde.",
    wateringDays: 2,
    position: "Balcone soleggiato",
    icon: "🌿",
    imageUrl: "/plants/basil.jpg",
    category: "herbs",
    preferences: { minTemp: 18, maxTemp: 30, minHumidity: 40, maxHumidity: 70, sunlight: "full" }
  },
  {
    name: "Menta",
    description: "Annaffiare ogni 3 giorni. Ama l'umidità e mezz'ombra.",
    wateringDays: 3,
    position: "Balcone ombreggiato",
    icon: "🌱",
    imageUrl: "/plants/mint.jpg",
    category: "herbs",
    preferences: { minTemp: 15, maxTemp: 25, minHumidity: 50, maxHumidity: 80, sunlight: "partial" }
  },
  {
    name: "Rosmarino",
    description: "Annaffiare ogni 4 giorni. Resistente alla siccità, sole pieno.",
    wateringDays: 4,
    position: "Terrazzo soleggiato",
    icon: "🌿",
    imageUrl: "/plants/rosemary.jpg",
    category: "herbs",
    preferences: { minTemp: 10, maxTemp: 35, minHumidity: 30, maxHumidity: 60, sunlight: "full" }
  },
  {
    name: "Prezzemolo",
    description: "Annaffiare ogni 2 giorni. Ama il sole parziale e terreno umido.",
    wateringDays: 2,
    position: "Balcone con sole parziale",
    icon: "🌿",
    imageUrl: "/plants/parsley.jpg",
    category: "herbs",
    preferences: { minTemp: 15, maxTemp: 27, minHumidity: 45, maxHumidity: 75, sunlight: "partial" }
  },
  
  // Succulente
  {
    name: "Aloe Vera",
    description: "Annaffiare ogni 10 giorni. Tollera bene la siccità, luce indiretta.",
    wateringDays: 10,
    position: "Vicino a una finestra luminosa",
    icon: "🪴",
    imageUrl: "/plants/aloe.jpg",
    category: "succulents",
    preferences: { minTemp: 13, maxTemp: 27, minHumidity: 20, maxHumidity: 50, sunlight: "partial" }
  },
  {
    name: "Cactus",
    description: "Annaffiare ogni 20 giorni. Resistentissimo, ama sole pieno.",
    wateringDays: 20,
    position: "Davanzale assolato",
    icon: "🌵",
    imageUrl: "/plants/cactus.jpg",
    category: "succulents",
    preferences: { minTemp: 10, maxTemp: 40, minHumidity: 10, maxHumidity: 40, sunlight: "full" }
  },
  {
    name: "Echeveria",
    description: "Annaffiare ogni 12 giorni. Succulenta delicata, luce indiretta.",
    wateringDays: 12,
    position: "Interno luminoso",
    icon: "🌸",
    imageUrl: "/plants/echeveria.jpg",
    category: "succulents",
    preferences: { minTemp: 15, maxTemp: 26, minHumidity: 20, maxHumidity: 45, sunlight: "partial" }
  },
  
  // Fiori
  {
    name: "Orchidea",
    description: "Annaffiare ogni 7 giorni. Luce diffusa, no sole diretto, alta umidità.",
    wateringDays: 7,
    position: "Interno luminoso",
    icon: "🌺",
    imageUrl: "/plants/orchid.jpg",
    category: "flowers",
    preferences: { minTemp: 18, maxTemp: 26, minHumidity: 50, maxHumidity: 70, sunlight: "partial" }
  },
  {
    name: "Geranio",
    description: "Annaffiare ogni 3 giorni. Fioritura abbondante con sole pieno.",
    wateringDays: 3,
    position: "Balcone soleggiato",
    icon: "🌺",
    imageUrl: "/plants/geranium.jpg",
    category: "flowers",
    preferences: { minTemp: 15, maxTemp: 30, minHumidity: 40, maxHumidity: 65, sunlight: "full" }
  },
  {
    name: "Petunia",
    description: "Annaffiare ogni 2 giorni. Fiorisce in estate, sole pieno.",
    wateringDays: 2,
    position: "Balcone esposto a sud",
    icon: "🌸",
    imageUrl: "/plants/petunia.jpg",
    category: "flowers",
    preferences: { minTemp: 18, maxTemp: 28, minHumidity: 45, maxHumidity: 70, sunlight: "full" }
  },
  
  // Ortaggi
  {
    name: "Pomodoro",
    description: "Annaffiare ogni 2 giorni. Necessita molto sole e supporto per crescere.",
    wateringDays: 2,
    position: "Orto soleggiato",
    icon: "🍅",
    imageUrl: "/plants/tomato.jpg",
    category: "vegetables",
    preferences: { minTemp: 18, maxTemp: 30, minHumidity: 50, maxHumidity: 75, sunlight: "full" }
  },
  {
    name: "Lattuga",
    description: "Annaffiare ogni giorno. Preferisce temperature fresche e sole parziale.",
    wateringDays: 1,
    position: "Orto con mezz'ombra",
    icon: "🥬",
    imageUrl: "/plants/lettuce.jpg",
    category: "vegetables",
    preferences: { minTemp: 10, maxTemp: 24, minHumidity: 60, maxHumidity: 80, sunlight: "partial" }
  },
  {
    name: "Peperoncino",
    description: "Annaffiare ogni 3 giorni. Ama il caldo e il sole diretto.",
    wateringDays: 3,
    position: "Balcone caldo e soleggiato",
    icon: "🌶️",
    imageUrl: "/plants/pepper.jpg",
    category: "vegetables",
    preferences: { minTemp: 20, maxTemp: 35, minHumidity: 40, maxHumidity: 65, sunlight: "full" }
  },
  
  // Piante da interno
  {
    name: "Pothos",
    description: "Annaffiare ogni 5 giorni. Pianta da interno resistente, ombra parziale.",
    wateringDays: 5,
    position: "Interno con luce indiretta",
    icon: "🍃",
    imageUrl: "/plants/pothos.jpg",
    category: "indoor",
    preferences: { minTemp: 18, maxTemp: 27, minHumidity: 40, maxHumidity: 60, sunlight: "shade" }
  },
  {
    name: "Sansevieria",
    description: "Annaffiare ogni 14 giorni. Quasi indistruttibile, tollera poca luce.",
    wateringDays: 14,
    position: "Angolo interno",
    icon: "🌿",
    imageUrl: "/plants/sansevieria.jpg",
    category: "indoor",
    preferences: { minTemp: 15, maxTemp: 30, minHumidity: 30, maxHumidity: 50, sunlight: "shade" }
  },
  {
    name: "Ficus",
    description: "Annaffiare ogni 4 giorni. Grande pianta da interno, luce brillante.",
    wateringDays: 4,
    position: "Salotto vicino finestra",
    icon: "🌳",
    imageUrl: "/plants/ficus.jpg",
    category: "indoor",
    preferences: { minTemp: 18, maxTemp: 26, minHumidity: 40, maxHumidity: 60, sunlight: "partial" }
  },
];
