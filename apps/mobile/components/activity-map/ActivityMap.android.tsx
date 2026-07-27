import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  PointAnnotation,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { getMapTilerMapStyleUrl } from "@/constants/maptiler";
import { ActivityMapStopMarkerView } from "./ActivityMapStopMarkerView";
import {
  buildInitialViewState,
  buildRecenterCameraStop,
  viewStateToActivityRegion,
} from "./mapCamera";
import { latitudeDeltaToZoom, routeToLngLatBounds } from "./region";
import {
  ACTIVITY_MAP_RECENTER_DURATION_MS,
  ACTIVITY_MAP_ROUTE_FIT_PADDING,
  ACTIVITY_ROUTE_STROKE_COLOR,
  type ActivityMapProps,
  type ActivityMapRef,
} from "./types";
import { useDeferredNativeMount } from "./useDeferredNativeMount";

const ROUTE_SOURCE_ID = "activity-route-source";
const ROUTE_LAYER_ID = "activity-route-layer";
const DEV_MAP_STYLE = "https://demotiles.maplibre.org/style.json";

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
  const cameraRef = useRef<CameraRef | null>(null);
  const canMountNative = useDeferredNativeMount();
  const zoomRef = useRef(
    latitudeDeltaToZoom(initialRegion.latitudeDelta, initialRegion.latitude)
  );

  const mapStyle = getMapTilerMapStyleUrl() ?? DEV_MAP_STYLE;
  const shouldFitRoute = fitRoute && route.length >= 2;

  const stopMarkers = useMemo(
    () => (markers ?? []).filter((m) => m.variant !== "user"),
    [markers]
  );
  const userMarker = useMemo(
    () => (markers ?? []).find((m) => m.variant === "user") ?? null,
    [markers]
  );

  const routeGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    if (route.length < 2) {
      return { type: "FeatureCollection", features: [] };
    }
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.map((p) => [p.longitude, p.latitude]),
          },
        },
      ],
    };
  }, [route]);

  const initialCamera = useMemo(
    () => buildInitialViewState(initialRegion, route, shouldFitRoute),
    [initialRegion, route, shouldFitRoute]
  );

  useEffect(() => {
    if (!canMountNative || !shouldFitRoute) return;
    const bounds = routeToLngLatBounds(route);
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      padding: {
        top: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        right: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        bottom: ACTIVITY_MAP_ROUTE_FIT_PADDING,
        left: ACTIVITY_MAP_ROUTE_FIT_PADDING,
      },
      bearing: 0,
      pitch: 0,
      duration: 0,
    });
  }, [canMountNative, route, shouldFitRoute]);

  useImperativeHandle(ref, () => ({
    recenter: ({ latitude, longitude, latitudeDelta, longitudeDelta }) => {
      const stop = buildRecenterCameraStop(
        { latitude, longitude, latitudeDelta, longitudeDelta },
        zoomRef.current
      );
      cameraRef.current?.easeTo({
        ...stop,
        duration: ACTIVITY_MAP_RECENTER_DURATION_MS,
      });
    },
  }));

  if (!canMountNative) {
    return <View style={[styles.container, style]} pointerEvents={pointerEvents} />;
  }

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <Map
        style={styles.map}
        mapStyle={mapStyle}
        dragPan={scrollEnabled}
        touchZoom={zoomEnabled}
        doubleTapZoom={zoomEnabled}
        doubleTapHoldZoom={zoomEnabled}
        touchRotate={rotateEnabled}
        touchPitch={pitchEnabled}
        attribution
        logo={false}
        onRegionDidChange={(event) => {
          const { center, zoom, bounds } = event.nativeEvent;
          zoomRef.current = zoom;
          onRegionChange?.(viewStateToActivityRegion(center, zoom, bounds));
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={initialCamera}
          minZoom={minZoomLevel}
          maxZoom={maxZoomLevel}
        />
        {showUserLocation ? <UserLocation animated /> : null}
        {route.length >= 2 ? (
          <GeoJSONSource id={ROUTE_SOURCE_ID} data={routeGeoJson}>
            <Layer
              id={ROUTE_LAYER_ID}
              type="line"
              source={ROUTE_SOURCE_ID}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": ACTIVITY_ROUTE_STROKE_COLOR,
                "line-width": routeStrokeWidth,
              }}
            />
          </GeoJSONSource>
        ) : null}
        {stopMarkers.map((marker) => (
          <PointAnnotation
            key={`${marker.id}-${marker.icon ?? "pin"}`}
            id={marker.id}
            coordinate={[marker.longitude, marker.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            title={marker.title}
            onSelected={() => onMarkerPress?.(marker.id)}
          >
            <ActivityMapStopMarkerView
              color={marker.color ?? "#1f9d55"}
              icon={marker.icon ?? "pin"}
            />
          </PointAnnotation>
        ))}
        {userMarker ? (
          <PointAnnotation
            id={userMarker.id}
            coordinate={[userMarker.longitude, userMarker.latitude]}
            anchor={{ x: 0.5, y: 1 }}
            title={userMarker.title ?? "You"}
          >
            <MaterialIcons name="location-on" size={40} color="#E03131" />
          </PointAnnotation>
        ) : null}
      </Map>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    flex: 1,
  },
});
