import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class locationsService {

  public coordinates_jump_size = 500;

  constructor() { }

  // Extract locations coordinates that route passes by
  async getRouteLocationsCoordinates(coordinates: any[]) {

    let locations: any[] = [];

    for (let i = 0; i < coordinates.length; i = i + this.coordinates_jump_size) {
      locations.push([coordinates[i].lat, coordinates[i].lng])
    }

    // Last location
    locations.push([coordinates[coordinates.length - 1].lat, coordinates[coordinates.length - 1].lng])

    return locations;
    
  }

}

