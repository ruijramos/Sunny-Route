import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { locationsService } from '../../services/locations.services';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})

export class HomePageComponent {

  public departure_cities_list: Array<any> = [];
  public destination_cities_list: Array<any> = [];
  public starting_location: string = '';
  public destination: string = '';
  public date: string = '';
  public today_date: string = '';
  public five_days_date: string = '';
  public is_loading: boolean = false;

  constructor(private router: Router,
              private locationsService: locationsService) {}

  ngOnInit() {
    // Create the range of possible dates - today -> 5 days
    const today = new Date();
    this.today_date = today.toISOString().slice(0, 10) + "T00:00";
    const five_days_later = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
    this.five_days_date = five_days_later.toISOString().slice(0, 10) + "T00:00";
  }

  // Create the suggestions datalist for the search box
  async buildDepartureLocationDatalist() {
    let user_typed_text = (<HTMLInputElement>document.getElementById("starting-location")).value;
    let cities_data = await this.locationsService.getCitiesInSearch(user_typed_text);

    this.departure_cities_list = []
    for (let i = 0; i < cities_data.length; i++) {
      this.departure_cities_list.push(cities_data[i].matching_full_name);
    }
  }

  // Create the suggestions datalist for the search box
  async buildDestinationLocationDatalist() {
    let user_typed_text = (<HTMLInputElement>document.getElementById("destination")).value;
    let cities_data = await this.locationsService.getCitiesInSearch(user_typed_text);

    this.destination_cities_list = []
    for (let i = 0; i < cities_data.length; i++) {
      this.destination_cities_list.push(cities_data[i].matching_full_name);
    }
  }

  async submitForm() {
    this.is_loading = true;

    // Check if the form is filled out
    if (this.starting_location == "" || this.destination == "" || this.date == "") {
      alert("You must fill out the form properly before creating the route.");
      this.is_loading = false;
      return;
    }

    // Check if locations really exist. 
    var start_coordinates = await this.locationsService.getCoordinatesFromAdress(this.starting_location);
    var destination_coordinates = await this.locationsService.getCoordinatesFromAdress(this.destination);
    if (start_coordinates.length == 0 || destination_coordinates.length == 0) {
      alert("The inserted locations must exist.");
      this.is_loading = false;
      return;
    }

    // Check if date is not a previous one from now.
    let diff = new Date().getTime() - Date.parse(this.date);
    if (diff > 0) {
      alert("The date entered is in the past.");
      this.is_loading = false;
      return;
    }

    // Send data to view-route page
    this.router.navigate(['/view-route'],
      {
        queryParams: {
          starting_location: this.starting_location,
          starting_location_coordinates: start_coordinates,
          destination: this.destination,
          destination_coordinates: destination_coordinates,
          date: this.date
        }
      }
    );

    this.is_loading = false;
    return;
  }

}
