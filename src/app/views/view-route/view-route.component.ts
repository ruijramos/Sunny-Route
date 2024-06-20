import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
const pdfMake = require('pdfmake/build/pdfmake.js');
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
import { Margins } from 'pdfmake/interfaces';
import { locationsService } from '../../services/locations.services';
import { weatherService } from '../../services/weather.services';
import { utilsService } from '../../services/utils.services';
import { last } from 'rxjs';

@Component({
  selector: 'app-view-route',
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
  // Map: 
  // Key: Location name
  // Values: [Degrees, Weather Code, Weather Description/Type, Estimated Driving Time, Weather Date]
  public locations_weather_map = new Map<string, [number, string, string, string, string]>();
  public weather_info_is_open: boolean = false; // Variable that defines the weather information sidebar display 

  constructor(private route: ActivatedRoute,
              private locationsService: locationsService,
              private weatherService: weatherService,
              private utilsService: utilsService) { }

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
    if (!this.has_data) alert("There is no data to build the route or data passed on is invalid. Please create a new route.");

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
      alert("It will not be possible to show weather information for this route: route too long.");
    }

    // Extract coordinates from route
    if (this.has_data) await this.extractLocationsFromRoute();

    // Get weather from route locations
    if (this.has_data) await this.getTravelInformations();

    // Add weather informations to HTML
    if (this.has_data && !this.api_error_occurence) await this.addWeatherToInterface();

    // Communicate if there is any API error ocurrence
    if(this.api_error_occurence) {
      alert("An error has occurred in the API, please try again later.");
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

    // Wait 2 seconds to build route and retrieve information -> Yes, it needs to be optimized (but by LRM owner)
    await new Promise(resolve => setTimeout(resolve, 2000));

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
        this.api_error_occurence = true;
        return;
      }
      else {
        this.locations_weather_map.set(response[1]!, [Number(response[0]!), response[2]!, response[3]!, response[4]!, response[5]!]);
        // Update last location values to calculate new driving times
        last_coordinates = this.locations_coordinates[i];
        last_date = response[4]!;
      }
    }

  }

  // Add dynamic divs with weather information
  addWeatherToInterface() {

    for (let [key, value] of this.locations_weather_map) {
      let weather_icon = this.utilsService.getWeatherIconFromWeatherID(Number(value[1]));

      let div_parent_container = document.createElement('div');
      div_parent_container.className = 'weather-info';

      let div_son_icon_container = document.createElement('div');
      div_son_icon_container.className = 'weather-icon-container';
      div_son_icon_container.innerHTML = `<img src="` + weather_icon + `" alt="Cloud Weather" class="weather-icon">`;
      div_parent_container.appendChild(div_son_icon_container);

      let div_son_location = document.createElement('div');
      div_son_location.className = 'weather-location';
      div_son_location.innerHTML = key;
      div_parent_container.appendChild(div_son_location);

      let div_son_weather_value = document.createElement('div');
      div_son_weather_value.className = 'weather-value';
      div_son_weather_value.innerHTML = Math.round(value[0]).toString() + "º";
      div_parent_container.appendChild(div_son_weather_value);

      (<HTMLInputElement>document.getElementById("dinamic-weather-elements")).appendChild(div_parent_container);
    }

  }

  // Convert HTML div to PDF and download it
  downloadPDF() {

    if (!this.has_data || this.is_loading || this.api_error_occurence) {
      alert("No data available.");
      return;
    }

    // Create body with weather info
    let doc_definition_body = [];
    doc_definition_body.push(['Location', 'Degree Celsius', 'Weather', 'Estimated date of arrival', 'Forecast date']);
    for (let [key, value] of this.locations_weather_map) {
      doc_definition_body.push([key, value[0], value[2], value[3], value[4]]);
    }

    // Create pdfmake dd variable
    let doc_definition = {
      content: [
        {
          table: {
            widths: ['*'],
            body: [[{ text: "Sunny Route Report", style: 'filledHeader' }]]
          }
        },
        { text: 'From: ' + this.starting_location + '.', style: 'subheader' },
        { text: 'To: ' + this.destination + '.', style: 'subheader' },
        'Date: ' + this.date_formated + '.',
        {
          style: 'table',
          table: {
            body: doc_definition_body
          }
        },
        { text: 'Sunny Route is a GPS that allows you to view the weather information expected at different points along your route. You cand find more information in: https://github.com/ruijramos/Sunny-Route.', style: 'littletext' }
      ],
      styles: {
        filledHeader: {
          bold: true,
          fontSize: 14,
          color: 'white',
          fillColor: '#37ACE3',
          alignment: 'center'
        },
        header: {
          fontSize: 30,
          bold: true,
          margin: [0, 0, 0, 10] as Margins
        },
        subheader: {
          fontSize: 16,
          bold: true,
          margin: [0, 10, 0, 5] as Margins
        },
        littletext: {
          fontSize: 10,
          bold: true,
          margin: [0, 10, 0, 5] as Margins
        },
        table: {
          margin: [0, 5, 0, 15] as Margins
        },
        tableHeader: {
          bold: true,
          fontSize: 13,
          color: 'black'
        }
      }
    }

    const pdf = pdfMake.createPdf(doc_definition);
    pdf.download('route_weather_information.pdf');

  }

  // Hamburguer menu to switch display of sidebar
  toggleWeatherInfoSidebar() {

    this.weather_info_is_open = !this.weather_info_is_open;

  }

}
