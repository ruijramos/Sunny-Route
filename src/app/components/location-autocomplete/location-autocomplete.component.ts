import { Component, EventEmitter, Input, Output, OnDestroy, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

export interface LocationFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    name: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    formatted?: string;
  };
}

@Component({
  selector: 'app-location-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './location-autocomplete.component.html',
  styleUrls: ['./location-autocomplete.component.css']
})
export class LocationAutocompleteComponent implements OnDestroy {
  @Input() id: string = '';
  @Input() placeholder: string = 'Search location...';
  @Input() name: string = '';
  @Input() required: boolean = false;

  @Output() placeSelect = new EventEmitter<any>();

  public searchQuery: string = '';
  public suggestions: LocationFeature[] = [];
  public isOpen: boolean = false;
  public isLoading: boolean = false;
  public selectedIndex: number = -1;

  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription;
  private http = inject(HttpClient);
  private elementRef = inject(ElementRef);

  constructor() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!term || term.trim().length < 2) {
          this.isLoading = false;
          return of([]);
        }
        this.isLoading = true;
        const cleanTerm = encodeURIComponent(term.trim());

        // 1. Primary: Fast, reliable, keyless Open-Meteo Geocoding API
        const openMeteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${cleanTerm}&count=6&language=en&format=json`;
        return this.http.get<{ results?: any[] }>(openMeteoUrl).pipe(
          map(response => {
            if (response && response.results && response.results.length > 0) {
              return response.results.map(item => ({
                geometry: {
                  coordinates: [item.longitude, item.latitude] as [number, number]
                },
                properties: {
                  name: item.name,
                  city: item.name,
                  state: item.admin1 || item.admin2 || '',
                  country: item.country || ''
                }
              }));
            }
            return [];
          }),
          // 2. Fallback: OpenStreetMap Nominatim
          catchError(() => {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${cleanTerm}&limit=5`;
            return this.http.get<any[]>(nominatimUrl).pipe(
              map(items => {
                if (!items || !Array.isArray(items)) return [];
                return items.map(item => ({
                  geometry: {
                    coordinates: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number]
                  },
                  properties: {
                    name: item.display_name.split(',')[0],
                    city: item.address?.city || item.address?.town || '',
                    state: item.address?.state || '',
                    country: item.address?.country || ''
                  }
                }));
              }),
              catchError(() => of([]))
            );
          })
        );
      })
    ).subscribe((features) => {
      this.isLoading = false;
      this.suggestions = features || [];
      this.isOpen = this.suggestions.length > 0;
      this.selectedIndex = -1;
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  onFocus(): void {
    if (this.suggestions.length > 0) {
      this.isOpen = true;
    }
  }

  selectPlace(feature: LocationFeature): void {
    const name = feature.properties.name || '';
    const details = [
      feature.properties.state,
      feature.properties.country
    ].filter(item => Boolean(item) && item !== name).join(', ');

    const formatted = details ? `${name}, ${details}` : name;
    this.searchQuery = formatted;
    this.isOpen = false;
    this.suggestions = [];

    const payload = {
      properties: {
        formatted: formatted,
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        name: name,
        city: feature.properties.city,
        country: feature.properties.country
      }
    };

    this.placeSelect.emit(payload);
  }

  clear(): void {
    this.searchQuery = '';
    this.suggestions = [];
    this.isOpen = false;
    this.placeSelect.emit(null);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen || this.suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.suggestions.length) % this.suggestions.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
        this.selectPlace(this.suggestions[this.selectedIndex]);
      } else if (this.suggestions.length > 0) {
        this.selectPlace(this.suggestions[0]);
      }
    } else if (event.key === 'Escape') {
      this.isOpen = false;
    }
  }

  formatDetails(feature: LocationFeature): string {
    const name = feature.properties.name || '';
    return [
      feature.properties.state,
      feature.properties.country
    ].filter(item => Boolean(item) && item !== name).join(', ');
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
