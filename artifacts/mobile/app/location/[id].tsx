import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocations, AccessPointType } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_GRID_SIZE = (SCREEN_WIDTH - 32 - 28) / 3;

const CATEGORY_COLORS: Record<string, string> = {
  "Dry Van":           "#D22F30",
  "Reefer":            "#3B82F6",
  "Flatbed":           "#F59E0B",
  "Bulk/Tanker":       "#22C55E",
  "Food & Beverage":   "#8B5CF6",
  "Containers":        "#06B6D4",
  "Freight / Courier": "#8B5CF6",
};

const ACCESS_POINT_CONFIG: Record<AccessPointType, { icon: string; color: string; label: string; set: "ionicons" | "material" }> = {
  entrance: { icon: "enter",         color: "#4A9EE0", label: "Entrance",  set: "ionicons" },
  dock:     { icon: "business",      color: "#F59E0B", label: "Dock",      set: "ionicons" },
  parking:  { icon: "car",           color: "#22C55E", label: "Parking",   set: "ionicons" },
  scale:    { icon: "scale-balance", color: "#8B5CF6", label: "Scale",     set: "material" },
  office:   { icon: "clipboard",     color: "#06B6D4", label: "Office",    set: "ionicons" },
  fuel:     { icon: "flame",         color: "#EF4444", label: "Fuel",      set: "ionicons" },
};

export default function LocationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getLocation, upvoteLocation, reportLocation, addComment, addPhotosToLocation } = useLocations();
  const { user, toggleFavorite, addPoints } = useAuth();

  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [commentPhotos, setCommentPhotos] = useState<string[]>([]);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [allPhotos, setAllPhotosSource] = useState<{ uri: string; label: string }[]>([]);

  const location = getLocation(id ?? "");
  const isFav = user?.favoriteLocations.includes(id ?? "") ?? false;

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.foreground }]}>Location not found</Text>
        </View>
      </View>
    );
  }

  const onFav = () => {
    if (!user) { router.push("/auth"); return; }
    toggleFavorite(location.id);
  };

  const onCallPhone = () => {
    if (location.contactPhone) {
      Linking.openURL(`tel:${location.contactPhone.replace(/\D/g, "")}`);
    }
  };

  const onNavigate = () => {
    const url = Platform.OS === "ios"
      ? `maps://maps.apple.com/?daddr=${location.latitude},${location.longitude}`
      : `https://maps.google.com/?daddr=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  const onUpvote = () => {
    if (!user) { router.push("/auth"); return; }
    if (hasUpvoted) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    upvoteLocation(location.id);
    setHasUpvoted(true);
  };

  const onReport = () => {
    if (!user) { router.push("/auth"); return; }
    if (hasReported) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Report Outdated Info",
      "What's inaccurate about this location?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hours Changed",
          onPress: () => { reportLocation(location.id); setHasReported(true); },
        },
        {
          text: "Entrance Changed",
          onPress: () => { reportLocation(location.id); setHasReported(true); },
        },
        {
          text: "Location Closed",
          onPress: () => { reportLocation(location.id); setHasReported(true); },
        },
        {
          text: "Other",
          onPress: () => { reportLocation(location.id); setHasReported(true); },
        },
      ],
    );
  };

  const isTrusted = location.verificationScore >= 90 && (location.upvotes ?? 0) >= 40;
  const isBusinessVerified = !!(location.isClaimed && location.claimedByBusiness?.verified);
  const isDriverVerified = !isBusinessVerified && location.verificationScore >= 95 && (location.upvotes ?? 0) >= 60;
  const canClaim = !location.isClaimed && (user?.subscriptionTier === "business" || user?.accountType === "customer");
  const catColor = location.categoryColor ?? CATEGORY_COLORS[location.category] ?? colors.primary;

  const communityPhotos: { uri: string; label: string }[] = [
    ...(location.photos ?? []).map((uri) => ({ uri, label: "Location" })),
    ...location.comments.flatMap((c) =>
      (c.photos ?? []).map((uri) => ({ uri, label: c.userName }))
    ),
  ];

  const onAddPhotosToLocation = async () => {
    if (!user) { router.push("/auth"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addPhotosToLocation(location.id, result.assets.map((a) => a.uri));
      addPoints(10);
    }
  };

  const onTakePhotoForLocation = async () => {
    if (!user) { router.push("/auth"); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addPhotosToLocation(location.id, [result.assets[0].uri]);
      addPoints(10);
    }
  };

  const onSubmitComment = () => {
    if (!user) { router.push("/auth"); return; }
    if (!commentText.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addComment(location.id, {
      userId: user.id,
      userName: user.name,
      text: commentText.trim(),
      rating: commentRating,
      photos: commentPhotos.length > 0 ? commentPhotos : undefined,
    });
    setCommentText("");
    setCommentPhotos([]);
    setShowCommentBox(false);
  };

  const openLightbox = (uri: string, index: number) => {
    setLightboxUri(uri);
    setLightboxIndex(index);
  };

  const InfoRow = ({ icon, label, value, color, material }: { icon: string; label: string; value: string; color?: string; material?: boolean }) => (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
        {material
          ? <MaterialCommunityIcons name={icon as any} size={16} color={color ?? colors.primary} />
          : <Ionicons name={icon as any} size={16} color={color ?? colors.primary} />
        }
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }}
      >
        {/* Hero header */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.heroActions}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.heroBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onFav}
              style={[styles.heroBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name={isFav ? "bookmark" : "bookmark-outline"} size={20} color={isFav ? colors.primary : colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.heroIcon, { backgroundColor: catColor + "22" }]}>
            <Ionicons name="business" size={32} color={catColor} />
          </View>

          {/* Category + Verification badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { backgroundColor: catColor + "22" }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>{location.category}</Text>
            </View>
            {isBusinessVerified && (
              <View style={[styles.trustedBadge, { backgroundColor: "#F59E0B" }]}>
                <Ionicons name="ribbon" size={13} color="#fff" />
                <Text style={styles.trustedBadgeText}>Business Verified</Text>
              </View>
            )}
            {isDriverVerified && (
              <View style={styles.trustedBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#fff" />
                <Text style={styles.trustedBadgeText}>Driver Verified</Text>
              </View>
            )}
            {isTrusted && !isBusinessVerified && !isDriverVerified && (
              <View style={styles.trustedBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#fff" />
                <Text style={styles.trustedBadgeText}>Trusted Location</Text>
              </View>
            )}
          </View>

          <Text style={[styles.heroName, { color: colors.foreground }]}>{location.companyName}</Text>
          <Text style={[styles.heroAddress, { color: colors.mutedForeground }]}>
            {location.address}, {location.city}, {location.state} {location.zipCode}
          </Text>

          {/* Business claimed info banner */}
          {isBusinessVerified && location.claimedByBusiness && (
            <View style={[styles.claimedBanner, { backgroundColor: "#F59E0B10", borderColor: "#F59E0B33" }]}>
              <Ionicons name="ribbon" size={14} color="#F59E0B" />
              <Text style={[styles.claimedText, { color: "#F59E0B" }]}>
                Managed by {location.claimedByBusiness.businessName}
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: catColor, flex: 2, paddingHorizontal: 16 }]}
              onPress={onNavigate}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Navigate</Text>
            </TouchableOpacity>
            {location.contactPhone && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
                onPress={onCallPhone}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={16} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Call</Text>
              </TouchableOpacity>
            )}
            {canClaim && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B55", borderWidth: 1 }]}
                onPress={() => router.push(`/claim-location?id=${location.id}`)}
                activeOpacity={0.85}
              >
                <Ionicons name="ribbon" size={16} color="#F59E0B" />
                <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>Claim</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info section */}
        <View style={styles.infoSection}>
          {/* Quick badges */}
          <View style={styles.quickBadges}>
            {[
              { show: location.restroomsAvailable, icon: "water", label: "Restrooms", color: "#4A9EE0" },
              { show: location.vendingMachines, icon: "fast-food", label: "Vending", color: "#F59E0B" },
              { show: location.overnightParking, icon: "moon", label: "Overnight Parking", color: "#4A9EE0" },
              { show: location.scaleAvailable, icon: "scale-balance", label: "Scale", color: "#22C55E", material: true },
              { show: location.openAllDay, icon: "time", label: "Open 24/7", color: "#22C55E" },
              { show: location.requiresAppointment, icon: "calendar", label: "Appt Required", color: "#F59E0B" },
              { show: location.parkingAvailable, icon: "car", label: "Parking", color: "#4A9EE0" },
              { show: location.easyBacking, icon: "navigate", label: "Easy Backing", color: "#22C55E" },
            ].filter((b) => b.show).map((b) => (
              <View key={b.label} style={[styles.quickBadge, { backgroundColor: b.color + "18", borderColor: b.color + "44" }]}>
                {b.material ? (
                  <MaterialCommunityIcons name={b.icon as any} size={13} color={b.color} />
                ) : (
                  <Ionicons name={b.icon as any} size={13} color={b.color} />
                )}
                <Text style={[styles.quickBadgeText, { color: b.color }]}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Community Verification */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.communityHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Community Verification</Text>
              <View style={styles.trustScoreWrap}>
                <Text style={[styles.trustScoreNum, { color: isTrusted ? "#22C55E" : colors.mutedForeground }]}>
                  {location.verificationScore}%
                </Text>
                <Text style={[styles.trustScoreLabel, { color: colors.mutedForeground }]}>verified</Text>
              </View>
            </View>

            {/* Trust bar */}
            <View style={[styles.trustBar, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  styles.trustBarFill,
                  {
                    width: `${location.verificationScore}%` as any,
                    backgroundColor: location.verificationScore >= 90 ? "#22C55E" : location.verificationScore >= 70 ? "#F59E0B" : "#EF4444",
                  },
                ]}
              />
            </View>

            <View style={styles.communityStats}>
              <View style={styles.communityStat}>
                <Ionicons name="thumbs-up" size={14} color="#22C55E" />
                <Text style={[styles.communityStatNum, { color: colors.foreground }]}>{location.upvotes ?? 0}</Text>
                <Text style={[styles.communityStatLabel, { color: colors.mutedForeground }]}>upvotes</Text>
              </View>
              <View style={styles.communityStat}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={[styles.communityStatNum, { color: colors.foreground }]}>
                  {location.ratingCount > 0 ? location.rating.toFixed(1) : "—"}
                </Text>
                <Text style={[styles.communityStatLabel, { color: colors.mutedForeground }]}>
                  {location.ratingCount > 0 ? `${location.ratingCount} ratings` : "no ratings"}
                </Text>
              </View>
              {(location.reportCount ?? 0) > 0 && (
                <View style={styles.communityStat}>
                  <Ionicons name="warning" size={14} color="#F59E0B" />
                  <Text style={[styles.communityStatNum, { color: colors.foreground }]}>{location.reportCount}</Text>
                  <Text style={[styles.communityStatLabel, { color: colors.mutedForeground }]}>reports</Text>
                </View>
              )}
            </View>

            <View style={styles.communityActions}>
              <TouchableOpacity
                style={[
                  styles.communityBtn,
                  { backgroundColor: hasUpvoted ? "#22C55E18" : colors.secondary, borderColor: hasUpvoted ? "#22C55E" : colors.border },
                ]}
                onPress={onUpvote}
                activeOpacity={0.8}
              >
                <Ionicons name="thumbs-up" size={15} color={hasUpvoted ? "#22C55E" : colors.mutedForeground} />
                <Text style={[styles.communityBtnText, { color: hasUpvoted ? "#22C55E" : colors.foreground }]}>
                  {hasUpvoted ? "Upvoted!" : "Accurate Info"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.communityBtn,
                  { backgroundColor: hasReported ? "#F59E0B18" : colors.secondary, borderColor: hasReported ? "#F59E0B" : colors.border },
                ]}
                onPress={onReport}
                activeOpacity={0.8}
              >
                <Ionicons name="flag" size={15} color={hasReported ? "#F59E0B" : colors.mutedForeground} />
                <Text style={[styles.communityBtnText, { color: hasReported ? "#F59E0B" : colors.foreground }]}>
                  {hasReported ? "Reported" : "Report Issue"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.communityBtn,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
                onPress={() => {
                  if (!user) { router.push("/auth"); return; }
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: "/report-content",
                    params: {
                      locationId: location.id,
                      locationName: location.companyName,
                      type: "location",
                    },
                  });
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="warning-outline" size={15} color="#D22F30" />
                <Text style={[styles.communityBtnText, { color: "#D22F30" }]}>
                  Inappropriate
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.communityNote, { color: colors.mutedForeground }]}>
              {isTrusted
                ? "✓ This is a trusted location verified by the driver community."
                : `${Math.max(0, 40 - (location.upvotes ?? 0))} more upvotes needed for Trusted status.`}
            </Text>
          </View>

          {/* Access Points */}
          {location.accessPoints && location.accessPoints.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Access Points</Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                Tap each point for directions on where to go
              </Text>
              {location.accessPoints.map((ap, i) => {
                const cfg = ACCESS_POINT_CONFIG[ap.type];
                return (
                  <View
                    key={i}
                    style={[styles.accessPointRow, { borderColor: colors.border, backgroundColor: colors.secondary + "80" }]}
                  >
                    <View style={[styles.accessPointIcon, { backgroundColor: cfg.color + "22" }]}>
                      {cfg.set === "ionicons"
                        ? <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                        : <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
                      }
                    </View>
                    <View style={styles.accessPointText}>
                      <View style={styles.accessPointLabelRow}>
                        <View style={[styles.accessPointTypePill, { backgroundColor: cfg.color + "22" }]}>
                          <Text style={[styles.accessPointType, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        <Text style={[styles.accessPointLabel, { color: colors.foreground }]}>{ap.label}</Text>
                      </View>
                      <Text style={[styles.accessPointDesc, { color: colors.mutedForeground }]}>{ap.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Truck Information */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Truck Information</Text>
            {location.bestEntrance && <InfoRow icon="enter" label="Best Entrance" value={location.bestEntrance} />}
            {location.checkInLocation && <InfoRow icon="clipboard" label="Check-In" value={location.checkInLocation} />}
            {location.dockNumber && <InfoRow icon="business" label="Dock Numbers" value={location.dockNumber} />}
            {location.dockType && location.dockType !== "none" && (
              <InfoRow icon="log-in" label="Dock Type" value={
                location.dockType === "dock-door" ? "Dock Door" :
                location.dockType === "ground-level" ? "Ground Level" : "Drive-In"
              } />
            )}
            <InfoRow
              icon="speedometer"
              label="Turning Difficulty"
              value={location.turningDifficulty === "easy" ? "Easy" : location.turningDifficulty === "moderate" ? "Moderate" : "Difficult ⚠️"}
              color={location.turningDifficulty === "easy" ? "#22C55E" : location.turningDifficulty === "moderate" ? "#F59E0B" : "#EF4444"}
            />
          </View>

          {location.additionalInfo && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Additional Information</Text>
              <View style={[styles.instructions, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="information-circle" size={16} color={colors.primary} />
                <Text style={[styles.instructionsText, { color: colors.foreground }]}>{location.additionalInfo}</Text>
              </View>
            </View>
          )}

          {location.specialInstructions && (
            <View style={[styles.card, { backgroundColor: "#F59E0B12", borderColor: "#F59E0B44" }]}>
              <View style={styles.specialHeader}>
                <Ionicons name="warning" size={16} color="#F59E0B" />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Driver Notes</Text>
              </View>
              <Text style={[styles.instructionsText, { color: colors.foreground }]}>{location.specialInstructions}</Text>
            </View>
          )}

          {/* Delivery Information */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Delivery Information</Text>
            {location.daySchedule && (
              <View style={{ gap: 6, marginBottom: 4 }}>
                {[
                  { key: "mon", label: "Mon" },
                  { key: "tue", label: "Tue" },
                  { key: "wed", label: "Wed" },
                  { key: "thu", label: "Thu" },
                  { key: "fri", label: "Fri" },
                  { key: "sat", label: "Sat" },
                  { key: "sun", label: "Sun" },
                ].map((d) => {
                  const day = location.daySchedule![d.key as keyof typeof location.daySchedule];
                  if (!day) return null;
                  return (
                    <View key={d.key} style={styles.scheduleRow}>
                      <Text style={[styles.scheduleDay, { color: colors.foreground }]}>{d.label}</Text>
                      {day.open
                        ? <Text style={[styles.scheduleHours, { color: colors.mutedForeground }]}>{day.hours}</Text>
                        : <Text style={[styles.scheduleClosed, { color: colors.mutedForeground }]}>Closed</Text>
                      }
                    </View>
                  );
                })}
              </View>
            )}
            <InfoRow icon="calendar" label="Appointment" value={location.requiresAppointment ? "Required" : "Walk-in OK"} />
            {location.contactPhone && <InfoRow icon="call" label="Contact" value={location.contactPhone} />}
          </View>

          {/* Community Photos */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.photosHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Community Photos</Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                  {communityPhotos.length > 0
                    ? `${communityPhotos.length} photo${communityPhotos.length !== 1 ? "s" : ""} from drivers & customers`
                    : "No photos yet — be the first to add one"}
                </Text>
              </View>
            </View>

            {communityPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {communityPhotos.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => openLightbox(p.uri, i)}
                    activeOpacity={0.85}
                    style={[styles.photoGridItem, { width: PHOTO_GRID_SIZE, height: PHOTO_GRID_SIZE }]}
                  >
                    <Image source={{ uri: p.uri }} style={styles.photoGridImg} />
                    <View style={styles.photoGridLabel}>
                      <Text style={styles.photoGridLabelText} numberOfLines={1}>{p.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.photoUploadRow}>
              <TouchableOpacity
                style={[styles.photoUploadBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={onAddPhotosToLocation}
                activeOpacity={0.8}
              >
                <Ionicons name="images" size={16} color={catColor} />
                <Text style={[styles.photoUploadText, { color: catColor }]}>Choose Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoUploadBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={onTakePhotoForLocation}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color={catColor} />
                <Text style={[styles.photoUploadText, { color: catColor }]}>Take Photo</Text>
              </TouchableOpacity>
            </View>
            {user && (
              <Text style={[styles.photoEarnNote, { color: colors.mutedForeground }]}>
                +10 points for each photo you upload
              </Text>
            )}
          </View>

          {/* Driver Reviews */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.reviewsHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Driver Reviews</Text>
              <TouchableOpacity
                style={[styles.addReviewBtn, { backgroundColor: catColor + "18", borderColor: catColor + "44" }]}
                onPress={() => {
                  if (!user) { router.push("/auth"); return; }
                  setShowCommentBox(!showCommentBox);
                }}
              >
                <Ionicons name="add" size={14} color={catColor} />
                <Text style={[styles.addReviewBtnText, { color: catColor }]}>Add Note</Text>
              </TouchableOpacity>
            </View>

            {showCommentBox && (
              <View style={[styles.commentBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setCommentRating(s)}>
                      <Ionicons name={s <= commentRating ? "star" : "star-outline"} size={22} color="#F59E0B" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Share what you know about this location..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[styles.commentInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                />
                {/* Comment photos */}
                {commentPhotos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.commentPhotoRow}>
                    {commentPhotos.map((uri, i) => (
                      <View key={i} style={styles.commentPhotoThumb}>
                        <Image source={{ uri }} style={styles.commentPhotoImg} />
                        <TouchableOpacity
                          style={styles.commentPhotoRemove}
                          onPress={() => setCommentPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Ionicons name="close" size={11} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <View style={styles.commentPhotoActions}>
                  <TouchableOpacity
                    style={[styles.commentAddPhotoBtn, { borderColor: colors.border }]}
                    onPress={async () => {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsMultipleSelection: true,
                        quality: 0.8,
                      });
                      if (!result.canceled) setCommentPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
                    }}
                  >
                    <Ionicons name="images-outline" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.commentAddPhotoText, { color: colors.mutedForeground }]}>Add Photos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.commentAddPhotoBtn, { borderColor: colors.border }]}
                    onPress={async () => {
                      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
                      if (!result.canceled) setCommentPhotos((prev) => [...prev, result.assets[0].uri]);
                    }}
                  >
                    <Ionicons name="camera-outline" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.commentAddPhotoText, { color: colors.mutedForeground }]}>Camera</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.commentActions}>
                  <TouchableOpacity
                    style={[styles.commentCancelBtn, { borderColor: colors.border }]}
                    onPress={() => { setShowCommentBox(false); setCommentText(""); setCommentPhotos([]); }}
                  >
                    <Text style={[styles.commentCancelText, { color: colors.foreground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.commentSubmitBtn, { backgroundColor: catColor, opacity: commentText.trim() ? 1 : 0.5 }]}
                    onPress={onSubmitComment}
                    disabled={!commentText.trim()}
                  >
                    <Text style={styles.commentSubmitText}>Post Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {location.comments.length === 0 && !showCommentBox ? (
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-outline" size={28} color={colors.mutedForeground} />
                <Text style={[styles.noReviewsText, { color: colors.mutedForeground }]}>
                  No driver notes yet. Be the first!
                </Text>
              </View>
            ) : (
              location.comments.map((c) => (
                <View key={c.id} style={[styles.commentRow, { borderTopColor: colors.border }]}>
                  <View style={styles.commentMeta}>
                    <View style={[styles.commentAvatar, { backgroundColor: catColor + "22" }]}>
                      <Ionicons name="person" size={14} color={catColor} />
                    </View>
                    <View style={styles.commentUser}>
                      <Text style={[styles.commentName, { color: colors.foreground }]}>{c.userName}</Text>
                      <Text style={[styles.commentDate, { color: colors.mutedForeground }]}>{c.date}</Text>
                    </View>
                    <View style={styles.commentStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name={s <= c.rating ? "star" : "star-outline"} size={11} color="#F59E0B" />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.commentText, { color: colors.foreground }]}>{c.text}</Text>
                  {c.photos && c.photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.commentPhotoRow}>
                      {c.photos.map((uri, pi) => (
                        <TouchableOpacity
                          key={pi}
                          onPress={() => openLightbox(uri, communityPhotos.findIndex((p) => p.uri === uri))}
                          activeOpacity={0.85}
                        >
                          <Image source={{ uri }} style={styles.commentReviewPhoto} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Lightbox */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
          {communityPhotos.length > 1 && (
            <View style={styles.lightboxNav}>
              <TouchableOpacity
                style={[styles.lightboxNavBtn, { opacity: lightboxIndex > 0 ? 1 : 0.3 }]}
                onPress={() => {
                  if (lightboxIndex > 0) {
                    const newIndex = lightboxIndex - 1;
                    setLightboxIndex(newIndex);
                    setLightboxUri(communityPhotos[newIndex].uri);
                  }
                }}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.lightboxCounter}>
                {lightboxIndex + 1} / {communityPhotos.length}
              </Text>
              <TouchableOpacity
                style={[styles.lightboxNavBtn, { opacity: lightboxIndex < communityPhotos.length - 1 ? 1 : 0.3 }]}
                onPress={() => {
                  if (lightboxIndex < communityPhotos.length - 1) {
                    const newIndex = lightboxIndex + 1;
                    setLightboxIndex(newIndex);
                    setLightboxUri(communityPhotos[newIndex].uri);
                  }
                }}
              >
                <Ionicons name="chevron-forward" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {communityPhotos[lightboxIndex] && (
            <Text style={styles.lightboxLabel}>
              Uploaded by {communityPhotos[lightboxIndex].label}
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  hero: {
    padding: 20,
    paddingTop: 16,
    gap: 8,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  heroActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  heroBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  trustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trustedBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroAddress: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4, width: "100%" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  claimedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "stretch" as const,
    justifyContent: "center" as const,
  },
  claimedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoSection: { padding: 16, gap: 12 },
  quickBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  communityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trustScoreWrap: { alignItems: "flex-end" },
  trustScoreNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  trustScoreLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  trustBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  trustBarFill: {
    height: 6,
    borderRadius: 3,
  },
  communityStats: {
    flexDirection: "row",
    gap: 16,
  },
  communityStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  communityStatNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  communityStatLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  communityActions: {
    flexDirection: "row",
    gap: 10,
  },
  communityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  communityBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  communityNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
  accessPointRow: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  accessPointIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accessPointText: { flex: 1, gap: 4 },
  accessPointLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  accessPointTypePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  accessPointType: { fontSize: 10, fontFamily: "Inter_700Bold" },
  accessPointLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  accessPointDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  specialHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  instructions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  instructionsText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scheduleDay: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 36 },
  scheduleHours: { fontSize: 13, fontFamily: "Inter_400Regular" },
  scheduleClosed: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  photoGallery: { gap: 10, paddingVertical: 2 },
  photoThumb: { width: 120, height: 120, borderRadius: 12 },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  addReviewBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  commentBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  starRow: {
    flexDirection: "row",
    gap: 6,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  commentActions: {
    flexDirection: "row",
    gap: 8,
  },
  commentCancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  commentCancelText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentSubmitBtn: {
    flex: 2,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  commentSubmitText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  noReviews: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  noReviewsText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  commentRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  commentUser: { flex: 1 },
  commentName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentStars: { flexDirection: "row", gap: 2 },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  commentPhotoRow: { gap: 8, paddingVertical: 4 },
  commentPhotoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  commentPhotoImg: { width: 64, height: 64 },
  commentPhotoRemove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  commentPhotoActions: {
    flexDirection: "row",
    gap: 8,
  },
  commentAddPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  commentAddPhotoText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  commentReviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  photosHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  photoGridItem: {
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photoGridImg: {
    width: "100%" as any,
    height: "100%" as any,
  },
  photoGridLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  photoGridLabelText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  photoUploadRow: {
    flexDirection: "row",
    gap: 10,
  },
  photoUploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  photoUploadText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  photoEarnNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: -4,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  lightboxNav: {
    position: "absolute",
    bottom: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  lightboxNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCounter: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  lightboxLabel: {
    position: "absolute",
    bottom: 60,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
