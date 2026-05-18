import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";
/** Default provider is Apple MapKit — no Google Maps API key on iOS. */
import MapView, { Polyline } from "react-native-maps";
import {
  ACTIVITY_MAP_RECENTER_DURATION_MS,
  ACTIVITY_MAP_ROUTE_FIT_PADDING,
  ACTIVITY_ROUTE_STROKE_COLOR,
  type ActivityMapProps,
  type ActivityMapRef,
} from "./types";

export const ActivityMap = forwardRef<ActivityMapRef, ActivityMapProps>(function ActivityMap(
  {
    style,
    route,
    initialRegion,
    showUserLocation = false,
    routeStrokeWidth = 6,
    scrollEnabled = true,
    zoomEnabled = true,
    rotateEnabled = true,
    pitchEnabled = true,
    pointerEvents,
    fitRoute = false,
    onRegionChange,
  },
  ref
) {
  const mapRef = useRef<MapView | null>(null);
  const shouldFitRoute = fitRoute && route.length >= 2;

  useEffect(() => {
    if (!shouldFitRoute) return;
    mapRef.current?.fitToCoordinates(route, {
      edgePadding: {
        top: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        right: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        bottom: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        left: ACTIVITY_MAP_ROUTE_FIT_PADDING,
      },
      animated: false,
    });
  }, [route, shouldFitRoute]);

  useImperativeHandle(ref, () => ({
    recenter: ({ latitude, longitude, latitudeDelta, longitudeDelta }) => {
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: latitudeDelta ?? initialRegion.latitudeDelta,
          longitudeDelta: longitudeDelta ?? initialRegion.longitudeDelta,
        },
        ACTIVITY_MAP_RECENTER_DURATION_MS
      );
    },
  }));

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      pointerEvents={pointerEvents}
      initialRegion={initialRegion}
      showsUserLocation={showUserLocation}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      rotateEnabled={rotateEnabled}
      pitchEnabled={pitchEnabled}
      onRegionChangeComplete={(region) => onRegionChange?.(region)}
    >
      {route.length >= 2 && (
        <Polyline
          coordinates={route}
          strokeColor={ACTIVITY_ROUTE_STROKE_COLOR}
          strokeWidth={routeStrokeWidth}
        />
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
