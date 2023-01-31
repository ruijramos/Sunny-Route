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
  public is_loading: boolean = false;
  public map: any;
  public itenerary: any;
  public porto_portugal_coordinates = [41.14961, -8.61099]
  public locations_coordinates: any[] = [];
  public locations_names: any[] = [];
  public locations_weather_map = new Map<string, [number, string, string]>();
  public weather_info_is_open: boolean = false; // Variable that defines the weather information display 

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

    var map_center;
    // If there is no data (the page has not been invoked through the previous page), the center is set in the city of Porto, Portugal
    // This way, it is not necessary to ask the user for his location
    if (!this.has_data) map_center = this.porto_portugal_coordinates;
    // Calculate center to set map view
    else map_center = this.calculateCenterCoordinates(this.starting_location_coordinates, this.destination_coordinates);

    // Initialize and center map
    await this.initMap(map_center);

    // Build route from starting location do destination
    if (this.has_data) await this.buildRoute();

    // Extract locations from route
    if (this.has_data) await this.extractLocationsFromRoute(2);

    // Get weather from route locations
    if (this.has_data) await this.getWeatherCityTrios();

    // Add weather informations to HTML
    if (this.has_data) await this.addWeatherToInterface();

    // Alert user that there is no data
    if (!this.has_data) alert("There is no data to build the route or data passed on is invalid. Please create a new route.");

    this.is_loading = false;
  }

  // Check if the date entered is between the current date and the following 5 days
  checkDateInterval() {
    if (!this.has_data) return false;

    const choosen_date = new Date(this.date + ":00.000Z");
    const current_date = new Date();
    const five_days_later = new Date(current_date)
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

  // Calculate center between two coordinates
  calculateCenterCoordinates(point_A: number[], point_B: number[]) {
    return [(Number(point_A[0]) + Number(point_B[0])) / 2, (Number(point_A[1]) + Number(point_B[1])) / 2];
  };

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

  // Extract locations from route
  // Type:
  // 1 - Extract locations names that route passes by - less efficient
  // 2 - Extract locations coordinates that route passes by
  async extractLocationsFromRoute(type: number) {
    switch (type) {
      case 1: {
        this.locations_names = await this.locationsService.getRouteLocationsNames(this.itenerary._selectedRoute.coordinates)
        break;
      }
      case 2: {
        this.locations_coordinates = await this.locationsService.getRouteLocationsCoordinates(this.itenerary._selectedRoute.coordinates)
        break;
      }
    }
  }

  // Get trios degrees-city-weather for all locations coordinates
  async getWeatherCityTrios() {
    // Extract weather for each location
    for (let i = 0; i < this.locations_coordinates.length; i++) {
      let response = await this.weatherService.getWeatherAndCityNameByCoordinates(this.locations_coordinates[i], this.date_formated);
      this.locations_weather_map.set(response[1]!, [response[0]!, response[2]!, response[3]!]);
    }
  }

  // Add dynamic divs with weather information
  addWeatherToInterface() {
    for (let [key, value] of this.locations_weather_map) {
      var weather_icon = this.utilsService.getWeatherIconFromWeatherID(Number(value[1]));

      var div_parent_container = document.createElement('div');
      div_parent_container.className = 'weather-info';

      var div_son_icon_container = document.createElement('div');
      div_son_icon_container.className = 'weather-icon-container';
      div_son_icon_container.innerHTML = `<img src="` + weather_icon + `" alt="Cloud Weather" class="weather-icon">`;
      div_parent_container.appendChild(div_son_icon_container);

      var div_son_location = document.createElement('div');
      div_son_location.className = 'weather-location';
      div_son_location.innerHTML = key;
      div_parent_container.appendChild(div_son_location);

      var div_son_weather_value = document.createElement('div');
      div_son_weather_value.className = 'weather-value';
      div_son_weather_value.innerHTML = Math.round(value[0]).toString() + "º";
      div_parent_container.appendChild(div_son_weather_value);

      (<HTMLInputElement>document.getElementById("dinamic-weather-elements")).appendChild(div_parent_container);
    }
  }

  // Convert HTML div to PDF and download it
  downloadPDF() {
    if (!this.has_data){
      alert("No data available.");
      return;
    } 

    // Create body with weather info
    var doc_definition_body = [];
    doc_definition_body.push(['Location', 'Degree Celsius', 'Weather']);
    for (let [key, value] of this.locations_weather_map) {
      doc_definition_body.push([key, value[0], value[2]]);
    }

    // Create pdfmake dd variable
    var doc_definition  = {
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