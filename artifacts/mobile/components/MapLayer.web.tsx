import React from "react";
import { View } from "react-native";

export type MapLayerProps = {
  style?: object;
};

export function MapLayer({ style }: MapLayerProps) {
  return <View style={style} />;
}
