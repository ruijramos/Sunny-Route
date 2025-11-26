import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class locationsService {

  constructor() { }

  // Extract locations coordinates that route passes by
  async getRouteLocationsCoordinates(coordinates: any[]) {

    let locations: any[] = [];
    let accumulated_distance = 0;
    let last_coordinate = coordinates[0];
    const sampling_distance = 20000; // 20km

    // Always add the first point
    locations.push([coordinates[0].lat, coordinates[0].lng]);

    for (let i = 1; i < coordinates.length; i++) {
      const current_coordinate = coordinates[i];
      const distance = this.getDistanceFromLatLonInM(
        last_coordinate.lat, last_coordinate.lng,
        current_coordinate.lat, current_coordinate.lng
      );

      accumulated_distance += distance;
      last_coordinate = current_coordinate;

      if (accumulated_distance >= sampling_distance) {
        locations.push([current_coordinate.lat, current_coordinate.lng]);
        accumulated_distance = 0;
      }
    }

    // Last location
    locations.push([coordinates[coordinates.length - 1].lat, coordinates[coordinates.length - 1].lng])

    return locations;

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

