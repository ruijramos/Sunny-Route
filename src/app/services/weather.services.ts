import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { utilsService } from "./utils.services"

@Injectable({
    providedIn: 'root'
})
export class weatherService {

    constructor(private utilsService: utilsService) { }

    // Get quartets degrees-city-weather for location coordinates + most recent estimated driving time
    // If ["api_error"] - API error ocurrence
    async getWeatherAndCityNameByCoordinates(coodinates: number[], starting_location_coordinates: any[], date: string) {
        let weather_degrees;
        let city_name;
        let weather_type_code;
        let weather_type_string;
        let has_error: boolean = false;
 
        // Get driving time from start location to current location and add it to timestamp
        let driving_time = await this.utilsService.getDrivingTime([Number(starting_location_coordinates[0]), Number(starting_location_coordinates[1])], [coodinates[0], coodinates[1]])
        // Check if there is any API error occurence
        if(driving_time==-1) {
            has_error = true;
            return ["api_error"];
        }

        // Calculate new date with driving_time
        let timestamp_start_date = this.utilsService.toTimestamp(date);
        let human_format_start_date = new Date(timestamp_start_date);
        human_format_start_date.setSeconds(human_format_start_date.getSeconds() + driving_time); // Add driving time
        let timestamp_new_date = human_format_start_date.getTime();  

        // Return most recent date to calculate new driving times on the next iteration
        var return_formated_date = new Date(human_format_start_date).toISOString().split(".", 1)[0];

        // Fetch weather from foreseen time and location
        await fetch(environment.openweathermap_api_url + "?lat=" + coodinates[0] + "&lon=" + coodinates[1] + "&appid=" + environment.openweathermap_api_key + "&units=metric")
            .then((response) => response.json())
            .then((data) => {
                let closest_date_timestamp = this.utilsService.findClosestTimestamp(data.list, timestamp_new_date)
                weather_degrees = data.list[closest_date_timestamp].main.temp;
                city_name = data.city.name;
                weather_type_code = data.list[closest_date_timestamp].weather[0].id;
                weather_type_string = data.list[closest_date_timestamp].weather[0].main;
            })
            .catch((error) => {
                console.error('Error:', error);
                has_error = true;
            });

        if(has_error) return ["api_error"];
        return [weather_degrees, city_name, weather_type_code, weather_type_string, return_formated_date];
    }
}