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
      
      const position = await getCurrentLocation();
      const weatherData = await getWeatherData(
        position.coords.latitude,
        position.coords.longitude
      );
      
      setWeather(weatherData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore nel recupero meteo";
      setError(message);
      toast.error("Impossibile recuperare il meteo", {
        description: "Verrà usato il meteo predefinito",
      });
      
      // Set fallback weather
      setWeather({
        temp: 22,
        condition: "Parzialmente nuvoloso",
        humidity: 60,
        precipitation: 0,
        location: "Posizione non disponibile",
        icon: "//cdn.weatherapi.com/weather/64x64/day/116.png",
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
