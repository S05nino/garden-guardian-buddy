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
}

export interface Weather {
  temp: number;
  condition: string;
  humidity: number;
  precipitation: number;
  location: string;
  icon: string;
}

export const PLANT_TEMPLATES: Omit<Plant, "id" | "lastWatered" | "health">[] = [
  {
    name: "Basilico",
    description: "Annaffiare ogni 2 giorni. Ama il sole diretto.",
    wateringDays: 2,
    position: "Balcone soleggiato",
    icon: "🌿",
    imageUrl: "/plants/basil.jpg"
  },
  {
    name: "Aloe Vera",
    description: "Annaffiare ogni 10 giorni. Meglio luce indiretta.",
    wateringDays: 10,
    position: "Vicino a una finestra luminosa",
    icon: "🪴",
    imageUrl: "/plants/aloe.jpg"
  },
  {
    name: "Orchidea",
    description: "Annaffiare ogni 7 giorni. Luce diffusa, no sole diretto.",
    wateringDays: 7,
    position: "Interno luminoso",
    icon: "🌺",
    imageUrl: "/plants/orchid.jpg"
  },
  {
    name: "Cactus",
    description: "Annaffiare ogni 20 giorni. Sole pieno.",
    wateringDays: 20,
    position: "Davanzale assolato",
    icon: "🌵",
    imageUrl: "/plants/cactus.jpg"
  },
  {
    name: "Menta",
    description: "Annaffiare ogni 3 giorni. Ama l'umidità.",
    wateringDays: 3,
    position: "Balcone ombreggiato",
    icon: "🌱",
    imageUrl: "/plants/mint.jpg"
  },
];
