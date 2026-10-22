import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GroqService {
  private http = inject(HttpClient);
  private apiUrl = environment.groq_api_url || 'https://api.groq.com/openai/v1/chat/completions';

  /** Indicates whether the last generated summary came from Groq AI or the local engine */
  public isLastSummaryAi = false;

  /**
   * Candidate models to try in order of preference.
   * If a model is not available on the current Groq tier/account, the service automatically tries the next.
   */
  private readonly candidateModels = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ];

  /** Resolves the Groq API key from localStorage or Angular environment */
  private get apiKey(): string {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('GROQ_API_KEY');
      if (stored && stored.trim()) {
        return stored.trim();
      }
    }
    return (environment.groq_api_key || '').trim();
  }

  async generateWeatherSummary(
    startingLocation: string,
    destination: string,
    date: string,
    weatherList: any[]
  ): Promise<string> {
    const key = this.apiKey;

    // If no Groq API key is configured, generate an instant smart local summary
    if (!key) {
      this.isLastSummaryAi = false;
      console.info('[Sunny Route] No Groq API key detected. Using built-in local summary engine.');
      return this.generateLocalSummary(startingLocation, destination, weatherList);
    }

    const weatherDetails = weatherList.map(item =>
      `- ${item.location}: ${item.weather.temperature}°C, ${item.weather.weatherDescription} (${item.weather.estimatedArrival})`
    ).join('\n');

    const cleanStart = this.sanitizeInput(startingLocation);
    const cleanDest = this.sanitizeInput(destination);

    const prompt = `
I am planning a road trip from ${cleanStart} to ${cleanDest} starting on ${date}.
Here is the weather forecast along the route:
${weatherDetails}

Please provide a brief, friendly, and helpful summary of the weather conditions for this trip.
Highlight any potential issues like rain, extreme temperatures, or fog.
Do not use greetings like "Hi" or "Hello". Start directly with the information.
Keep it under 100 words.
`;

    // Try candidate models in order (handles tier differences or model deprecations)
    for (const model of this.candidateModels) {
      try {
        console.info(`[Groq AI] Requesting weather summary with model: ${model}`);
        const body = {
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          model: model,
          temperature: 0.6,
          max_tokens: 250
        };

        const response: any = await firstValueFrom(
          this.http.post(this.apiUrl, body, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            }
          })
        );

        if (response?.choices?.[0]?.message?.content) {
          this.isLastSummaryAi = true;
          console.info(`[Groq AI] Successfully generated summary using ${model}`);
          return response.choices[0].message.content.trim();
        }
      } catch (error: any) {
        const errorMsg = error?.error?.error?.message || error?.message || '';
        console.warn(`[Groq AI] Model '${model}' failed: ${errorMsg}`);
        // If it's not a model error (e.g. invalid key or network down), stop trying further models
        if (error?.status === 401 || error?.status === 403) {
          console.error('[Groq AI] Authentication error: Invalid Groq API key.');
          break;
        }
      }
    }

    console.warn('[Groq AI] All Groq models failed. Falling back to local weather summary.');
    this.isLastSummaryAi = false;
    return this.generateLocalSummary(startingLocation, destination, weatherList);
  }

  // Fast, deterministic local summary when running with zero API keys
  private generateLocalSummary(startingLocation: string, destination: string, weatherList: any[]): string {
    if (!weatherList || weatherList.length === 0) {
      return `Trip from ${startingLocation} to ${destination}: weather information is being calculated.`;
    }

    const temps = weatherList.map(item => Number(item.weather.temperature)).filter(t => !isNaN(t));
    const minTemp = temps.length > 0 ? Math.min(...temps) : 20;
    const maxTemp = temps.length > 0 ? Math.max(...temps) : 20;

    const conditions = weatherList.map(item => (item.weather.weatherDescription || '').toLowerCase());
    const hasRain = conditions.some(c => c.includes('rain') || c.includes('drizzle') || c.includes('shower'));
    const hasSnow = conditions.some(c => c.includes('snow'));
    const hasStorm = conditions.some(c => c.includes('storm') || c.includes('thunder'));
    const hasFog = conditions.some(c => c.includes('fog'));

    let alertText = '';
    if (hasStorm) {
      alertText = ' Thunderstorms are expected in some areas—drive cautiously and keep headlights on.';
    } else if (hasSnow) {
      alertText = ' Expect snow along parts of the route; watch for slippery road surfaces.';
    } else if (hasRain) {
      alertText = ' Some rain or showers are forecast along the way, so expect wet roads.';
    } else if (hasFog) {
      alertText = ' Patchy fog may reduce visibility in sections.';
    } else {
      alertText = ' Favorable driving conditions are expected throughout the journey.';
    }

    const startCity = startingLocation.split(',')[0].trim();
    const endCity = destination.split(',')[0].trim();

    return `Trip from ${startCity} to ${endCity}: Temperatures will range from ${minTemp}°C to ${maxTemp}°C.${alertText} Have a safe and pleasant drive!`;
  }

  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input.replace(/[<>"{}]/g, '').slice(0, 100).trim();
  }
}
