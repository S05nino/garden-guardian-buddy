import { Weather } from "@/types/plant";
import { Geolocation } from '@capacitor/geolocation';

// Usa Open-Meteo (gratuito, no API key richiesta)
const WEATHER_API_URL = "https://api.open-meteo.com/v1";

export async function getCurrentLocation(): Promise<GeolocationPosition> {
  try {
    // Request permission first
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== 'granted') {
        throw new Error("Permesso di geolocalizzazione negato");
      }
    }

    // Get position using Capacitor plugin
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // Convert Capacitor position to standard GeolocationPosition format
    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
      },
      timestamp: position.timestamp,
    } as GeolocationPosition;
  } catch (error) {
    console.error("Errore geolocalizzazione:", error);
    throw new Error("Impossibile ottenere la posizione. Assicurati di aver dato i permessi.");
  }
}

async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    // Usa Nominatim di OpenStreetMap per reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=it`,
      {
        headers: {
          'User-Agent': 'GardenGuardian/1.0'
        }
      }
    );
    
    if (!response.ok) {
      console.warn("Geocoding fallito, uso coordinate");
      return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }
    
    const data = await response.json();
    // Prova a ottenere città, altrimenti paese, altrimenti coordinate
    const location = data.address?.city || 
                     data.address?.town || 
                     data.address?.village || 
                     data.address?.county ||
                     `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    
    console.log("Località trovata:", location);
    return location;
  } catch (error) {
    console.error("Errore geocoding:", error);
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
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
