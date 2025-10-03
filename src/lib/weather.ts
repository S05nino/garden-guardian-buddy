import { Weather } from "@/types/plant";

const WEATHER_API_KEY = "d7d6d2e8c8fd4c3db7b134756252701"; // Free tier WeatherAPI key
const WEATHER_API_URL = "https://api.weatherapi.com/v1";

export async function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  });
}

export async function getWeatherData(lat: number, lon: number): Promise<Weather> {
  try {
    const response = await fetch(
      `${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&lang=it`
    );

    if (!response.ok) {
      throw new Error("Errore nel recupero dei dati meteo");
    }

    const data = await response.json();

    return {
      temp: data.current.temp_c,
      condition: data.current.condition.text,
      humidity: data.current.humidity,
      precipitation: data.current.precip_mm,
      location: data.location.name,
      icon: data.current.condition.icon,
    };
  } catch (error) {
    console.error("Errore meteo:", error);
    // Fallback data
    return {
      temp: 22,
      condition: "Parzialmente nuvoloso",
      humidity: 60,
      precipitation: 0,
      location: "Posizione non disponibile",
      icon: "//cdn.weatherapi.com/weather/64x64/day/116.png",
    };
  }
}
