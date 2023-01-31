import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomePageComponent } from './views/home-page/home-page.component';
import { ViewRouteComponent } from './views/view-route/view-route.component';

const routes: Routes = [
  {
    path: '', 
    component: HomePageComponent
  },
  {
    path: 'view-route', 
    component: ViewRouteComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
