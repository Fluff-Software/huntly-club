import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
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
const USER_LOCATION_SOURCE_ID = "activity-user-location-source";
const USER_LOCATION_PULSE_LAYER_ID = "activity-user-location-pulse-layer";
const USER_LOCATION_DOT_LAYER_ID = "activity-user-location-dot-layer";
const USER_LOCATION_COLOR = "#1E88F0";
/**
 * ViewAnnotation bakes its children onto a static bitmap on Android (see the
 * library's own docs), so a Reanimated loop inside one never animates there.
 * A real circle layer with paint transitions is the only way to get a
 * continuously pulsing dot on Android.
 */
const USER_LOCATION_PULSE_MS = 1600;
// Fallback when MapTiler API key isn't configured (keeps the Android map looking polished).
const DEV_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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

  const userPointGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    if (!userMarker) return { type: "FeatureCollection", features: [] };
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [userMarker.longitude, userMarker.latitude],
          },
        },
      ],
    };
  }, [userMarker]);

  // Toggle target radius/opacity on an interval; the paint transitions below
  // let the native layer smoothly animate between the two states.
  const [pulseOn, setPulseOn] = useState(false);
  useEffect(() => {
    if (!userMarker) return;
    const interval = setInterval(() => {
      setPulseOn((v) => !v);
    }, USER_LOCATION_PULSE_MS);
    return () => clearInterval(interval);
  }, [userMarker != null]);

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
          <ViewAnnotation
            key={`${marker.id}-${marker.icon ?? "pin"}`}
            id={marker.id}
            lngLat={[marker.longitude, marker.latitude]}
            anchor="center"
            onSelect={() => onMarkerPress?.(marker.id)}
          >
            <ActivityMapStopMarkerView
              color={marker.color ?? "#1f9d55"}
              icon={marker.icon ?? "pin"}
            />
          </ViewAnnotation>
        ))}
        {userMarker ? (
          <GeoJSONSource id={USER_LOCATION_SOURCE_ID} data={userPointGeoJson}>
            <Layer
              id={USER_LOCATION_PULSE_LAYER_ID}
              type="circle"
              source={USER_LOCATION_SOURCE_ID}
              paint={{
                "circle-radius": pulseOn ? 32 : 4,
                "circle-opacity": pulseOn ? 0 : 0.45,
                "circle-color": USER_LOCATION_COLOR,
                "circle-radius-transition": { duration: USER_LOCATION_PULSE_MS },
                "circle-opacity-transition": { duration: USER_LOCATION_PULSE_MS },
              }}
            />
            <Layer
              id={USER_LOCATION_DOT_LAYER_ID}
              type="circle"
              source={USER_LOCATION_SOURCE_ID}
              paint={{
                "circle-radius": 9,
                "circle-color": USER_LOCATION_COLOR,
                "circle-stroke-width": 3,
                "circle-stroke-color": "#FFFFFF",
              }}
            />
          </GeoJSONSource>
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
