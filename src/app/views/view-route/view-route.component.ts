import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { locationsService } from '../../services/locations.services';
import { weatherService } from '../../services/weather.services';
import { utilsService } from '../../services/utils.services';
import { PdfService } from '../../services/pdf.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WeatherInfo } from '../../models/weather.interface';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GroqService } from '../../services/groq.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-view-route',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatSnackBarModule],
  templateUrl: './view-route.component.html',
  styleUrls: ['./view-route.component.css']
})
export class ViewRouteComponent implements OnInit, AfterViewInit, OnDestroy {
  public starting_location: string = '';
  public starting_location_coordinates: number[] = [];
  public destination: string = '';
  public destination_coordinates: number[] = [];
  public date: string = '';
  public date_formated: string = '';

  public has_data: boolean = false;
  public api_error_occurence: boolean = false;
  public is_loading: boolean = false;
  public route_max_distance: number = 7000000;

  public map: any = null;
  public itenerary: any = null;

  public porto_portugal_coordinates = [41.14961, -8.61099];
  public locations_coordinates: any[] = [];
  public weatherList: { location: string; weather: WeatherInfo; icon: string }[] = [];
  public weather_info_is_open: boolean = false;

  // Mobile Bottom Sheet Properties
  @ViewChild('weatherInfoSidebar') weatherInfoSidebar!: ElementRef;
  @ViewChild('weatherInfoHeader') weatherInfoHeader!: ElementRef;

  private touchStartY: number = 0;
  private currentTouchY: number = 0;
  private isDragging: boolean = false;
  private readonly DRAG_THRESHOLD = 50;
  private PEEK_HEIGHT = 150;
  private sheetHeight: number = 0;

  // Weather Summary
  public weatherSummary: string = '';
  public isGeneratingSummary: boolean = false;
  public isAiSummary: boolean = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private locationsService = inject(locationsService);
  private weatherService = inject(weatherService);
  private utilsService = inject(utilsService);
  private pdfService = inject(PdfService);
  private snackBar = inject(MatSnackBar);
  private groqService = inject(GroqService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (window.innerWidth > 600) {
      this.weather_info_is_open = true;
    }

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (params) => {
        this.starting_location = params['starting_location'];
        const startCoords = params['starting_location_coordinates'];
        this.starting_location_coordinates = Array.isArray(startCoords)
          ? startCoords.map(Number)
          : (typeof startCoords === 'string' ? startCoords.split(',').map(Number) : []);

        this.destination = params['destination'];
        const destCoords = params['destination_coordinates'];
        this.destination_coordinates = Array.isArray(destCoords)
          ? destCoords.map(Number)
          : (typeof destCoords === 'string' ? destCoords.split(',').map(Number) : []);

        this.date = params['date'];

        await this.loadRouteData();
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updatePeekHeight();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.itenerary) {
      try {
        this.itenerary.remove();
      } catch {
        // ignore error on teardown
      }
      this.itenerary = null;
    }

    if (this.map) {
      try {
        this.map.clearAllEventListeners();
        this.map.remove();
      } catch {
        // ignore error on teardown
      }
      this.map = null;
    }
  }

  private async loadRouteData(): Promise<void> {
    this.is_loading = true;

    if (
      !this.starting_location_coordinates ||
      this.starting_location_coordinates.length < 2 ||
      !this.destination_coordinates ||
      this.destination_coordinates.length < 2 ||
      !this.date
    ) {
      this.has_data = false;
      this.router.navigate(['/'], { queryParams: { error: 'invalid_data' } });
      return;
    }

    this.has_data = true;

    if (!this.checkDateInterval()) {
      this.has_data = false;
      this.router.navigate(['/'], { queryParams: { error: 'invalid_data' } });
      return;
    }

    const straightDist = this.utilsService.getDistanceFromLatLonInM(
      this.starting_location_coordinates[0], this.starting_location_coordinates[1],
      this.destination_coordinates[0], this.destination_coordinates[1]
    );

    if (straightDist > 5000000) {
      this.has_data = false;
      this.router.navigate(['/'], { queryParams: { error: 'route_too_long' } });
      return;
    }

    const map_center = this.utilsService.calculateCenterCoordinates(
      this.starting_location_coordinates,
      this.destination_coordinates
    );

    this.initMap(map_center);

    try {
      await this.buildRoute();

      const selectedRoute = this.itenerary?._selectedRoute;
      if (!selectedRoute) {
        this.api_error_occurence = true;
        this.router.navigate(['/'], { queryParams: { error: 'no_route' } });
        return;
      }

      // Check if road route is physically plausible compared to straight line
      // If road route is significantly shorter than straight-line distance, OSRM snapped across an ocean/gap!
      if (straightDist > 50000 && selectedRoute.summary && selectedRoute.summary.totalDistance < straightDist * 0.5) {
        this.has_data = false;
        this.router.navigate(['/'], { queryParams: { error: 'no_route' } });
        return;
      }

      if (selectedRoute.summary && selectedRoute.summary.totalDistance > this.route_max_distance) {
        this.has_data = false;
        this.router.navigate(['/'], { queryParams: { error: 'route_too_long' } });
        return;
      }

      await this.getTravelInformations();
    } catch (err) {
      console.error('Route calculation error:', err);
      this.api_error_occurence = true;
      this.router.navigate(['/'], { queryParams: { error: 'api_error' } });
    } finally {
      this.is_loading = false;
    }
  }

  private updatePeekHeight(): void {
    if (this.weatherInfoHeader && this.weatherInfoSidebar) {
      const headerHeight = this.weatherInfoHeader.nativeElement.offsetHeight;
      this.PEEK_HEIGHT = headerHeight;
      this.sheetHeight = this.weatherInfoSidebar.nativeElement.offsetHeight;

      if (!this.weather_info_is_open && window.innerWidth <= 600) {
        const peekTranslate = this.sheetHeight - this.PEEK_HEIGHT;
        this.weatherInfoSidebar.nativeElement.style.transform = `translateY(${peekTranslate}px)`;
      }
    }
  }

  checkDateInterval(): boolean {
    if (!this.has_data) return false;

    const chosenDate = new Date(this.date);
    if (isNaN(chosenDate.getTime())) return false;

    const currentDate = new Date();
    // Allow routes departing anytime from 48 hours ago up to 7 days in the future (permits reloading or sharing links)
    const minDate = new Date(currentDate.getTime() - 48 * 60 * 60 * 1000);
    const maxDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    this.date_formated = this.date.replace('T', ' ') + (this.date.length === 16 ? ':00' : '');

    return chosenDate >= minDate && chosenDate <= maxDate;
  }

  initMap(center: number[]): void {
    if (this.map) {
      try {
        this.map.remove();
      } catch {}
    }

    this.map = L.map('map', {
      minZoom: 3
    }).setView([center[0], center[1]], 6);

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
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  async buildRoute(): Promise<void> {
    const router = (L.Routing as any).osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' });

    this.itenerary = L.Routing.control({
      show: false,
      addWaypoints: false,
      waypoints: [
        L.latLng(this.starting_location_coordinates[0], this.starting_location_coordinates[1]),
        L.latLng(this.destination_coordinates[0], this.destination_coordinates[1])
      ],
      routeWhileDragging: false,
      fitSelectedRoutes: false,
      router: router
    }).addTo(this.map);

    return new Promise<void>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('Routing timed out after 10s');
          this.api_error_occurence = true;
          resolve();
        }
      }, 10000);

      this.itenerary.on('routesfound', (e: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        const routes = e.routes;
        if (routes && routes.length > 0) {
          const route = routes[0];
          const bounds = L.latLngBounds(route.coordinates);

          let paddingRight = 0;
          if (window.innerWidth > 600 && this.weather_info_is_open) {
            paddingRight = 350;
          }

          this.map.fitBounds(bounds, {
            paddingTopLeft: [50, 50],
            paddingBottomRight: [50 + paddingRight, 50]
          });
        }
        resolve();
      });

      this.itenerary.on('routingerror', (err: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.warn('Routing error:', err);
        this.api_error_occurence = true;
        resolve();
      });
    });
  }

  // Fast, parallel weather extraction along waypoints with zero secondary routing API calls
  async getTravelInformations(): Promise<void> {
    const route = this.itenerary?._selectedRoute;
    if (!route || !route.coordinates || route.coordinates.length === 0) return;

    const totalDistance = route.summary?.totalDistance || 0;
    const totalDuration = route.summary?.totalTime || 0;

    const waypoints = this.locationsService.getRouteWaypointsWithTiming(
      route.coordinates,
      totalDistance,
      totalDuration
    );

    this.weatherList = [];

    // Fetch weather forecasts with respectful geocoding staggering
    const promises = waypoints.map(async (wp, idx) => {
      let fallbackName: string | undefined;
      if (idx === 0) {
        fallbackName = this.starting_location.split(',')[0].trim();
      } else if (idx === waypoints.length - 1) {
        fallbackName = this.destination.split(',')[0].trim();
      }

      // Stagger intermediate waypoints (600ms) to respect OpenStreetMap rate limits and prevent 429 errors
      if (idx > 0 && idx < waypoints.length - 1) {
        await new Promise(resolve => setTimeout(resolve, idx * 600));
      }

      const response = await this.weatherService.getCitiesWeatherAndTimeInformations(
        wp.coordinates,
        this.starting_location_coordinates,
        this.date_formated,
        wp.estimatedDrivingTime,
        fallbackName
      );

      return {
        index: idx,
        response: response
      };
    });

    const results = await Promise.all(promises);
    results.sort((a, b) => a.index - b.index);

    for (const item of results) {
      const response = item.response;
      if (!response || response[0] === 'api_error') {
        continue;
      }

      const weatherInfo: WeatherInfo = {
        temperature: Number(response[0]),
        weatherCode: String(response[2]),
        weatherDescription: response[3] || 'Clear',
        estimatedArrival: response[4] || this.date_formated,
        forecastDate: response[5] || this.date_formated
      };

      let locationName = response[1];
      if (!locationName || locationName === 'Route Point') {
        if (item.index === 0) {
          locationName = this.starting_location.split(',')[0].trim();
        } else if (item.index === results.length - 1) {
          locationName = this.destination.split(',')[0].trim();
        } else {
          locationName = `Waypoint ${item.index + 1}`;
        }
      }

      const icon = this.utilsService.getWeatherIconFromWeatherID(Number(weatherInfo.weatherCode));
      this.weatherList.push({ location: locationName, weather: weatherInfo, icon: icon });
    }

    // Generate weather summary
    this.generateSummary();
  }

  async generateSummary(): Promise<void> {
    this.isGeneratingSummary = true;
    this.weatherSummary = await this.groqService.generateWeatherSummary(
      this.starting_location,
      this.destination,
      this.date_formated,
      this.weatherList
    );
    this.isAiSummary = this.groqService.isLastSummaryAi;
    this.isGeneratingSummary = false;
  }

  downloadPDF(): void {
    if (this.is_loading) {
      this.snackBar.open("Please wait, the route is being calculated.", "Close", { duration: 3000 });
      return;
    }

    if (!this.has_data || this.api_error_occurence) {
      this.snackBar.open("No data available.", "Close", { duration: 3000 });
      return;
    }

    this.pdfService.downloadRouteReport(
      this.starting_location,
      this.destination,
      this.date_formated,
      this.weatherList,
      this.weatherSummary
    );
  }

  toggleWeatherInfoSidebar(): void {
    this.weather_info_is_open = !this.weather_info_is_open;
    if (this.weatherInfoSidebar) {
      this.weatherInfoSidebar.nativeElement.style.transform = '';
    }
  }

  onTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const isHeader = target.closest('#weather-info-container-title');
    if (!isHeader) return;

    this.touchStartY = event.touches[0].clientY;
    this.currentTouchY = this.touchStartY;
    this.isDragging = true;
    this.weatherInfoSidebar.nativeElement.style.transition = 'none';
    this.sheetHeight = this.weatherInfoSidebar.nativeElement.offsetHeight;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;

    this.currentTouchY = event.touches[0].clientY;
    const deltaY = this.currentTouchY - this.touchStartY;
    const currentTranslateY = this.weather_info_is_open ? 0 : (this.sheetHeight - this.PEEK_HEIGHT);
    let newTranslateY = currentTranslateY + deltaY;

    const maxTranslateY = this.sheetHeight - this.PEEK_HEIGHT;
    const minTranslateY = 0;

    if (newTranslateY < minTranslateY) newTranslateY = minTranslateY;
    if (newTranslateY > maxTranslateY) newTranslateY = maxTranslateY;

    this.weatherInfoSidebar.nativeElement.style.transform = `translateY(${newTranslateY}px)`;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.weatherInfoSidebar.nativeElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

    const deltaY = this.currentTouchY - this.touchStartY;
    const peekTranslate = this.sheetHeight - this.PEEK_HEIGHT;

    if (this.weather_info_is_open) {
      if (deltaY > this.DRAG_THRESHOLD) {
        this.weather_info_is_open = false;
        this.weatherInfoSidebar.nativeElement.style.transform = `translateY(${peekTranslate}px)`;
      } else {
        this.weatherInfoSidebar.nativeElement.style.transform = '';
      }
    } else {
      if (deltaY < -this.DRAG_THRESHOLD) {
        this.weather_info_is_open = true;
        this.weatherInfoSidebar.nativeElement.style.transform = '';
      } else {
        this.weatherInfoSidebar.nativeElement.style.transform = `translateY(${peekTranslate}px)`;
      }
    }
  }
}
