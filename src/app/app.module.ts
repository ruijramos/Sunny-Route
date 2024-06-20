import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ViewRouteComponent } from './views/view-route/view-route.component';
import { MatIconModule } from '@angular/material/icon';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomePageComponent } from './views/home-page/home-page.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GeoapifyGeocoderAutocompleteModule } from '@geoapify/angular-geocoder-autocomplete';
import { environment } from 'src/app/environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    ViewRouteComponent,
    HomePageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    BrowserAnimationsModule,
    GeoapifyGeocoderAutocompleteModule.withConfig(environment.geoapify_geocoder_autocomplete_key)
  ],
  providers: [],
  bootstrap: [AppComponent]
})

export class AppModule { 

}
