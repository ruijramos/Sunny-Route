import { Injectable } from '@angular/core';

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

        // Free OSRM public router
        const route_url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=false`;

        try {
            const response = await fetch(route_url);
            const data = await response.json();
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                driving_time = data.routes[0].duration;
            } else {
                console.warn('Routing error response:', data);
            }
        } catch (error) {
            console.error('Error fetching driving time:', error);
        }

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

    // Returns the icon associated with each weather ID (handles Open-Meteo WMO and legacy OWM)
    getWeatherIconFromWeatherID(id: number): string {
        // Open-Meteo WMO weather codes
        if (id === 0) return "assets/images/weather_icons/sun.png";
        if (id >= 1 && id <= 2) return "assets/images/weather_icons/cloud_sun.png";
        if (id === 3 || id === 45 || id === 48) return "assets/images/weather_icons/cloud.png";
        if ((id >= 51 && id <= 55) || (id >= 61 && id <= 65) || (id >= 80 && id <= 82)) return "assets/images/weather_icons/rain.png";
        if ((id >= 56 && id <= 57) || (id >= 66 && id <= 67) || (id >= 71 && id <= 77) || (id >= 85 && id <= 86)) return "assets/images/weather_icons/snow.png";
        if (id >= 95 && id <= 99) return "assets/images/weather_icons/storm.png";

        // Legacy OpenWeatherMap IDs fallback
        if (id >= 200 && id <= 232) return "assets/images/weather_icons/storm.png";
        if (id >= 300 && id <= 321) return "assets/images/weather_icons/cloud_rain_sun.png";
        if (id >= 500 && id <= 531) return "assets/images/weather_icons/rain.png";
        if (id >= 600 && id <= 622) return "assets/images/weather_icons/snow.png";
        if (id >= 701 && id <= 781) return "assets/images/weather_icons/cloud_rain_sun.png";
        if (id === 800) return "assets/images/weather_icons/sun.png";
        if (id >= 801 && id <= 804) return "assets/images/weather_icons/cloud.png";

        return "assets/images/weather_icons/cloud.png";
    }

    // Haversine formula to calculate distance in meters
    getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // Distance in meters
    }

    deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}