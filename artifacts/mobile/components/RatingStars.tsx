import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface RatingStarsProps {
  rating: number;
  ratingCount?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function RatingStars({ rating, ratingCount, size = 14, interactive = false, onRate }: RatingStarsProps) {
  const colors = useColors();
  const [hovered, setHovered] = React.useState(0);

  const displayRating = hovered > 0 ? hovered : rating;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayRating >= star;
        const half = !filled && displayRating >= star - 0.5;
        return (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => onRate?.(star)}
            onPressIn={() => interactive && setHovered(star)}
            onPressOut={() => interactive && setHovered(0)}
            style={{ padding: interactive ? 3 : 1 }}
            activeOpacity={interactive ? 0.7 : 1}
          >
            <Ionicons
              name={filled ? "star" : half ? "star-half" : "star-outline"}
              size={size}
              color={filled || half ? "#F59E0B" : colors.mutedForeground}
            />
          </TouchableOpacity>
        );
      })}
      {ratingCount !== undefined && (
        <Text style={[styles.count, { color: colors.mutedForeground, fontSize: size - 2 }]}>
          {rating.toFixed(1)} ({ratingCount})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  count: {
    marginLeft: 4,
    fontFamily: "Inter_400Regular",
  },
});
