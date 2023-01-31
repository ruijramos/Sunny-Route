import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class utilsService {

    constructor() { }

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