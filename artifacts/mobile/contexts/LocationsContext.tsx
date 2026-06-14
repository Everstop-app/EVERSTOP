import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type TurningDifficulty = "easy" | "moderate" | "difficult";
export type DockType = "dock-door" | "ground-level" | "drive-in" | "none";
export type AccessPointType = "entrance" | "dock" | "parking" | "scale" | "office" | "fuel";

export interface DaySchedule {
  mon: { open: boolean; hours: string };
  tue: { open: boolean; hours: string };
  wed: { open: boolean; hours: string };
  thu: { open: boolean; hours: string };
  fri: { open: boolean; hours: string };
  sat: { open: boolean; hours: string };
  sun: { open: boolean; hours: string };
}

export interface LocationComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  date: string;
  rating: number;
  photos?: string[];
}

export interface AccessPoint {
  type: AccessPointType;
  label: string;
  description: string;
}

export interface DeliveryLocation {
  id: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  category: string;
  categoryColor?: string;
  bestEntrance?: string;
  parkingAvailable?: boolean;
  restroomsAvailable: boolean;
  vendingMachines?: boolean;
  overnightParking: boolean;
  dockNumber?: string;
  dockType?: DockType;
  checkInLocation?: string;
  scaleAvailable: boolean;
  turningDifficulty: TurningDifficulty;
  receivingHours?: string;
  daySchedule?: DaySchedule;
  requiresAppointment: boolean;
  contactPhone?: string;
  specialInstructions?: string;
  additionalInfo?: string;
  rating: number;
  ratingCount: number;
  trustScore: number;
  verificationScore: number;
  upvotes: number;
  reportCount: number;
  lastUpdated: string;
  submittedBy: string;
  submittedByName: string;
  comments: LocationComment[];
  photos?: string[];
  openAllDay: boolean;
  easyBacking: boolean;
  highRating: boolean;
  accessPoints?: AccessPoint[];
  isClaimed?: boolean;
  claimedByBusiness?: { businessId: string; businessName: string; verified: boolean };
}

export interface FilterState {
  overnightParking: boolean;
  truckEntrance: boolean;
  easyBacking: boolean;
  difficultBacking: boolean;
  open24Hours: boolean;
  restroomsAvailable: boolean;
  scaleAvailable: boolean;
  highRating: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  overnightParking: false,
  truckEntrance: false,
  easyBacking: false,
  difficultBacking: false,
  open24Hours: false,
  restroomsAvailable: false,
  scaleAvailable: false,
  highRating: false,
};

const SEED_LOCATIONS: DeliveryLocation[] = [
  {
    id: "loc_001",
    companyName: "Walmart Distribution Center",
    address: "2508 S Cicero Ave",
    city: "Cicero",
    state: "IL",
    zipCode: "60804",
    latitude: 41.8330,
    longitude: -87.7575,
    category: "Dry Van",
    categoryColor: "#D22F30",
    bestEntrance: "South entrance off Cicero Ave, follow yellow arrows to docks 1-50",
    parkingAvailable: true,
    overnightParking: true,
    dockNumber: "1-120",
    dockType: "dock-door",
    checkInLocation: "Guard shack at main gate, bring BOL",
    scaleAvailable: true,
    turningDifficulty: "easy",
    receivingHours: "Mon-Sat 6AM-10PM, Sun 7AM-7PM",
    requiresAppointment: true,
    contactPhone: "(708) 555-0142",
    specialInstructions: "Check in 30 min before appointment. No idling in lot. Lumper service available.",
    rating: 4.2,
    ratingCount: 287,
    trustScore: 94,
    verificationScore: 98,
    upvotes: 142,
    reportCount: 2,
    lastUpdated: "2024-01-15",
    submittedBy: "user_drv1",
    submittedByName: "TruckMaster_Dave",
    comments: [
      { id: "c1", userId: "u1", userName: "BigRig_Tony", text: "Easy dock, well marked. Guards are friendly. Plenty of parking in east lot.", date: "2024-01-10", rating: 5 },
      { id: "c2", userId: "u2", userName: "Road_Warrior_Lisa", text: "Scale is on the way in, plan for 20 min wait at peak times.", date: "2024-01-08", rating: 4 },
    ],
    openAllDay: false,
    restroomsAvailable: true,
    easyBacking: true,
    highRating: true,
    accessPoints: [
      { type: "entrance", label: "Main Truck Gate", description: "South entrance off Cicero Ave — semi trucks only, follow yellow arrows" },
      { type: "office", label: "Check-In Guard Shack", description: "Main gate shack, bring BOL and appointment confirmation" },
      { type: "dock", label: "Docks 1–120", description: "Follow yellow lane markings to assigned dock number" },
      { type: "scale", label: "Inbound Scale", description: "Scale located just inside main gate, mandatory for inbound loads" },
      { type: "parking", label: "East Lot Overnight Parking", description: "Large overnight lot east side, no hookups, safe and lit" },
    ],
    isClaimed: true,
    claimedByBusiness: { businessId: "biz_walmart", businessName: "Walmart Inc.", verified: true },
  },
  {
    id: "loc_002",
    companyName: "Amazon Fulfillment Center DFW",
    address: "700 Westport Pkwy",
    city: "Haslet",
    state: "TX",
    zipCode: "76052",
    latitude: 32.9782,
    longitude: -97.3394,
    category: "Dry Van",
    categoryColor: "#D22F30",
    bestEntrance: "West entrance only for semis. East entrance is passenger vehicles.",
    parkingAvailable: true,
    overnightParking: false,
    dockNumber: "200-350",
    dockType: "dock-door",
    checkInLocation: "Use Amazon Relay app to check in. Kiosk inside guard booth.",
    scaleAvailable: false,
    turningDifficulty: "easy",
    receivingHours: "24/7",
    requiresAppointment: true,
    contactPhone: "(817) 555-0287",
    specialInstructions: "Must use Amazon Relay app. Keep cab sealed, no walking inside. Driver lounge with WiFi available.",
    rating: 3.8,
    ratingCount: 512,
    trustScore: 91,
    verificationScore: 97,
    upvotes: 89,
    reportCount: 5,
    lastUpdated: "2024-01-12",
    submittedBy: "user_drv2",
    submittedByName: "Highway_Sam",
    comments: [
      { id: "c3", userId: "u3", userName: "SteelWheels_Mike", text: "Fast unload but long wait outside. Bring food and water. No overnight.", date: "2024-01-11", rating: 3 },
    ],
    openAllDay: true,
    restroomsAvailable: true,
    easyBacking: true,
    highRating: false,
    accessPoints: [
      { type: "entrance", label: "West Truck Entrance", description: "West gate ONLY for semis — east gate will turn you around" },
      { type: "office", label: "Amazon Relay Kiosk", description: "Kiosk inside guard booth, must check in via Amazon Relay app first" },
      { type: "dock", label: "Docks 200–350", description: "Dock assignment given at check-in kiosk" },
      { type: "parking", label: "Staging Lot", description: "Staging area west of guard booth, no overnight, max 2 hrs" },
    ],
  },
  {
    id: "loc_003",
    companyName: "Home Depot Receiving - LA",
    address: "2455 Pico Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90006",
    latitude: 34.0418,
    longitude: -118.2892,
    category: "Flatbed",
    categoryColor: "#F59E0B",
    bestEntrance: "Loading dock behind store, access from Hooper Ave",
    parkingAvailable: false,
    overnightParking: false,
    dockNumber: "1-4",
    dockType: "dock-door",
    checkInLocation: "Ring bell at dock 1. Receiving manager will assist.",
    scaleAvailable: false,
    turningDifficulty: "difficult",
    receivingHours: "Mon-Fri 7AM-4PM",
    requiresAppointment: false,
    contactPhone: "(323) 555-0391",
    specialInstructions: "TIGHT turning radius. 53ft trailers must approach from Hooper going south. Limited street parking.",
    rating: 2.9,
    ratingCount: 143,
    trustScore: 78,
    verificationScore: 85,
    upvotes: 18,
    reportCount: 12,
    lastUpdated: "2024-01-09",
    submittedBy: "user_drv3",
    submittedByName: "WestCoast_Carlos",
    comments: [
      { id: "c4", userId: "u4", userName: "CityDriver_Bob", text: "Worst dock in LA. Extremely tight. Call ahead and get early slot.", date: "2024-01-07", rating: 2 },
      { id: "c5", userId: "u5", userName: "Trucker_Maria", text: "Difficult but manageable if you know what you're doing.", date: "2024-01-06", rating: 3 },
    ],
    openAllDay: false,
    restroomsAvailable: false,
    easyBacking: false,
    highRating: false,
    accessPoints: [
      { type: "entrance", label: "Hooper Ave Dock Access", description: "Approach from Hooper Ave heading SOUTH — do NOT attempt from Pico Blvd in a 53ft" },
      { type: "dock", label: "Docks 1–4", description: "Ring bell at dock 1, extremely tight — recommend using a spotter" },
    ],
  },
  {
    id: "loc_004",
    companyName: "Sysco Foods Warehouse",
    address: "5900 San Felipe Blvd",
    city: "Houston",
    state: "TX",
    zipCode: "77057",
    latitude: 29.7561,
    longitude: -95.5368,
    category: "Reefer",
    categoryColor: "#3B82F6",
    bestEntrance: "Main gate off San Felipe, scale just inside gate",
    parkingAvailable: true,
    overnightParking: true,
    dockNumber: "1-75",
    dockType: "dock-door",
    checkInLocation: "Scale house, weigh in/out required",
    scaleAvailable: true,
    turningDifficulty: "easy",
    receivingHours: "24/7 Receiving, Shipping Mon-Fri 5AM-9PM",
    requiresAppointment: false,
    contactPhone: "(713) 555-0445",
    specialInstructions: "Food safety compliance required. No pets. Clean cab inspection possible. Temp-controlled docks available.",
    photos: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=400&fit=crop",
    ],
    rating: 4.5,
    ratingCount: 389,
    trustScore: 97,
    verificationScore: 99,
    upvotes: 201,
    reportCount: 1,
    lastUpdated: "2024-01-14",
    submittedBy: "user_drv4",
    submittedByName: "Southern_Routes_Jim",
    comments: [
      { id: "c6", userId: "u6", userName: "FoodHauler_Rex", text: "Best facility in Houston. Organized, clean, fast turnaround. Overnight lot is safe.", date: "2024-01-13", rating: 5 },
    ],
    openAllDay: true,
    restroomsAvailable: true,
    easyBacking: true,
    highRating: true,
    accessPoints: [
      { type: "entrance", label: "Main Gate – San Felipe", description: "Main gate entrance off San Felipe Blvd, scale just inside" },
      { type: "scale", label: "Weigh In/Out Scale", description: "Mandatory weigh in and out at scale house — bring paperwork" },
      { type: "dock", label: "Temp-Controlled Docks 1–75", description: "Reefer docks, keep refer running until dock assignment confirmed" },
      { type: "parking", label: "Overnight Lot", description: "Safe overnight parking available, well lit, security patrols" },
      { type: "office", label: "Receiving Office", description: "Inside main building, bring clean bill of lading for food compliance" },
    ],
  },
  {
    id: "loc_005",
    companyName: "Target Distribution Center",
    address: "3900 Central Ave NE",
    city: "Minneapolis",
    state: "MN",
    zipCode: "55421",
    latitude: 45.0275,
    longitude: -93.2541,
    category: "Dry Van",
    categoryColor: "#D22F30",
    bestEntrance: "Central Ave entrance, follow green signs to inbound docks",
    parkingAvailable: true,
    overnightParking: false,
    dockNumber: "A1-A80",
    dockType: "dock-door",
    checkInLocation: "Inbound office, dock A building",
    scaleAvailable: true,
    turningDifficulty: "moderate",
    receivingHours: "Sun-Fri 5AM-11PM",
    requiresAppointment: true,
    contactPhone: "(612) 555-0562",
    specialInstructions: "Arrive 15 min early. Lumper service required for most loads. ID required at gate.",
    rating: 4.0,
    ratingCount: 256,
    trustScore: 90,
    verificationScore: 94,
    upvotes: 67,
    reportCount: 3,
    lastUpdated: "2024-01-11",
    submittedBy: "user_drv5",
    submittedByName: "NorthStar_Trucker",
    comments: [],
    openAllDay: false,
    restroomsAvailable: true,
    easyBacking: false,
    highRating: true,
    accessPoints: [
      { type: "entrance", label: "Central Ave Inbound Gate", description: "Follow green signs after gate, inbound only lane" },
      { type: "office", label: "Inbound Check-In Office", description: "Dock A building, present ID and appointment confirmation" },
      { type: "dock", label: "Docks A1–A80", description: "Lumper service required most loads, coordinate at check-in office" },
      { type: "scale", label: "Inbound Scale", description: "Scale on inbound road, mandatory before dock assignment" },
    ],
  },
  {
    id: "loc_006",
    companyName: "FedEx Ground Distribution Hub",
    address: "6001 Lamar Ave",
    city: "Memphis",
    state: "TN",
    zipCode: "38118",
    latitude: 35.0514,
    longitude: -89.9455,
    category: "Freight / Courier",
    categoryColor: "#8B5CF6",
    bestEntrance: "Truck entrance off Winchester Rd, bypass passenger entrance",
    parkingAvailable: true,
    overnightParking: false,
    dockNumber: "T1-T200",
    dockType: "drive-in",
    checkInLocation: "Arrival board at truck entrance, touch screen check-in",
    scaleAvailable: false,
    turningDifficulty: "easy",
    receivingHours: "24/7",
    requiresAppointment: false,
    contactPhone: "(901) 555-0671",
    specialInstructions: "Busy 24/7. Peak hours 8-11PM. Fast unload typical. Driver lounge and showers available.",
    rating: 4.3,
    ratingCount: 621,
    trustScore: 95,
    verificationScore: 98,
    upvotes: 178,
    reportCount: 2,
    lastUpdated: "2024-01-13",
    submittedBy: "user_drv6",
    submittedByName: "MidSouth_Mitch",
    comments: [
      { id: "c7", userId: "u7", userName: "Memphis_Hauler", text: "Great facility. Showers are clean, lounge has good food options nearby.", date: "2024-01-12", rating: 5 },
    ],
    openAllDay: true,
    restroomsAvailable: true,
    easyBacking: true,
    highRating: true,
    accessPoints: [
      { type: "entrance", label: "Winchester Rd Truck Gate", description: "Truck-only gate off Winchester Rd, DO NOT use passenger entrance on Lamar" },
      { type: "office", label: "Touch-Screen Check-In", description: "Arrival board kiosk at truck entrance, no paper needed" },
      { type: "dock", label: "Drive-In Docks T1–T200", description: "Drive-in style docks, fast turnaround — average 45 min unload" },
      { type: "parking", label: "Driver Services Lot", description: "Lounge and showers available, parking while using amenities only" },
    ],
  },
  {
    id: "loc_007",
    companyName: "Costco Warehouse - Receiving",
    address: "4401 4th Ave S",
    city: "Seattle",
    state: "WA",
    zipCode: "98134",
    latitude: 47.5608,
    longitude: -122.3237,
    category: "Bulk/Tanker",
    categoryColor: "#22C55E",
    bestEntrance: "South dock entrance, DO NOT use member entrance on 4th Ave",
    parkingAvailable: true,
    overnightParking: false,
    dockNumber: "1-12",
    dockType: "dock-door",
    checkInLocation: "Receiving office, enter through dock 1",
    scaleAvailable: false,
    turningDifficulty: "moderate",
    receivingHours: "Mon-Fri 6AM-2PM",
    requiresAppointment: true,
    contactPhone: "(206) 555-0784",
    specialInstructions: "Strictly appointment only. Early arrivals turned away. Pallet jacks provided. Friendly receiving staff.",
    rating: 4.1,
    ratingCount: 178,
    trustScore: 87,
    verificationScore: 92,
    upvotes: 44,
    reportCount: 4,
    lastUpdated: "2024-01-10",
    submittedBy: "user_drv7",
    submittedByName: "PNW_Trucker_Dan",
    comments: [
      { id: "c8", userId: "u8", userName: "PacificHwy_Ann", text: "On-time appointment critical. They will NOT take you early or late. Smooth once inside.", date: "2024-01-09", rating: 4 },
    ],
    openAllDay: false,
    restroomsAvailable: true,
    easyBacking: false,
    highRating: true,
    accessPoints: [
      { type: "entrance", label: "South Dock Entrance", description: "South side of building ONLY — member entrance on 4th Ave will not let trucks through" },
      { type: "office", label: "Receiving Office", description: "Enter through dock 1 door, receiving staff will direct you" },
      { type: "dock", label: "Docks 1–12", description: "Pallet jacks provided at each dock, wait for staff direction" },
    ],
  },
  {
    id: "loc_008",
    companyName: "UPS Supply Chain Solutions",
    address: "1001 UPS Way",
    city: "Louisville",
    state: "KY",
    zipCode: "40213",
    latitude: 38.1663,
    longitude: -85.7285,
    category: "Freight / Courier",
    categoryColor: "#8B5CF6",
    bestEntrance: "East Gate, 24 hour access with seal intact shipments",
    parkingAvailable: true,
    overnightParking: true,
    dockNumber: "E1-E150",
    dockType: "dock-door",
    checkInLocation: "East Gate security, present seal number",
    scaleAvailable: true,
    turningDifficulty: "easy",
    receivingHours: "24/7",
    requiresAppointment: false,
    contactPhone: "(502) 555-0893",
    specialInstructions: "24/7 operation. Overnight parking permitted in east lot. Scale mandatory inbound. Driver services building open 24hr.",
    rating: 4.6,
    ratingCount: 843,
    trustScore: 98,
    verificationScore: 99,
    upvotes: 412,
    reportCount: 0,
    lastUpdated: "2024-01-15",
    submittedBy: "user_drv8",
    submittedByName: "Bluegrass_Hauler",
    comments: [
      { id: "c9", userId: "u9", userName: "I65_Driver", text: "World-class facility. Best driver amenities anywhere. Showers, restaurant, gym access.", date: "2024-01-14", rating: 5 },
      { id: "c10", userId: "u10", userName: "Midwest_Trucking_Co", text: "Always reliable, never had issues here in 8 years.", date: "2024-01-13", rating: 5 },
    ],
    openAllDay: true,
    restroomsAvailable: true,
    easyBacking: true,
    highRating: true,
    accessPoints: [
      { type: "entrance", label: "East Gate (24hr Access)", description: "East Gate open 24/7, present seal number to security guard" },
      { type: "scale", label: "Mandatory Inbound Scale", description: "Scale just past east gate, all inbound loads must weigh" },
      { type: "office", label: "Driver Services Building", description: "Open 24hr — showers, restaurant, gym, lounge with WiFi" },
      { type: "dock", label: "Docks E1–E150", description: "East dock complex, dock assignment at check-in kiosk inside east gate" },
      { type: "parking", label: "East Lot Overnight", description: "Secured overnight lot, guard patrols, no hookups" },
      { type: "fuel", label: "On-Site DEF & Diesel", description: "Fuel station on premises, open 24hr, accepts all major fleet cards" },
    ],
  },
];

interface LocationsContextType {
  locations: DeliveryLocation[];
  isLoading: boolean;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  addLocation: (location: Omit<DeliveryLocation, "id" | "rating" | "ratingCount" | "trustScore" | "verificationScore" | "upvotes" | "reportCount" | "lastUpdated" | "comments" | "highRating" | "categoryColor"> & { categoryColor?: string }) => void;
  addComment: (locationId: string, comment: Omit<LocationComment, "id" | "date">) => void;
  rateLocation: (locationId: string, rating: number) => void;
  upvoteLocation: (locationId: string) => void;
  reportLocation: (locationId: string) => void;
  addPhotosToLocation: (locationId: string, photos: string[]) => void;
  getLocation: (id: string) => DeliveryLocation | undefined;
  filteredLocations: (query: string) => DeliveryLocation[];
  claimLocation: (locationId: string, businessId: string, businessName: string) => void;
}

const LocationsContext = createContext<LocationsContextType | null>(null);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    AsyncStorage.getItem("everstop_locations_v3").then((data) => {
      if (data) {
        const parsed = JSON.parse(data) as DeliveryLocation[];
        setLocations(parsed.length > 0 ? parsed : SEED_LOCATIONS);
      } else {
        setLocations(SEED_LOCATIONS);
        AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(SEED_LOCATIONS));
      }
      setIsLoading(false);
    });
  }, []);

  const saveLocations = useCallback(async (locs: DeliveryLocation[]) => {
    setLocations(locs);
    await AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(locs));
  }, []);

  const addLocation = useCallback((loc: Omit<DeliveryLocation, "id" | "rating" | "ratingCount" | "trustScore" | "verificationScore" | "upvotes" | "reportCount" | "lastUpdated" | "comments" | "highRating" | "categoryColor"> & { categoryColor?: string }) => {
    const newLoc: DeliveryLocation = {
      ...loc,
      id: "loc_" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      rating: 0,
      ratingCount: 0,
      trustScore: 50,
      verificationScore: 50,
      upvotes: 0,
      reportCount: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
      comments: [],
      highRating: false,
    };
    setLocations((prev) => {
      const updated = [newLoc, ...prev];
      AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addComment = useCallback((locationId: string, comment: Omit<LocationComment, "id" | "date">) => {
    setLocations((prev) => {
      const updated = prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        const newComment: LocationComment = {
          ...comment,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          date: new Date().toISOString().split("T")[0],
        };
        return { ...loc, comments: [newComment, ...loc.comments] };
      });
      AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const rateLocation = useCallback((locationId: string, rating: number) => {
    setLocations((prev) => {
      const updated = prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        const newCount = loc.ratingCount + 1;
        const newRating = (loc.rating * loc.ratingCount + rating) / newCount;
        return { ...loc, rating: Math.round(newRating * 10) / 10, ratingCount: newCount, highRating: newRating >= 4.0 };
      });
      AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const upvoteLocation = useCallback((locationId: string) => {
    setLocations((prev) => {
      const updated = prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        const newUpvotes = (loc.upvotes ?? 0) + 1;
        const newVerificationScore = Math.min(100, loc.verificationScore + 1);
        const newTrustScore = Math.min(100, loc.trustScore + 1);
        return { ...loc, upvotes: newUpvotes, verificationScore: newVerificationScore, trustScore: newTrustScore };
      });
      AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const reportLocation = useCallback((locationId: string) => {
    setLocations((prev) => {
      const updated = prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        return { ...loc, reportCount: (loc.reportCount ?? 0) + 1 };
      });
      AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addPhotosToLocation = useCallback((locationId: string, newPhotos: string[]) => {
    setLocations((prev) => {
      const updated = prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        return { ...loc, photos: [...(loc.photos ?? []), ...newPhotos] };
      });
      AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const claimLocation = useCallback((locationId: string, businessId: string, businessName: string) => {
    setLocations((prev) => {
      const updated = prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        return { ...loc, isClaimed: true, claimedByBusiness: { businessId, businessName, verified: true } };
      });
      AsyncStorage.setItem("everstop_locations_v3", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getLocation = useCallback((id: string) => locations.find((l) => l.id === id), [locations]);

  const filteredLocations = useCallback((query: string) => {
    return locations.filter((loc) => {
      const q = query.toLowerCase();
      if (q && !loc.companyName.toLowerCase().includes(q) &&
          !loc.city.toLowerCase().includes(q) &&
          !loc.state.toLowerCase().includes(q) &&
          !loc.address.toLowerCase().includes(q)) return false;
      if (filters.overnightParking && !loc.overnightParking) return false;
      if (filters.truckEntrance && !loc.bestEntrance) return false;
      if (filters.easyBacking && !loc.easyBacking) return false;
      if (filters.difficultBacking && loc.turningDifficulty !== "difficult") return false;
      if (filters.open24Hours && !loc.openAllDay) return false;
      if (filters.restroomsAvailable && !loc.restroomsAvailable) return false;
      if (filters.scaleAvailable && !loc.scaleAvailable) return false;
      if (filters.highRating && loc.rating < 4.0) return false;
      return true;
    });
  }, [locations, filters]);

  return (
    <LocationsContext.Provider value={{ locations, isLoading, filters, setFilters, addLocation, addComment, rateLocation, upvoteLocation, reportLocation, addPhotosToLocation, claimLocation, getLocation, filteredLocations }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocations must be used within LocationsProvider");
  return ctx;
}
