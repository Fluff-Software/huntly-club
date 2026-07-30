import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
/** Default provider is Apple MapKit — no Google Maps API key on iOS. */
import MapView, { Marker, Polyline } from "react-native-maps";
import { ActivityMapStopMarkerView } from "./ActivityMapStopMarkerView";
import {
  ACTIVITY_MAP_RECENTER_DURATION_MS,
  ACTIVITY_MAP_ROUTE_FIT_PADDING,
  ACTIVITY_ROUTE_STROKE_COLOR,
  type ActivityMapProps,
  type ActivityMapRef,
} from "./types";
import { useDeferredNativeMount } from "./useDeferredNativeMount";

/**
 * Stop markers use a plain View + Text bubble (no MaterialIcons children).
 * Custom vector-icon views previously deadlocked New Architecture on background.
 */
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
    minZoomLevel,
    maxZoomLevel,
    onRegionChange,
    markers,
    onMarkerPress,
  },
  ref
) {
  const mapRef = useRef<MapView | null>(null);
  const canMountNative = useDeferredNativeMount();
  const shouldFitRoute = fitRoute && route.length >= 2;

  useEffect(() => {
    if (!canMountNative || !shouldFitRoute) return;
    mapRef.current?.fitToCoordinates(route, {
      edgePadding: {
        top: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        right: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        bottom: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        left: ACTIVITY_MAP_ROUTE_FIT_PADDING,
      },
      animated: false,
    });
  }, [canMountNative, route, shouldFitRoute]);

  useImperativeHandle(
    ref,
    () => ({
      recenter: ({ latitude, longitude, latitudeDelta, longitudeDelta }) => {
        // Use mapRef only — do not close over canMountNative (it starts false and
        // would permanently no-op recenter if captured without deps).
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
    }),
    [initialRegion.latitudeDelta, initialRegion.longitudeDelta]
  );

  if (!canMountNative) {
    return <View style={[styles.map, style]} pointerEvents={pointerEvents} />;
  }

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
      minZoomLevel={minZoomLevel}
      maxZoomLevel={maxZoomLevel}
      onRegionChangeComplete={(region) => onRegionChange?.(region)}
    >
      {route.length >= 2 && (
        <Polyline
          coordinates={route}
          strokeColor={ACTIVITY_ROUTE_STROKE_COLOR}
          strokeWidth={routeStrokeWidth}
        />
      )}
      {(markers ?? []).map((marker) => {
        if (marker.variant === "user") {
          return (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              title={marker.title ?? "You"}
              pinColor="#E03131"
              zIndex={1000}
              tracksViewChanges={false}
              onPress={() => onMarkerPress?.(marker.id)}
            />
          );
        }

        const color = marker.color ?? "#1f9d55";
        const icon = marker.icon ?? "pin";

        return (
          <Marker
            key={`${marker.id}-${icon}-${color}`}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={1}
            tracksViewChanges={false}
            onPress={() => onMarkerPress?.(marker.id)}
          >
            <ActivityMapStopMarkerView color={color} icon={icon} />
          </Marker>
        );
      })}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
