import { Weather } from "@/types/plant";

// Usa Open-Meteo (gratuito, no API key richiesta)
const WEATHER_API_URL = "https://api.open-meteo.com/v1";
const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1";

export async function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `${GEOCODING_API_URL}/search?latitude=${lat}&longitude=${lon}&count=1&language=it&format=json`
    );
    
    if (!response.ok) {
      return "Posizione sconosciuta";
    }
    
    const data = await response.json();
    return data.results?.[0]?.name || "Posizione sconosciuta";
  } catch (error) {
    console.error("Errore geocoding:", error);
    return "Posizione sconosciuta";
  }
}

function getWeatherCondition(weatherCode: number): string {
  // Codici WMO Weather interpretation
  if (weatherCode === 0) return "Sereno";
  if (weatherCode <= 3) return "Parzialmente nuvoloso";
  if (weatherCode <= 48) return "Nebbioso";
  if (weatherCode <= 67) return "Piovoso";
  if (weatherCode <= 77) return "Nevoso";
  if (weatherCode <= 82) return "Rovesci";
  if (weatherCode <= 99) return "Temporale";
  return "Nuvoloso";
}

function getWeatherIcon(weatherCode: number): string {
  // Icone base per condizioni meteo
  if (weatherCode === 0) return "☀️";
  if (weatherCode <= 3) return "⛅";
  if (weatherCode <= 48) return "🌫️";
  if (weatherCode <= 67) return "🌧️";
  if (weatherCode <= 77) return "❄️";
  if (weatherCode <= 82) return "🌦️";
  if (weatherCode <= 99) return "⛈️";
  return "☁️";
}

export async function getWeatherData(lat: number, lon: number): Promise<Weather> {
  try {
    // Ottieni dati meteo da Open-Meteo
    const response = await fetch(
      `${WEATHER_API_URL}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=auto`
    );

    if (!response.ok) {
      throw new Error("Errore nel recupero dei dati meteo");
    }

    const data = await response.json();
    const locationName = await getLocationName(lat, lon);

    return {
      temp: Math.round(data.current.temperature_2m),
      condition: getWeatherCondition(data.current.weather_code),
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      location: locationName,
      icon: getWeatherIcon(data.current.weather_code),
    };
  } catch (error) {
    console.error("Errore meteo:", error);
    throw error;
  }
}
