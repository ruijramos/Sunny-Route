import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { utilsService } from './utils.services';

@Injectable({
  providedIn: 'root'
})
export class locationsService {

  constructor(private utilsService: utilsService) { }

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
      const distance = this.utilsService.getDistanceFromLatLonInM(
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



}

