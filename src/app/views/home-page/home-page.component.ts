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
  public starting_location: any;
  public destination: any;
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

  onDepartureLocationSelected(place: any): void {

    this.starting_location = place;

  }

  onDestinationLocationSelected(place: any): void {

    this.destination = place;

  }

  async submitForm() {
    
    this.is_loading = true;

    // Check if the form is filled out
    if (this.starting_location == null || this.destination == null || this.date == "") {
      alert("You must fill out the form properly before creating the route.");
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
          starting_location: this.starting_location.properties.formatted,
          starting_location_coordinates: [this.starting_location.properties.lat, this.starting_location.properties.lon], // [lat, lon]
          destination: this.destination.properties.formatted,
          destination_coordinates: [this.destination.properties.lat, this.destination.properties.lon], // [lat, lon]
          date: this.date
        }
      }
    );

    this.is_loading = false;
    return;

  }

}
