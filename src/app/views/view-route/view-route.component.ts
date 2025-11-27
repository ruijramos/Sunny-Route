import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { locationsService } from '../../services/locations.services';
import { weatherService } from '../../services/weather.services';
import { utilsService } from '../../services/utils.services';
import { PdfService } from '../../services/pdf.service';
import { last } from 'rxjs';

import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WeatherInfo } from '../../models/weather.interface';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-view-route',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './view-route.component.html',
  styleUrls: ['./view-route.component.css']
})

export class ViewRouteComponent {

  public starting_location: string = '';
  public starting_location_coordinates: number[] = [];
  public destination: string = '';
  public destination_coordinates: number[] = [];
  public date: string = '';

  public date_formated: string = '';

  public has_data: boolean = false;
  public api_error_occurence = false;
  public is_loading: boolean = false;
  public route_max_distance: number = 7000000;

  public map: any;
  public itenerary: any;

  // Best city!
  public porto_portugal_coordinates = [41.14961, -8.61099]

  public locations_coordinates: any[] = [];

  public weatherList: { location: string, weather: WeatherInfo, icon: string }[] = [];
  public weather_info_is_open: boolean = false; // Variable that defines the weather information sidebar display 

  constructor(private route: ActivatedRoute,
    private router: Router,
    private locationsService: locationsService,
    private weatherService: weatherService,
    private utilsService: utilsService,
    private pdfService: PdfService,
    private snackBar: MatSnackBar) { }

  async ngOnInit() {

    this.is_loading = true;

    // Get form data from home page
    await this.route.queryParams
      .subscribe(params => {
        this.starting_location = params['starting_location'];
        this.starting_location_coordinates = params['starting_location_coordinates'];
        this.destination = params['destination'];
        this.destination_coordinates = params['destination_coordinates']
        this.date = params['date'];
      }
      );

    // Check if there is data coming from the form.
    if (this.starting_location_coordinates === undefined || this.destination_coordinates === undefined || this.date === undefined) {
      this.has_data = false;
    }
    else this.has_data = true;

    // Check if the date entered is between the current date and the following 5 days
    if (this.checkDateInterval() == false) {
      this.has_data = false;
    }

    // Alert user that there is no data or date inserted is invalid
    if (!this.has_data) {
      this.router.navigate(['/'], { queryParams: { error: 'invalid_data' } });
      return;
    }

    var map_center;
    // If there is no data (the page has not been invoked through the previous page), the center is set in the city of Porto, Portugal
    // This way, it is not necessary to ask the user for his location
    if (!this.has_data) map_center = this.porto_portugal_coordinates;
    // Calculate center to set map view
    else map_center = this.utilsService.calculateCenterCoordinates(this.starting_location_coordinates, this.destination_coordinates);

    // Initialize and center map
    await this.initMap(map_center);

    // Build route from starting location do destination
    if (this.has_data) await this.buildRoute();

    // Check if route distance is not to much - avoid performance issues
    if (this.itenerary._selectedRoute.summary.totalDistance > this.route_max_distance) {
      this.has_data = false;
      this.router.navigate(['/'], { queryParams: { error: 'route_too_long' } });
    }

    // Extract coordinates from route
    if (this.has_data) await this.extractLocationsFromRoute();

    // Get weather from route locations
    if (this.has_data) await this.getTravelInformations();

    // Communicate if there is any API error ocurrence
    if (this.api_error_occurence) {
      this.router.navigate(['/'], { queryParams: { error: 'api_error' } });
    }

    this.is_loading = false;

  }

  // Check if the date entered is between the current date and the following 5 days
  checkDateInterval() {

    if (!this.has_data) return false;

    const choosen_date = new Date(this.date + ":00.000Z");
    const current_date = new Date();
    const five_days_later = new Date(current_date);
    five_days_later.setDate(current_date.getDate() + 5);

    // Format the date correctly
    this.date_formated = this.date.split("T", 2)[0] + " " + this.date.split("T", 2)[1] + ":00";

    if (current_date <= choosen_date && five_days_later >= choosen_date) return true;
    else return false;

  }

  // Initialize and center map
  initMap(center: number[]) {

    this.map = L.map('map').setView([center[0], center[1]], 6);

    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.map.zoomControl.remove();
    L.control.zoom({
      position: 'bottomleft'
    }).addTo(this.map);

    // Add layer base to map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

  }

  // Create route from starting location to destination
  async buildRoute() {

    this.itenerary = L.Routing.control({
      show: false,
      addWaypoints: false,
      waypoints: [
        L.latLng(this.starting_location_coordinates[0], this.starting_location_coordinates[1]),
        L.latLng(this.destination_coordinates[0], this.destination_coordinates[1])
      ],
      routeWhileDragging: false
    }).addTo(this.map);

    // Wait for route to be found
    return new Promise<void>((resolve) => {
      this.itenerary.on('routesfound', (e: any) => {
        const routes = e.routes;
        if (routes && routes.length > 0) {
          const firstCoord = routes[0].coordinates[0];
          console.log('Route found. Start coord:', firstCoord);
          console.log('Requested start:', this.starting_location_coordinates);
        }
        resolve();
      });
    });

  }

  // Extract locations coordinates that route passes by
  async extractLocationsFromRoute() {

    this.locations_coordinates = await this.locationsService.getRouteLocationsCoordinates(this.itenerary._selectedRoute.coordinates);

  }

  // Get informations about city name, weather, time... for all cordinatinates groups
  async getTravelInformations() {

    // Calculating only the driving time between the last coordinate and the current one, preserving the estimated arrival time, significantly improves performance
    let last_coordinates = this.starting_location_coordinates;
    let last_date = this.date_formated;

    // Extract weather for each location
    for (let i = 0; i < this.locations_coordinates.length; i++) {
      let response = await this.weatherService.getCitiesWeatherAndTimeInformations(this.locations_coordinates[i], last_coordinates, last_date);
      // Check if there is any API error
      if (response[0] == "api_error") {
        console.warn(`Skipping point ${i} due to API error.`);
        // Continue to next point instead of stopping
        continue;
      }
      else {
        const weatherInfo: WeatherInfo = {
          temperature: Number(response[0]),
          weatherCode: response[2]!,
          weatherDescription: response[3]!,
          estimatedArrival: response[4]!,
          forecastDate: response[5]!
        };
        const locationName = response[1]!;

        // Check if the location is the same as the previous one to avoid duplicates
        if (this.weatherList.length === 0 || this.weatherList[this.weatherList.length - 1].location !== locationName) {
          const icon = this.utilsService.getWeatherIconFromWeatherID(Number(weatherInfo.weatherCode));
          this.weatherList.push({ location: locationName, weather: weatherInfo, icon: icon });
        }

        // Update last location values to calculate new driving times
        last_coordinates = this.locations_coordinates[i];
        // Use estimatedArrival for the next segment's calculation to ensure time accumulates correctly
        last_date = weatherInfo.estimatedArrival;
      }
    }

  }

  // Convert HTML div to PDF and download it
  downloadPDF() {

    if (!this.has_data || this.is_loading || this.api_error_occurence) {
      this.snackBar.open("No data available.", "Close", { duration: 3000 });
      return;
    }

    this.pdfService.downloadRouteReport(
      this.starting_location,
      this.destination,
      this.date_formated,
      this.weatherList
    );

  }

  // Hamburguer menu to switch display of sidebar
  toggleWeatherInfoSidebar() {

    this.weather_info_is_open = !this.weather_info_is_open;

  }

}
