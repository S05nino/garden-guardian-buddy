import { useState, useEffect } from "react";
import { Weather } from "@/types/plant";
import { getCurrentLocation, getWeatherData } from "@/lib/weather";
import { toast } from "sonner";

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Richiesta posizione...");
      const position = await getCurrentLocation();
      console.log("Posizione ottenuta:", position.coords.latitude, position.coords.longitude);
      
      const weatherData = await getWeatherData(
        position.coords.latitude,
        position.coords.longitude
      );
      console.log("Dati meteo ottenuti:", weatherData);
      
      setWeather(weatherData);
      toast.success("Meteo aggiornato", {
        description: `${weatherData.location}: ${weatherData.temp}°C`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore nel recupero meteo";
      setError(message);
      console.error("Errore completo meteo:", err);
      
      toast.error("Impossibile recuperare il meteo", {
        description: message,
      });
      
      // Set fallback weather
      setWeather({
        temp: 22,
        condition: "Parzialmente nuvoloso",
        humidity: 60,
        precipitation: 0,
        location: "Posizione non disponibile",
        icon: "⛅",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    
    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { weather, loading, error, refetch: fetchWeather };
}
