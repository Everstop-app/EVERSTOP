import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocations, DockType, TurningDifficulty } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";

const DOCK_TYPES: { value: DockType; label: string }[] = [
  { value: "dock-door", label: "Dock Door" },
  { value: "ground-level", label: "Ground Level" },
  { value: "drive-in", label: "Drive-In" },
  { value: "none", label: "None" },
];

const DIFFICULTY_TYPES: { value: TurningDifficulty; label: string; color: string }[] = [
  { value: "easy", label: "Easy", color: "#22C55E" },
  { value: "moderate", label: "Moderate", color: "#F59E0B" },
  { value: "difficult", label: "Difficult", color: "#EF4444" },
];

const CATEGORIES = [
  "Distribution Center", "Fulfillment Center", "Retail", "Food & Beverage",
  "Freight / Courier", "Manufacturing", "Cold Storage", "Other",
];

export default function AddLocationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addLocation } = useLocations();
  const { user, addPoints } = useAuth();
  const params = useLocalSearchParams<{
    prefill_address?: string;
    prefill_city?: string;
    prefill_state?: string;
    prefill_zip?: string;
    prefill_lat?: string;
    prefill_lon?: string;
    prefill_company?: string;
  }>();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState(params.prefill_company ?? "");
  const [address, setAddress] = useState(params.prefill_address ?? "");
  const [city, setCity] = useState(params.prefill_city ?? "");
  const [state, setState] = useState(params.prefill_state ?? "");
  const [zipCode, setZipCode] = useState(params.prefill_zip ?? "");
  const [category, setCategory] = useState("Distribution Center");
  const [latitude, setLatitude] = useState(params.prefill_lat ?? "");
  const [longitude, setLongitude] = useState(params.prefill_lon ?? "");

  const [bestEntrance, setBestEntrance] = useState("");
  const [parkingAvailable, setParkingAvailable] = useState(true);
  const [overnightParking, setOvernightParking] = useState(false);
  const [dockNumber, setDockNumber] = useState("");
  const [dockType, setDockType] = useState<DockType>("dock-door");
  const [checkInLocation, setCheckInLocation] = useState("");
  const [scaleAvailable, setScaleAvailable] = useState(false);
  const [turningDifficulty, setTurningDifficulty] = useState<TurningDifficulty>("moderate");
  const [easyBacking, setEasyBacking] = useState(false);

  const [receivingHours, setReceivingHours] = useState("");
  const [requiresAppointment, setRequiresAppointment] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [openAllDay, setOpenAllDay] = useState(false);
  const [restroomsAvailable, setRestroomsAvailable] = useState(false);

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;
  const steps = ["General", "Truck Info", "Delivery Info"];

  const isStep0Valid = companyName.trim() && address.trim() && city.trim() && state.trim();
  const canNext = step === 0 ? isStep0Valid : true;

  const onNext = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (step < steps.length - 1) setStep(step + 1);
    else onSubmit();
  };

  const onSubmit = async () => {
    if (!user) { router.push("/auth"); return; }
    setSaving(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addLocation({
      companyName: companyName.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zipCode: zipCode.trim(),
      category,
      latitude: parseFloat(latitude) || 39.5,
      longitude: parseFloat(longitude) || -98.35,
      bestEntrance: bestEntrance.trim() || undefined,
      parkingAvailable,
      overnightParking,
      dockNumber: dockNumber.trim() || undefined,
      dockType,
      checkInLocation: checkInLocation.trim() || undefined,
      scaleAvailable,
      turningDifficulty,
      easyBacking,
      receivingHours: receivingHours.trim() || undefined,
      requiresAppointment,
      contactPhone: contactPhone.trim() || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      openAllDay,
      restroomsAvailable,
      submittedBy: user.id,
      submittedByName: user.name,
    });
    addPoints(50);
    setSaving(false);
    router.back();
  };

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
  );

  const Field = ({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline }: any) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMulti,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
        ]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
        multiline={multiline}
      />
    </View>
  );

  const ToggleRow = ({ label, value, onToggle, icon }: { label: string; value: boolean; onToggle: () => void; icon: string }) => (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
      <View style={styles.toggleLeft}>
        <Ionicons name={icon as any} size={18} color={value ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: colors.primary + "66" }}
        thumbColor={value ? colors.primary : colors.mutedForeground}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Location</Text>
          <View style={{ width: 22 }} />
        </View>
        {/* Step indicator */}
        <View style={styles.stepsRow}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: i <= step ? colors.primary : colors.muted,
                      borderColor: i === step ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {i < step && <Ionicons name="checkmark" size={12} color="#fff" />}
                  {i >= step && <Text style={styles.stepNum}>{i + 1}</Text>}
                </View>
                <Text style={[styles.stepLabel, { color: i <= step ? colors.primary : colors.mutedForeground }]}>{s}</Text>
              </View>
              {i < steps.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: i < step ? colors.primary : colors.muted }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <View style={styles.formSection}>
            <SectionTitle title="Business Details" />
            <Field label="Company Name *" value={companyName} onChangeText={setCompanyName} placeholder="Walmart Distribution Center" />
            <Field label="Street Address *" value={address} onChangeText={setAddress} placeholder="123 Industrial Blvd" />
            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Field label="City *" value={city} onChangeText={setCity} placeholder="Chicago" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="State *" value={state} onChangeText={setState} placeholder="IL" autoCapitalize="characters" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="ZIP" value={zipCode} onChangeText={setZipCode} placeholder="60601" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: category === cat ? colors.primary : colors.card,
                        borderColor: category === cat ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.catChipText, { color: category === cat ? "#fff" : colors.mutedForeground }]}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.formSection}>
            <SectionTitle title="Truck Access" />
            <Field label="Best Truck Entrance" value={bestEntrance} onChangeText={setBestEntrance} placeholder="South entrance off Main St, follow yellow arrows" multiline />

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Backing Difficulty</Text>
              <View style={styles.diffRow}>
                {DIFFICULTY_TYPES.map((d) => (
                  <Pressable
                    key={d.value}
                    onPress={() => { setTurningDifficulty(d.value); setEasyBacking(d.value === "easy"); }}
                    style={[
                      styles.diffBtn,
                      {
                        backgroundColor: turningDifficulty === d.value ? d.color + "22" : colors.card,
                        borderColor: turningDifficulty === d.value ? d.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.diffBtnText, { color: turningDifficulty === d.value ? d.color : colors.mutedForeground }]}>{d.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Dock Type</Text>
              <View style={styles.dockRow}>
                {DOCK_TYPES.map((d) => (
                  <Pressable
                    key={d.value}
                    onPress={() => setDockType(d.value)}
                    style={[
                      styles.dockBtn,
                      {
                        backgroundColor: dockType === d.value ? colors.primary + "18" : colors.card,
                        borderColor: dockType === d.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.dockBtnText, { color: dockType === d.value ? colors.primary : colors.mutedForeground }]}>{d.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Field label="Dock Numbers" value={dockNumber} onChangeText={setDockNumber} placeholder="1-50, A-section" />
            <Field label="Check-In Location" value={checkInLocation} onChangeText={setCheckInLocation} placeholder="Guard shack at main gate" />

            <View style={[styles.togglesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ToggleRow label="Parking Available" value={parkingAvailable} onToggle={() => setParkingAvailable(!parkingAvailable)} icon="car" />
              <ToggleRow label="Overnight Parking" value={overnightParking} onToggle={() => setOvernightParking(!overnightParking)} icon="moon" />
              <ToggleRow label="Scale Available" value={scaleAvailable} onToggle={() => setScaleAvailable(!scaleAvailable)} icon="scale" />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formSection}>
            <SectionTitle title="Receiving Information" />
            <Field label="Receiving Hours" value={receivingHours} onChangeText={setReceivingHours} placeholder="Mon-Fri 7AM-4PM, Sat 8AM-12PM" />
            <Field label="Contact Phone" value={contactPhone} onChangeText={setContactPhone} placeholder="(555) 000-0000" keyboardType="phone-pad" />
            <Field label="Special Instructions" value={specialInstructions} onChangeText={setSpecialInstructions} placeholder="Arrive 30 min early, bring BOL..." multiline />

            <View style={[styles.togglesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ToggleRow label="Appointment Required" value={requiresAppointment} onToggle={() => setRequiresAppointment(!requiresAppointment)} icon="calendar" />
              <ToggleRow label="Open 24/7" value={openAllDay} onToggle={() => setOpenAllDay(!openAllDay)} icon="time" />
              <ToggleRow label="Restrooms Available" value={restroomsAvailable} onToggle={() => setRestroomsAvailable(!restroomsAvailable)} icon="water" />
            </View>

            <View style={[styles.pointsNote, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
              <Ionicons name="gift" size={18} color={colors.primary} />
              <Text style={[styles.pointsNoteText, { color: colors.primary }]}>
                You'll earn 50 points for submitting this location!
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={18} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            { backgroundColor: canNext ? colors.primary : colors.muted, flex: 1 },
          ]}
          onPress={onNext}
          disabled={!canNext || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={[styles.nextBtnText, { color: canNext ? "#fff" : colors.mutedForeground }]}>
                {step < steps.length - 1 ? "Continue" : "Submit Location"}
              </Text>
              <Ionicons name={step < steps.length - 1 ? "arrow-forward" : "checkmark"} size={18} color={canNext ? "#fff" : colors.mutedForeground} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepItem: { alignItems: "center", gap: 4 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  stepNum: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stepLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  stepLine: { flex: 1, height: 2, marginBottom: 14 },
  scroll: { padding: 16 },
  formSection: { gap: 14 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  fieldInputMulti: { minHeight: 80, textAlignVertical: "top" },
  categoryRow: { gap: 8, paddingVertical: 2 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  diffRow: { flexDirection: "row", gap: 10 },
  diffBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  diffBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dockRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dockBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  dockBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  togglesCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  pointsNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pointsNoteText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
