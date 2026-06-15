import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

type JobType = "full-time" | "part-time" | "contract" | "owner-operator";
type CDLClass = "Class A" | "Class B" | "Class C" | "No CDL";

interface Job {
  id: string;
  companyName: string;
  title: string;
  location: string;
  state: string;
  jobType: JobType;
  cdlRequired: CDLClass;
  payRate: string;
  payPeriod: string;
  description: string;
  requirements: string[];
  benefits: string[];
  postedDate: string;
  isVerified: boolean;
  isUrgent?: boolean;
  routes?: string;
  hometime?: string;
  experience?: string;
}

const SEED_JOBS: Job[] = [
  {
    id: "job_001",
    companyName: "Walmart Inc.",
    title: "CDL-A Regional Truck Driver",
    location: "Cicero, IL",
    state: "IL",
    jobType: "full-time",
    cdlRequired: "Class A",
    payRate: "$0.58–$0.65",
    payPeriod: "per mile",
    description:
      "Join Walmart's private fleet as a regional CDL-A driver. Haul freight between our distribution centers across the Midwest. Consistent miles, modern equipment, and home time you can count on.",
    requirements: [
      "Valid CDL-A license",
      "Minimum 1 year verifiable OTR experience",
      "Clean MVR (no more than 2 moving violations in 3 years)",
      "Must pass DOT physical and drug screen",
    ],
    benefits: [
      "Medical, dental & vision from day 1",
      "401(k) with company match",
      "Paid time off + holidays",
      "Weekly home time",
      "Late model equipment (2022–2024)",
    ],
    postedDate: "2 days ago",
    isVerified: true,
    isUrgent: true,
    routes: "Midwest regional (IL, IN, OH, MO)",
    hometime: "Weekly",
    experience: "1+ year CDL-A",
  },
  {
    id: "job_002",
    companyName: "Amazon Freight",
    title: "CDL-A OTR Driver — Relay Routes",
    location: "Haslet, TX",
    state: "TX",
    jobType: "full-time",
    cdlRequired: "Class A",
    payRate: "$1,200–$1,500",
    payPeriod: "per week",
    description:
      "Amazon Freight is hiring CDL-A drivers for relay-style OTR routes. You drive your segment, hand off the trailer, and head home or to a layover. No touch freight, no dock waiting.",
    requirements: [
      "Valid CDL-A license",
      "6+ months OTR experience",
      "No DUIs or reckless driving",
      "Able to pass background check",
    ],
    benefits: [
      "Consistent weekly pay",
      "No-touch freight",
      "Amazon Relay app — no paper logs",
      "Rider & pet policy",
      "Newer trucks assigned",
    ],
    postedDate: "5 days ago",
    isVerified: true,
    routes: "TX → TN → GA relay corridor",
    hometime: "Every 3–4 days",
    experience: "6 months CDL-A",
  },
  {
    id: "job_003",
    companyName: "Kroger Distribution",
    title: "CDL-A Local Delivery Driver",
    location: "Atlanta, GA",
    state: "GA",
    jobType: "full-time",
    cdlRequired: "Class A",
    payRate: "$28–$32",
    payPeriod: "per hour",
    description:
      "Local CDL-A driver for Kroger's Atlanta distribution center. Deliver groceries and dry goods to Kroger stores across metro Atlanta. Home every day, no nights required.",
    requirements: [
      "Valid CDL-A license",
      "Clean driving record",
      "Ability to operate pallet jack",
      "Customer service attitude",
    ],
    benefits: [
      "Home daily",
      "Overtime available",
      "Union wages & protections",
      "Full benefits package",
      "Consistent daytime schedule",
    ],
    postedDate: "1 week ago",
    isVerified: true,
    routes: "Metro Atlanta area",
    hometime: "Daily",
    experience: "Any CDL-A",
  },
  {
    id: "job_004",
    companyName: "Prime Inc.",
    title: "Owner-Operator — Refrigerated Freight",
    location: "Springfield, MO",
    state: "MO",
    jobType: "owner-operator",
    cdlRequired: "Class A",
    payRate: "Up to $1.80",
    payPeriod: "per mile (loaded)",
    description:
      "Prime Inc. is seeking owner-operators to haul refrigerated freight across the US. Top-paying lanes, 100% no-touch, and fuel surcharge pass-through. Lease-to-own program available.",
    requirements: [
      "Valid CDL-A license",
      "Your own truck (or lease through Prime)",
      "2+ years OTR experience",
      "Reefer experience preferred",
    ],
    benefits: [
      "Fuel surcharge pass-through",
      "Discounted fuel network",
      "Free trailer usage",
      "Lease-to-own truck program",
      "Dedicated dispatch support",
    ],
    postedDate: "3 days ago",
    isVerified: true,
    isUrgent: false,
    routes: "Nationwide",
    hometime: "Flexible",
    experience: "2+ years OTR",
  },
  {
    id: "job_005",
    companyName: "FedEx Freight",
    title: "CDL-A LTL P&D Driver",
    location: "Denver, CO",
    state: "CO",
    jobType: "full-time",
    cdlRequired: "Class A",
    payRate: "$26–$30",
    payPeriod: "per hour",
    description:
      "FedEx Freight is hiring CDL-A pickup and delivery drivers out of our Denver terminal. Run LTL routes in metro Denver and surrounding areas with a consistent schedule.",
    requirements: [
      "Valid CDL-A license",
      "HazMat endorsement (or willing to obtain)",
      "Minimum 1 year commercial driving",
      "Forklift experience a plus",
    ],
    benefits: [
      "Competitive hourly pay + overtime",
      "Full benefits from day 1",
      "Paid training",
      "Tuition reimbursement",
      "Home daily",
    ],
    postedDate: "1 week ago",
    isVerified: false,
    routes: "Metro Denver & Front Range",
    hometime: "Daily",
    experience: "1+ year CDL-A",
  },
];

const JOB_TYPE_LABELS: Record<JobType, string> = {
  "full-time": "Full-Time",
  "part-time": "Part-Time",
  "contract": "Contract",
  "owner-operator": "Owner-Operator",
};

const JOB_TYPE_COLORS: Record<JobType, string> = {
  "full-time": "#22C55E",
  "part-time": "#4A9EE0",
  "contract": "#F59E0B",
  "owner-operator": "#8B5CF6",
};

const CDL_COLORS: Record<CDLClass, string> = {
  "Class A": "#D22F30",
  "Class B": "#F59E0B",
  "Class C": "#4A9EE0",
  "No CDL": "#7A8CA0",
};

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const [query, setQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filterType, setFilterType] = useState<JobType | "all">("all");

  const filtered = SEED_JOBS.filter((j) => {
    const q = query.toLowerCase();
    const matchesSearch =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.companyName.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.state.toLowerCase().includes(q);
    const matchesType = filterType === "all" || j.jobType === filterType;
    return matchesSearch && matchesType;
  });

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        colors={colors}
        insets={insets}
        WEB_TOP={WEB_TOP}
        user={user}
        onBack={() => setSelectedJob(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: insets.top + WEB_TOP + 16,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Jobs</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {filtered.length} openings near you
            </Text>
          </View>
          {(user?.subscriptionTier === "business" || user?.accountType === "customer") && (
            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/premium")}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.postBtnText}>Post a Job</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by title, company, or location…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {(["all", "full-time", "part-time", "owner-operator", "contract"] as const).map((type) => {
            const active = filterType === type;
            const color = type === "all" ? colors.primary : JOB_TYPE_COLORS[type as JobType];
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? color + "22" : colors.background,
                    borderColor: active ? color : colors.border,
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setFilterType(type);
                }}
              >
                <Text style={[styles.filterChipText, { color: active ? color : colors.mutedForeground }]}>
                  {type === "all" ? "All Jobs" : JOB_TYPE_LABELS[type as JobType]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Job list */}
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No jobs found</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              colors={colors}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setSelectedJob(job);
              }}
            />
          ))
        )}

        {/* Post a job CTA for businesses */}
        <TouchableOpacity
          style={[styles.advertiseCard, { backgroundColor: "#1A1A2E", borderColor: "#8B5CF633" }]}
          onPress={() => router.push("/premium")}
          activeOpacity={0.85}
        >
          <View style={[styles.advertiseIcon, { backgroundColor: "#8B5CF618" }]}>
            <Ionicons name="megaphone" size={22} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.advertiseTitle]}>Hiring CDL drivers?</Text>
            <Text style={[styles.advertiseSub]}>
              Post your job directly to active drivers on their routes. Custom pricing for fleets.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function JobCard({
  job,
  colors,
  onPress,
}: {
  job: Job;
  colors: any;
  onPress: () => void;
}) {
  const typeColor = JOB_TYPE_COLORS[job.jobType];
  const cdlColor = CDL_COLORS[job.cdlRequired];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
              {job.title}
            </Text>
            {job.isUrgent && (
              <View style={[styles.urgentPill, { backgroundColor: "#EF444418" }]}>
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
          </View>
          <View style={styles.companyRow}>
            <Text style={[styles.company, { color: colors.primary }]}>{job.companyName}</Text>
            {job.isVerified && (
              <Ionicons name="ribbon" size={13} color="#F59E0B" />
            )}
          </View>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
          <Ionicons name="location" size={11} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{job.location}</Text>
        </View>
        <View style={[styles.metaPill, { backgroundColor: typeColor + "18" }]}>
          <Text style={[styles.metaText, { color: typeColor }]}>{JOB_TYPE_LABELS[job.jobType]}</Text>
        </View>
        <View style={[styles.metaPill, { backgroundColor: cdlColor + "18" }]}>
          <MaterialCommunityIcons name="card-account-details" size={11} color={cdlColor} />
          <Text style={[styles.metaText, { color: cdlColor }]}>{job.cdlRequired}</Text>
        </View>
      </View>

      <View style={styles.payRow}>
        <View style={[styles.payBadge, { backgroundColor: "#22C55E12", borderColor: "#22C55E33" }]}>
          <Text style={[styles.payRate, { color: "#22C55E" }]}>{job.payRate}</Text>
          <Text style={[styles.payPeriod, { color: "#22C55E99" }]}> {job.payPeriod}</Text>
        </View>
        {job.hometime && (
          <View style={styles.hometimeRow}>
            <Ionicons name="home" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{job.hometime}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.postedDate, { color: colors.mutedForeground }]}>Posted {job.postedDate}</Text>
        <Text style={[styles.viewDetails, { color: colors.primary }]}>View Details →</Text>
      </View>
    </Pressable>
  );
}

function JobDetail({
  job,
  colors,
  insets,
  WEB_TOP,
  user,
  onBack,
}: {
  job: Job;
  colors: any;
  insets: any;
  WEB_TOP: number;
  user: any;
  onBack: () => void;
}) {
  const typeColor = JOB_TYPE_COLORS[job.jobType];
  const cdlColor = CDL_COLORS[job.cdlRequired];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Detail hero */}
        <View
          style={[
            styles.detailHero,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              paddingTop: insets.top + WEB_TOP + 16,
            },
          ]}
        >
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <View style={[styles.detailIconWrap, { backgroundColor: colors.secondary }]}>
            <Ionicons name="briefcase" size={28} color={colors.primary} />
          </View>

          <View style={styles.detailTitleRow}>
            <Text style={[styles.detailTitle, { color: colors.foreground }]}>{job.title}</Text>
            {job.isUrgent && (
              <View style={[styles.urgentPill, { backgroundColor: "#EF444418" }]}>
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
          </View>

          <View style={styles.detailCompanyRow}>
            <Text style={[styles.detailCompany, { color: colors.primary }]}>{job.companyName}</Text>
            {job.isVerified && <Ionicons name="ribbon" size={15} color="#F59E0B" />}
          </View>

          <View style={styles.detailPills}>
            <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
              <Ionicons name="location" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{job.location}</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: typeColor + "18" }]}>
              <Text style={[styles.metaText, { color: typeColor }]}>{JOB_TYPE_LABELS[job.jobType]}</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: cdlColor + "18" }]}>
              <MaterialCommunityIcons name="card-account-details" size={12} color={cdlColor} />
              <Text style={[styles.metaText, { color: cdlColor }]}>{job.cdlRequired}</Text>
            </View>
          </View>

          <View style={[styles.payBadge, { backgroundColor: "#22C55E12", borderColor: "#22C55E33", alignSelf: "center", marginTop: 4 }]}>
            <Text style={[styles.payRate, { color: "#22C55E" }]}>{job.payRate}</Text>
            <Text style={[styles.payPeriod, { color: "#22C55E99" }]}> {job.payPeriod}</Text>
          </View>
        </View>

        <View style={styles.detailBody}>
          {/* Quick stats */}
          <View style={styles.quickStats}>
            {[
              job.hometime && { icon: "home", label: "Home Time", value: job.hometime, color: "#4A9EE0" },
              job.routes && { icon: "navigate", label: "Routes", value: job.routes, color: "#22C55E" },
              job.experience && { icon: "school", label: "Experience", value: job.experience, color: "#8B5CF6" },
            ]
              .filter(Boolean)
              .map((s: any) => (
                <View key={s.label} style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                  <Text style={[styles.quickStatLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  <Text style={[styles.quickStatVal, { color: colors.foreground }]}>{s.value}</Text>
                </View>
              ))}
          </View>

          {/* Description */}
          <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>About the Role</Text>
            <Text style={[styles.detailDesc, { color: colors.mutedForeground }]}>{job.description}</Text>
          </View>

          {/* Requirements */}
          <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Requirements</Text>
            {job.requirements.map((r) => (
              <View key={r} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: "#EF4444" }]} />
                <Text style={[styles.bulletText, { color: colors.foreground }]}>{r}</Text>
              </View>
            ))}
          </View>

          {/* Benefits */}
          <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Benefits</Text>
            {job.benefits.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
                <Text style={[styles.bulletText, { color: colors.foreground }]}>{b}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.postedDate, { color: colors.mutedForeground, textAlign: "center", marginTop: 4 }]}>
            Posted {job.postedDate}
          </Text>
        </View>
      </ScrollView>

      {/* Apply CTA */}
      <View style={[styles.applyCta, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (!user) router.push("/auth");
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={17} color="#fff" />
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  postBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  filterScroll: { marginHorizontal: -16 },
  filterRow: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  urgentPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  urgentText: { color: "#EF4444", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  company: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  payRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  payBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  payRate: { fontSize: 15, fontFamily: "Inter_700Bold" },
  payPeriod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  hometimeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  postedDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  viewDetails: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  advertiseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  advertiseIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  advertiseTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#8B5CF6", marginBottom: 3 },
  advertiseSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8B5CF699", lineHeight: 17 },
  detailHero: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  backBtn: { alignSelf: "flex-start", marginBottom: 4 },
  detailIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  detailTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  detailTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  detailCompanyRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  detailCompany: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  detailPills: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  detailBody: { padding: 16, gap: 12 },
  quickStats: { flexDirection: "row", gap: 8 },
  quickStat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  quickStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  quickStatVal: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  detailSection: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  detailSectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  detailDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  bulletText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },
  applyCta: { padding: 16, paddingTop: 12, borderTopWidth: 1 },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  applyBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
