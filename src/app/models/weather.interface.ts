export interface WeatherInfo {
    temperature: number;
    weatherCode: string;
    weatherDescription: string;
    estimatedArrival: string;
    forecastDate: string;
}

export interface LocationCoordinates {
    lat: number;
    lon: number;
}
