import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { utilsService } from './utils.services';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class weatherService {
  private http = inject(HttpClient);
  private utilsService = inject(utilsService);

  // Weather interpretation code (WMO) to friendly text
  getWeatherDescription(code: number): string {
    if (code === 0) return 'Clear Sky';
    if (code === 1) return 'Mainly Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 66 && code <= 67) return 'Freezing Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 85 && code <= 86) return 'Snow Showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Clouds';
  }

  private reverseCache = new Map<string, string>();

  // Reverse geocode to get human-readable city/region name via live open geocoding APIs
  async getReverseCityName(lat: number, lon: number): Promise<string> {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (this.reverseCache.has(cacheKey)) {
      return this.reverseCache.get(cacheKey)!;
    }

    // OpenStreetMap Nominatim (jsonv2 with full address hierarchy)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&addressdetails=1`;
      const nomRes: any = await firstValueFrom(this.http.get(nomUrl));
      if (nomRes) {
        const addr = nomRes.address;
        const name = addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.suburb || addr?.county || addr?.state || nomRes.name;
        if (name && typeof name === 'string' && name.trim()) {
          const cleanName = name.trim();
          this.reverseCache.set(cacheKey, cleanName);
          return cleanName;
        }
      }
    } catch {
      // In case of network glitch or timeout, return empty string for graceful caller fallback
    }

    return '';
  }

  // Get weather information using Open-Meteo (100% free, keyless, open-source)
  async getCitiesWeatherAndTimeInformations(
    coordinates: number[],
    starting_location_coordinates: any[],
    date: string,
    presetDrivingTimeSeconds?: number,
    fallbackCityName?: string
  ): Promise<any[]> {
    try {
      const lat = Number(coordinates[0]);
      const lon = Number(coordinates[1]);

      // 1. Calculate estimated driving time from departure to this waypoint
      let driving_time = presetDrivingTimeSeconds;
      if (driving_time === undefined) {
        driving_time = await this.utilsService.getDrivingTime(
          [Number(starting_location_coordinates[0]), Number(starting_location_coordinates[1])],
          [lat, lon]
        );
      }
      if (driving_time === -1) {
        driving_time = 0;
      }

      // Calculate new estimated arrival date with driving_time
      const timestamp_start_date = this.utilsService.toTimestamp(date);
      const validTimestamp = !isNaN(timestamp_start_date) && timestamp_start_date > 0
        ? timestamp_start_date
        : Math.floor(Date.now() / 1000);
      const arrivalDate = new Date((validTimestamp + driving_time) * 1000);

      const pad = (n: number) => String(n).padStart(2, '0');
      const estimated_driving_date = `${arrivalDate.getFullYear()}-${pad(arrivalDate.getMonth() + 1)}-${pad(arrivalDate.getDate())} ${pad(arrivalDate.getHours())}:${pad(arrivalDate.getMinutes())}:${pad(arrivalDate.getSeconds())}`;

      // 2. Fetch Open-Meteo forecast (no API key required)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=temperature_2m,weather_code&timezone=auto`;
      const weatherData: any = await firstValueFrom(this.http.get(weatherUrl));

      let weather_degrees = 20;
      let weather_code = '0';
      let weather_description = 'Clear Sky';
      let weather_forecast_date = estimated_driving_date;

      if (weatherData && weatherData.hourly && weatherData.hourly.time) {
        const times: string[] = weatherData.hourly.time;
        const arrivalIso = `${arrivalDate.getFullYear()}-${pad(arrivalDate.getMonth() + 1)}-${pad(arrivalDate.getDate())}T${pad(arrivalDate.getHours())}:00`;

        let closestIndex = times.indexOf(arrivalIso);
        if (closestIndex === -1) {
          const arrivalMs = arrivalDate.getTime();
          let minDiff = Infinity;
          closestIndex = 0;
          for (let i = 0; i < times.length; i++) {
            const diff = Math.abs(new Date(times[i]).getTime() - arrivalMs);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = i;
            }
          }
        }

        weather_degrees = Math.round(weatherData.hourly.temperature_2m[closestIndex]);
        const codeNum = weatherData.hourly.weather_code[closestIndex];
        weather_code = String(codeNum);
        weather_description = this.getWeatherDescription(codeNum);
        weather_forecast_date = times[closestIndex].replace('T', ' ') + ':00';
      }

      // 3. Resolve city name
      let city_name = fallbackCityName;
      if (!city_name) {
        city_name = await this.getReverseCityName(lat, lon);
      }

      return [
        weather_degrees,
        city_name,
        weather_code,
        weather_description,
        estimated_driving_date,
        weather_forecast_date
      ];
    } catch (error) {
      console.error('Error in getCitiesWeatherAndTimeInformations:', error);
      return ["api_error"];
    }
  }
}