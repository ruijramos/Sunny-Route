import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class utilsService {

    constructor() { }

    // Get driving time from one place to another
    async getDrivingTime(start: [number, number], end: [number, number]) {
        const route_url = `https://dev.virtualearth.net/REST/v1/Routes/Driving?wp.0=${start[0]},${start[1]}&wp.1=${end[0]},${end[1]}&key=${environment.bigmaps_api_key}`;
        const response = await fetch(route_url);
        const data = await response.json();
        const driving_time = data.resourceSets[0].resources[0].travelDuration;
        return driving_time;
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

    // String date to timestamp
    toTimestamp(strDate: string) {
        let datum = Date.parse(strDate);
        return datum / 1000;
    }

    // Returns the icon associated with each weather ID
    getWeatherIconFromWeatherID(id: number) {
        if(id >= 200 && id <= 232) {
            return "../assets/images/weather_icons/storm.png";
        }

        if(id >= 300 && id <= 321) {
            return "../assets/images/weather_icons/cloud_rain_sun.png";
        }

        if(id >= 500 && id <= 531) {
            return "../assets/images/weather_icons/rain.png";
        }

        if(id >= 600 && id <= 622) {
            return "../assets/images/weather_icons/snow.png";
        }

        if(id >= 701 && id <= 781) {
            return "../assets/images/weather_icons/cloud_rain_sun.png";
        }

        if(id == 800) {
            return "../assets/images/weather_icons/sun.png";
        }

        if(id >= 801 && id <= 804) {
            return "../assets/images/weather_icons/cloud.png";
        }

        return "";
    }

}