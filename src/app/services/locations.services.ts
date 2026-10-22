import { Injectable, inject } from '@angular/core';
import { utilsService } from './utils.services';

export interface RouteWaypointInfo {
  coordinates: [number, number]; // [lat, lng]
  cumulativeDistance: number;    // meters
  estimatedDrivingTime: number;  // seconds from departure
}

@Injectable({
  providedIn: 'root'
})
export class locationsService {
  private utilsService = inject(utilsService);

  // Extract location coordinates that route passes by
  async getRouteLocationsCoordinates(coordinates: any[]): Promise<any[]> {
    if (!coordinates || coordinates.length === 0) return [];

    const locations: any[] = [];
    let accumulated_distance = 0;
    let last_coordinate = coordinates[0];
    const sampling_distance = 25000; // 25km

    // Always add the first point
    locations.push([coordinates[0].lat, coordinates[0].lng]);

    for (let i = 1; i < coordinates.length; i++) {
      const current_coordinate = coordinates[i];
      const distance = this.utilsService.getDistanceFromLatLonInM(
        last_coordinate.lat, last_coordinate.lng,
        current_coordinate.lat, current_coordinate.lng
      );

      accumulated_distance += distance;
      last_coordinate = current_coordinate;

      if (accumulated_distance >= sampling_distance) {
        locations.push([current_coordinate.lat, current_coordinate.lng]);
        accumulated_distance = 0;
      }
    }

    // Always add the last point if it's not identical to the first
    const lastCoord = coordinates[coordinates.length - 1];
    locations.push([lastCoord.lat, lastCoord.lng]);

    return locations;
  }

  // Extract waypoints with mathematically interpolated arrival timing (Zero API calls)
  getRouteWaypointsWithTiming(
    coordinates: any[],
    totalDistanceMeters: number,
    totalDurationSeconds: number
  ): RouteWaypointInfo[] {
    if (!coordinates || coordinates.length === 0) return [];

    const waypoints: RouteWaypointInfo[] = [];
    const totalDist = totalDistanceMeters > 0 ? totalDistanceMeters : 1;

    // Dynamically target between 3 and 16 total checkpoints based on trip scale
    let targetWaypoints = 8;
    if (totalDist < 60000) {
      targetWaypoints = 3;       // Short trips (< 60 km): 3 checkpoints
    } else if (totalDist < 150000) {
      targetWaypoints = 5;       // ~100 km trips: 5 checkpoints
    } else if (totalDist < 400000) {
      targetWaypoints = 8;       // 200-400 km trips: 8 checkpoints
    } else if (totalDist < 800000) {
      targetWaypoints = 11;      // 400-800 km trips: 11 checkpoints
    } else if (totalDist < 1500000) {
      targetWaypoints = 14;      // 800-1500 km trips: 14 checkpoints
    } else {
      targetWaypoints = 16;      // Long/continental trips (> 1500 km): 16 checkpoints
    }

    const intervalDistance = totalDist / (targetWaypoints - 1);

    // First waypoint (departure)
    waypoints.push({
      coordinates: [coordinates[0].lat, coordinates[0].lng],
      cumulativeDistance: 0,
      estimatedDrivingTime: 0
    });

    let currentCumulativeDistance = 0;
    let accumulatedSinceLastSample = 0;
    let lastCoord = coordinates[0];

    for (let i = 1; i < coordinates.length - 1; i++) {
      const coord = coordinates[i];
      const segmentDistance = this.utilsService.getDistanceFromLatLonInM(
        lastCoord.lat, lastCoord.lng,
        coord.lat, coord.lng
      );

      currentCumulativeDistance += segmentDistance;
      accumulatedSinceLastSample += segmentDistance;
      lastCoord = coord;

      if (accumulatedSinceLastSample >= intervalDistance && waypoints.length < targetWaypoints - 1) {
        const progress = Math.min(1, currentCumulativeDistance / totalDist);
        waypoints.push({
          coordinates: [coord.lat, coord.lng],
          cumulativeDistance: currentCumulativeDistance,
          estimatedDrivingTime: Math.round(progress * totalDurationSeconds)
        });
        accumulatedSinceLastSample = 0;
      }
    }

    // Last waypoint (destination)
    const endCoord = coordinates[coordinates.length - 1];
    waypoints.push({
      coordinates: [endCoord.lat, endCoord.lng],
      cumulativeDistance: totalDistanceMeters,
      estimatedDrivingTime: totalDurationSeconds
    });

    return waypoints;
  }
}
