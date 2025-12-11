import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class utilsService {

    constructor() { }

    // Calculate center between two coordinates
    calculateCenterCoordinates(
        point_A: number[],
        point_B: number[]
    ) {

        return [(Number(point_A[0]) + Number(point_B[0])) / 2, (Number(point_A[1]) + Number(point_B[1])) / 2];

    };

    // Get driving time from one place to another
    // If return -1: API error ocurrence
    async getDrivingTime(start: [number, number],
        end: [number, number]) {

        // If distance is less than 100 meters, return 0 (avoid API error)
        if (this.getDistanceFromLatLonInM(start[0], start[1], end[0], end[1]) < 100) return 0;

        let driving_time = -1;

        // OSRM API (Free)
        // Note: OSRM takes coordinates in "lon,lat" format
        // OSRM API (Free)
        // Note: OSRM takes coordinates in "lon,lat" format
        const route_url = `${environment.osrm_api_url}${start[1]},${start[0]};${end[1]},${end[0]}?overview=false`;

        await fetch(route_url)
            .then((response) => response.json())
            .then((data) => {
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    driving_time = data.routes[0].duration;
                } else {
                    console.error('OSRM Error:', data);
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });

        return driving_time;

    }

    // Binary search to find the index of the array that contains the timestamp closest to the specified targetTimestamp. 
    findClosestTimestamp(arr: any[],
        target_timestamp: number) {

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

        if (left > 0 && Math.abs(arr[left].dt - target_timestamp) >= Math.abs(arr[left - 1].dt - target_timestamp)) {
            return left - 1;
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

        switch (true) {
            case (id >= 200 && id <= 232):
                return "assets/images/weather_icons/storm.png";
            case (id >= 300 && id <= 321):
                return "assets/images/weather_icons/cloud_rain_sun.png";
            case (id >= 500 && id <= 531):
                return "assets/images/weather_icons/rain.png";
            case (id >= 600 && id <= 622):
                return "assets/images/weather_icons/snow.png";
            case (id >= 701 && id <= 781):
                return "assets/images/weather_icons/cloud_rain_sun.png";
            case (id === 800):
                return "assets/images/weather_icons/sun.png";
            case (id >= 801 && id <= 804):
                return "assets/images/weather_icons/cloud.png";
            default:
                return "";
        }

    }



    // Haversine formula to calculate distance in meters
    getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // Radius of the earth in km
        var dLat = this.deg2rad(lat2 - lat1);
        var dLon = this.deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d * 1000; // Distance in meters
    }

    deg2rad(deg: number) {
        return deg * (Math.PI / 180)
    }

}