import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./views/home-page/home-page.component').then(m => m.HomePageComponent)
  },
  {
    path: 'view-route',
    loadComponent: () => import('./views/view-route/view-route.component').then(m => m.ViewRouteComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
