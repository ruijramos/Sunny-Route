import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { utilsService } from "./utils.services"

@Injectable({
    providedIn: 'root'
})
export class weatherService {

    constructor(private utilsService: utilsService) { }

    // Get quartets degrees-city-weather(code)-weather(type/description) for location coordinates + most recent estimated driving time +  most recent used date to calculate weather
    // If ["api_error"] - API error ocurrence
    async getWeatherAndCityNameByCoordinates(coodinates: number[], starting_location_coordinates: any[], date: string) {
        let weather_degrees;
        let city_name;
        let weather_code;
        let weather_description;
        let has_error: boolean = false;
 
        // Get driving time from start location to current location and add it to timestamp
        let driving_time = await this.utilsService.getDrivingTime([Number(starting_location_coordinates[0]), Number(starting_location_coordinates[1])], [coodinates[0], coodinates[1]])
        // Check if there is any API error occurence
        if(driving_time==-1) {
            has_error = true;
            return ["api_error"];
        }

        // Calculate new estimated date with driving_time
        let timestamp_start_date = this.utilsService.toTimestamp(date);
        let human_format_start_date = new Date(timestamp_start_date * 1000);
        human_format_start_date.setSeconds(human_format_start_date.getSeconds() + driving_time); // Add driving time
        let timestamp_new_date = human_format_start_date.getTime() / 1000; 

        // Weather date - forecast date
        var weather_forecast_date;

        await fetch(environment.openweathermap_api_url + "?lat=" + coodinates[0] + "&lon=" + coodinates[1] + "&appid=" + environment.openweathermap_api_key + "&units=metric")
            .then((response) => response.json())
            .then((data) => {
                // Find the closest timestamp between estimated driving time and available forecast times in list
                let closest_date_timestamp = this.utilsService.findClosestTimestamp(data.list, timestamp_new_date)

                weather_degrees = data.list[closest_date_timestamp].main.temp;
                city_name = data.city.name;
                weather_code = data.list[closest_date_timestamp].weather[0].id;
                weather_description = data.list[closest_date_timestamp].weather[0].main;
                weather_forecast_date = data.list[closest_date_timestamp].dt_txt;
            })
            .catch((error) => {
                console.error('Error:', error);
                has_error = true;
            });
        
        // Return most recent date to calculate new driving times on the next iteration
        var estimated_driving_date = new Date(human_format_start_date).toISOString().split(".", 1)[0];
        estimated_driving_date = estimated_driving_date.split("T", 2)[0] + " " + estimated_driving_date.split("T", 2)[1];

        if(has_error) return ["api_error"];
        return [weather_degrees, city_name, weather_code, weather_description, estimated_driving_date, weather_forecast_date];
    }
}