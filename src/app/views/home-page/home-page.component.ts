import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocationAutocompleteComponent } from '../../components/location-autocomplete/location-autocomplete.component';
import { utilsService } from '../../services/utils.services';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationAutocompleteComponent, MatIconModule, MatSnackBarModule],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {
  public starting_location: any = null;
  public destination: any = null;
  public date: string = '';
  public today_date: string = '';
  public five_days_date: string = '';
  public is_loading: boolean = false;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private utilsService = inject(utilsService);

  ngOnInit(): void {
    // Check for error query params
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['error'] === 'invalid_data') {
          this.snackBar.open("There is no data to build the route or data passed is invalid. Please create a new route.", "Close", { duration: 5000 });
        } else if (params['error'] === 'route_too_long') {
          this.snackBar.open("It is not possible to show weather information for this route: route too long.", "Close", { duration: 5000 });
        } else if (params['error'] === 'no_route') {
          this.snackBar.open("No drivable road route found between these locations (e.g. across oceans or disconnected continents).", "Close", { duration: 5000 });
        } else if (params['error'] === 'api_error') {
          this.snackBar.open("An error occurred while fetching route information. Please try again.", "Close", { duration: 5000 });
        }
      });

    // Create the range of possible dates: now -> 5 days
    const today = new Date();
    this.today_date = today.toISOString().slice(0, 16);
    // Set default date to today's date formatted for datetime-local
    this.date = this.today_date;

    const five_days_later = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
    this.five_days_date = five_days_later.toISOString().slice(0, 16);
  }

  onDepartureLocationSelected(place: any): void {
    this.starting_location = place;
  }

  onDestinationLocationSelected(place: any): void {
    this.destination = place;
  }

  submitForm(): void {
    this.is_loading = true;

    // Check if the form is filled out
    if (!this.starting_location || !this.destination || !this.date) {
      this.snackBar.open("Please choose a departure, destination, and departure time.", "Close", { duration: 3000 });
      this.is_loading = false;
      return;
    }

    // Check if date is in the past (allow 15 minute tolerance in case form was opened earlier)
    const diff = new Date().getTime() - Date.parse(this.date);
    if (diff > 15 * 60 * 1000) {
      this.snackBar.open("The departure date cannot be in the past.", "Close", { duration: 3000 });
      this.is_loading = false;
      return;
    }

    // Check straight line distance to prevent cross-ocean impossible routes
    const startLat = Number(this.starting_location.properties.lat);
    const startLon = Number(this.starting_location.properties.lon);
    const destLat = Number(this.destination.properties.lat);
    const destLon = Number(this.destination.properties.lon);
    const straightDistance = this.utilsService.getDistanceFromLatLonInM(startLat, startLon, destLat, destLon);

    if (straightDistance > 5000000) { // 5,000 km
      this.snackBar.open("Distance is too long or across oceans. Please choose locations connected by roads.", "Close", { duration: 5000 });
      this.is_loading = false;
      return;
    }

    // Send data to view-route page
    this.router.navigate(['/view-route'], {
      queryParams: {
        starting_location: this.starting_location.properties.formatted,
        starting_location_coordinates: [this.starting_location.properties.lat, this.starting_location.properties.lon],
        destination: this.destination.properties.formatted,
        destination_coordinates: [this.destination.properties.lat, this.destination.properties.lon],
        date: this.date
      }
    });

    this.is_loading = false;
  }
}
