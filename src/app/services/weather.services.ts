import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class weatherService {

    constructor() { }

    // String date to timestamp
    toTimestamp(strDate: string) {
        var datum = Date.parse(strDate);
        return datum / 1000;
    }

    // Binary search to find the index of the array that contains the timestamp closest to the specified targetTimestamp. 
    findClosestTimestamp(arr: any[], target_timestamp: number) {
        let left = 0;
        let right = arr.length - 1;

        while (left < right) {
            const mid = left + Math.floor((right - left) / 2);
            const mid_timestamp = arr[mid].dt;

            if (mid_timestamp < target_timestamp) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        return left;
    }

    // Get trios degrees-city-weather for location coordinates
    // Hours that API supports: 12AM, 3AM, 6AM, 9AM, 12PM, 3PM, 6PM, 9PM
    async getWeatherAndCityNameByCoordinates(coodinates: number[], date: string) {
        let weather_degrees;
        let city_name;
        let weather_type_code;
        let weather_type_string;

        var timestamp = this.toTimestamp(date);

        await fetch(environment.openweathermap_api_url + "?lat=" + coodinates[0] + "&lon=" + coodinates[1] + "&appid=" + environment.openweathermap_api_key + "&units=metric")
            .then((response) => response.json())
            .then((data) => {
                let closest_date_timestamp = this.findClosestTimestamp(data.list, timestamp)
                weather_degrees = data.list[closest_date_timestamp].main.temp;
                city_name = data.city.name;
                weather_type_code = data.list[closest_date_timestamp].weather[0].id;
                weather_type_string = data.list[closest_date_timestamp].weather[0].main;
            })
            .catch((error) => {
                console.error('Error:', error);
            });

        return [weather_degrees, city_name, weather_type_code, weather_type_string];
    }
}