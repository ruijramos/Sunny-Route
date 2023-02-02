import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class weatherService {

    constructor() { }

    // String date to timestamp
    toTimestamp(strDate: string) {
        let datum = Date.parse(strDate);
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

    // Get driving time from one place to another
    async getDrivingTime(start: [number, number], end: [number, number]) {
        const route_url = `https://dev.virtualearth.net/REST/v1/Routes/Driving?wp.0=${start[0]},${start[1]}&wp.1=${end[0]},${end[1]}&key=${environment.bigmaps_api_key}`;
        const response = await fetch(route_url);
        const data = await response.json();
        const driving_time = data.resourceSets[0].resources[0].travelDuration;
        return driving_time;
    }

    // Get trios degrees-city-weather for location coordinates
    // Hours that API supports: 12AM, 3AM, 6AM, 9AM, 12PM, 3PM, 6PM, 9PM
    async getWeatherAndCityNameByCoordinates(coodinates: number[], starting_location_coordinates: any[], date: string) {
        let weather_degrees;
        let city_name;
        let weather_type_code;
        let weather_type_string;
 
        // Get driving time from start location to current location and add it to timestamp
        let driving_time = await this.getDrivingTime([Number(starting_location_coordinates[0]), Number(starting_location_coordinates[1])], [coodinates[0], coodinates[1]])
        let timestamp_start_date = this.toTimestamp(date);
        let human_format_start_date = new Date(timestamp_start_date);
        human_format_start_date.setSeconds(human_format_start_date.getSeconds() + driving_time); // Add driving time
        let timestamp_new_date = human_format_start_date.getTime();  

        // Return most recent date to calculate new driving times on the next iteration
        var return_formated_date = new Date(human_format_start_date).toISOString().split(".", 1)[0];

        // Fetch weather from foreseen time and location
        await fetch(environment.openweathermap_api_url + "?lat=" + coodinates[0] + "&lon=" + coodinates[1] + "&appid=" + environment.openweathermap_api_key + "&units=metric")
            .then((response) => response.json())
            .then((data) => {
                let closest_date_timestamp = this.findClosestTimestamp(data.list, timestamp_new_date)
                weather_degrees = data.list[closest_date_timestamp].main.temp;
                city_name = data.city.name;
                weather_type_code = data.list[closest_date_timestamp].weather[0].id;
                weather_type_string = data.list[closest_date_timestamp].weather[0].main;
            })
            .catch((error) => {
                console.error('Error:', error);
            });

        return [weather_degrees, city_name, weather_type_code, weather_type_string, return_formated_date];
    }
}