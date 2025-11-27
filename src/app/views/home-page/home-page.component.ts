import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { locationsService } from '../../services/locations.services';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeoapifyGeocoderAutocompleteModule } from '@geoapify/angular-geocoder-autocomplete';
import { environment } from '../../environments/environment';

import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GeoapifyGeocoderAutocompleteModule, MatIconModule, MatSnackBarModule],
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
    private route: ActivatedRoute,
    private locationsService: locationsService,
    private snackBar: MatSnackBar) { }

  ngOnInit() {

    // Check for error query params
    this.route.queryParams.subscribe((params: any) => {
      if (params['error'] === 'invalid_data') {
        this.snackBar.open("There is no data to build the route or data passed on is invalid. Please create a new route.", "Close", { duration: 5000 });
      } else if (params['error'] === 'route_too_long') {
        this.snackBar.open("It will not be possible to show weather information for this route: route too long.", "Close", { duration: 5000 });
      } else if (params['error'] === 'api_error') {
        this.snackBar.open("An error has occurred in the API, please try again later.", "Close", { duration: 5000 });
      }
    });

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
      this.snackBar.open("You must fill out the form properly before creating the route.", "Close", { duration: 3000 });
      this.is_loading = false;
      return;
    }

    // Check if date is not a previous one from now.
    let diff = new Date().getTime() - Date.parse(this.date);
    if (diff > 0) {
      this.snackBar.open("The date entered is in the past.", "Close", { duration: 3000 });
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
