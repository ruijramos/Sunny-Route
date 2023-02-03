import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class locationsService {

  public coordinates_jump_size = 500;

  constructor() { }

  // Get the list of search suggestions through the text written so far
  // If []: empty result or API error - no need to dinstinguish
  async getCitiesInSearch(search: string) {
    let cities_data: Array<any> = [];

    await fetch(environment.teleport_api_search_url + search)
      .then((response) => response.json())
      .then((data) => cities_data = data["_embedded"]["city:search-results"])
      .catch((error) => {
        console.error('Error:', error);
      });

    return cities_data;
  }

  // Get location coordinates from string adress
  // If []: empty result 
  // If [0, 0]: API error
  async getCoordinatesFromAdress(adress: string) {
    let coordinates: any[] = [];

    await fetch(environment.nominatim_api_autocomplete_url + adress)
      .then(response => response.json())
      .then(data => {
        if (data[0]) {
          coordinates = [data[0].lat, data[0].lon];
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        coordinates = [0, 0]
      });

    return coordinates;
  }

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

