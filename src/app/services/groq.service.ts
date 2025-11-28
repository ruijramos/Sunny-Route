import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GroqService {

    private apiKey = environment.groq_api_key;
    private apiUrl = environment.groq_api_url;

    constructor() { }

    async generateWeatherSummary(startingLocation: string, destination: string, date: string, weatherList: any[]): Promise<string> {

        if (!this.apiKey) {
            console.warn('Groq API Key is missing.');
            return 'Please configure your Groq API Key to see the weather summary.';
        }

        const weatherDetails = weatherList.map(item =>
            `- ${item.location}: ${item.weather.temperature}°C, ${item.weather.weatherDescription} (${item.weather.estimatedArrival})`
        ).join('\n');

        const prompt = `
      I am planning a trip from ${startingLocation} to ${destination} starting on ${date}.
      Here is the weather forecast for points along the route:
      ${weatherDetails}

      Please provide a brief, friendly, and helpful summary of the weather conditions I can expect during this trip. 
      Highlight any potential issues like rain or extreme temperatures. 
      Do not use greetings like "Hi" or "Hello". Start directly with the information.
      Keep it under 100 words.
    `;

        const body = {
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile"
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error?.message || response.statusText || `Status ${response.status}`;
                throw new Error(`Groq API Error: ${errorMessage}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                return data.choices[0].message.content;
            } else {
                return 'Could not generate summary.';
            }

        } catch (error: any) {
            console.error('Error generating weather summary:', error);
            return 'Unable to generate weather summary at this time.';
        }
    }
}
