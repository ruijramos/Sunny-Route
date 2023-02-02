import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class locationsService {

  public coordinates_jump_size = 500;

  constructor() { }

  // Get the list of search suggestions through the text written so far
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
      });

    return coordinates;
  }

  // Extract location name from coordinates
  async getLocationName(coordinates: any[]) {
    let location: string = "";

    await fetch(environment.nominatim_api_reverse_url + "&lat=" + coordinates[0].lat + "&lon=" + coordinates[1].lng + "&addressdetails=1")
      .then(response => response.json())
      .then(data => {
        if (data.address.county) location = data.address.county;
      })
      .catch((error) => {
        console.error('Error:', error);
      });
    
      return location;
  }

  // Extract locations names that route passes by
  async getRouteLocationsNames(coordinates: any[]) {
    let locations: any[] = [];

    for (let i = 0; i < coordinates.length; i = i + this.coordinates_jump_size) {
      await fetch(environment.nominatim_api_reverse_url + "&lat=" + coordinates[i].lat + "&lon=" + coordinates[i].lng + "&addressdetails=1")
        .then(response => response.json())
        .then(data => {
          if (data.address.county) locations.push(data.address.county);
        })
        .catch((error) => {
          console.error('Error:', error);
        });
    }

    // Last location
    await fetch(environment.nominatim_api_reverse_url + "&lat=" + coordinates[coordinates.length - 1].lat + "&lon=" + coordinates[coordinates.length - 1].lng + "&addressdetails=1")
      .then(response => response.json())
      .then(data => {
        if (data.address.county) locations.push(data.address.county);
      })
      .catch((error) => {
        console.error('Error:', error);
      });

    // Get unique locations
    return [...new Set(locations)];
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

