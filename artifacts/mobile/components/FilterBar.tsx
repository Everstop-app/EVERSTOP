import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { FilterState } from "@/contexts/LocationsContext";

interface FilterConfig {
  key: keyof FilterState;
  label: string;
  icon: string;
  iconSet: "ionicons" | "material";
}

const FILTERS: FilterConfig[] = [
  { key: "overnightParking", label: "Overnight", icon: "moon", iconSet: "ionicons" },
  { key: "truckEntrance", label: "Truck Entrance", icon: "truck", iconSet: "material" },
  { key: "easyBacking", label: "Easy Backing", icon: "navigate", iconSet: "ionicons" },
  { key: "open24Hours", label: "24 Hours", icon: "time", iconSet: "ionicons" },
  { key: "scaleAvailable", label: "Scale", icon: "scale-balance", iconSet: "material" },
  { key: "restroomsAvailable", label: "Restrooms", icon: "water", iconSet: "ionicons" },
  { key: "highRating", label: "High Rated", icon: "star", iconSet: "ionicons" },
];

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const colors = useColors();
  const activeCount = Object.values(filters).filter(Boolean).length;

  const toggle = (key: keyof FilterState) => {
    onChange({ ...filters, [key]: !filters[key] });
  };

  const clearAll = () => {
    onChange({
      overnightParking: false,
      truckEntrance: false,
      easyBacking: false,
      difficultBacking: false,
      open24Hours: false,
      restroomsAvailable: false,
      scaleAvailable: false,
      highRating: false,
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {activeCount > 0 && (
        <TouchableOpacity
          onPress={clearAll}
          style={[styles.chip, styles.clearChip, { borderColor: colors.destructive }]}
        >
          <Ionicons name="close-circle" size={13} color={colors.destructive} />
          <Text style={[styles.chipText, { color: colors.destructive }]}>Clear</Text>
        </TouchableOpacity>
      )}
      {FILTERS.map((f) => {
        const active = filters[f.key];
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => toggle(f.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.75}
          >
            <View style={styles.chipIcon}>
              {f.iconSet === "ionicons" ? (
                <Ionicons
                  name={f.icon as any}
                  size={13}
                  color={active ? "#fff" : colors.mutedForeground}
                />
              ) : (
                <MaterialCommunityIcons
                  name={f.icon as any}
                  size={13}
                  color={active ? "#fff" : colors.mutedForeground}
                />
              )}
            </View>
            <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearChip: {
    backgroundColor: "transparent",
  },
  chipIcon: { alignItems: "center" },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
