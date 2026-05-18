import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type CameraRef,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native";
import { getMapTilerMapStyleUrl } from "@/constants/maptiler";
import { latitudeDeltaToZoom, zoomToLatitudeDelta } from "./region";
import {
  ACTIVITY_MAP_RECENTER_DURATION_MS,
  ACTIVITY_ROUTE_STROKE_COLOR,
  type ActivityMapProps,
  type ActivityMapRef,
  type ActivityMapRegion,
} from "./types";

const ROUTE_SOURCE_ID = "activity-route-source";
const ROUTE_LAYER_ID = "activity-route-layer";
const DEV_MAP_STYLE = "https://demotiles.maplibre.org/style.json";

function viewStateToRegion(event: ViewStateChangeEvent): ActivityMapRegion {
  const latitudeDelta = zoomToLatitudeDelta(event.zoom);
  return {
    latitude: event.center[1],
    longitude: event.center[0],
    latitudeDelta,
    longitudeDelta: latitudeDelta,
  };
}

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
    onRegionChange,
  },
  ref
) {
  const cameraRef = useRef<CameraRef | null>(null);
  const zoomRef = useRef(latitudeDeltaToZoom(initialRegion.latitudeDelta));

  const mapStyle = getMapTilerMapStyleUrl() ?? DEV_MAP_STYLE;

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
    () => ({
      center: [initialRegion.longitude, initialRegion.latitude] as [number, number],
      zoom: latitudeDeltaToZoom(initialRegion.latitudeDelta),
      bearing: 0,
      pitch: 0,
    }),
    [
      initialRegion.latitude,
      initialRegion.latitudeDelta,
      initialRegion.longitude,
    ]
  );

  useImperativeHandle(ref, () => ({
    recenter: ({ latitude, longitude, latitudeDelta, longitudeDelta }) => {
      const delta = latitudeDelta ?? longitudeDelta ?? zoomToLatitudeDelta(zoomRef.current);
      const zoom = latitudeDeltaToZoom(delta);
      cameraRef.current?.easeTo({
        center: [longitude, latitude],
        zoom,
        bearing: 0,
        pitch: 0,
        duration: ACTIVITY_MAP_RECENTER_DURATION_MS,
      });
    },
  }));

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
          zoomRef.current = event.nativeEvent.zoom;
          onRegionChange?.(viewStateToRegion(event.nativeEvent));
        }}
      >
        <Camera ref={cameraRef} initialViewState={initialCamera} />
        {showUserLocation ? <UserLocation /> : null}
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
