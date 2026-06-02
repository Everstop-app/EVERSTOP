import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type TurningDifficulty = "easy" | "moderate" | "difficult";
export type DockType = "dock-door" | "ground-level" | "drive-in" | "none";

export interface LocationComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  date: string;
  rating: number;
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
  bestEntrance?: string;
  parkingAvailable: boolean;
  overnightParking: boolean;
  dockNumber?: string;
  dockType: DockType;
  checkInLocation?: string;
  scaleAvailable: boolean;
  turningDifficulty: TurningDifficulty;
  receivingHours?: string;
  requiresAppointment: boolean;
  contactPhone?: string;
  specialInstructions?: string;
  rating: number;
  ratingCount: number;
  trustScore: number;
  verificationScore: number;
  lastUpdated: string;
  submittedBy: string;
  submittedByName: string;
  comments: LocationComment[];
  openAllDay: boolean;
  restroomsAvailable: boolean;
  easyBacking: boolean;
  highRating: boolean;
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
    category: "Distribution Center",
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
    category: "Fulfillment Center",
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
    category: "Retail",
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
    category: "Food & Beverage",
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
    rating: 4.5,
    ratingCount: 389,
    trustScore: 97,
    verificationScore: 99,
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
    category: "Distribution Center",
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
    lastUpdated: "2024-01-11",
    submittedBy: "user_drv5",
    submittedByName: "NorthStar_Trucker",
    comments: [],
    openAllDay: false,
    restroomsAvailable: true,
    easyBacking: false,
    highRating: true,
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
    category: "Retail",
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
  },
];

interface LocationsContextType {
  locations: DeliveryLocation[];
  isLoading: boolean;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  addLocation: (location: Omit<DeliveryLocation, "id" | "rating" | "ratingCount" | "trustScore" | "verificationScore" | "lastUpdated" | "comments" | "highRating">) => void;
  addComment: (locationId: string, comment: Omit<LocationComment, "id" | "date">) => void;
  rateLocation: (locationId: string, rating: number) => void;
  getLocation: (id: string) => DeliveryLocation | undefined;
  filteredLocations: (query: string) => DeliveryLocation[];
}

const LocationsContext = createContext<LocationsContextType | null>(null);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    AsyncStorage.getItem("everstop_locations").then((data) => {
      if (data) {
        const parsed = JSON.parse(data) as DeliveryLocation[];
        setLocations(parsed.length > 0 ? parsed : SEED_LOCATIONS);
      } else {
        setLocations(SEED_LOCATIONS);
        AsyncStorage.setItem("everstop_locations", JSON.stringify(SEED_LOCATIONS));
      }
      setIsLoading(false);
    });
  }, []);

  const saveLocations = useCallback(async (locs: DeliveryLocation[]) => {
    setLocations(locs);
    await AsyncStorage.setItem("everstop_locations", JSON.stringify(locs));
  }, []);

  const addLocation = useCallback((loc: Omit<DeliveryLocation, "id" | "rating" | "ratingCount" | "trustScore" | "verificationScore" | "lastUpdated" | "comments" | "highRating">) => {
    const newLoc: DeliveryLocation = {
      ...loc,
      id: "loc_" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      rating: 0,
      ratingCount: 0,
      trustScore: 50,
      verificationScore: 50,
      lastUpdated: new Date().toISOString().split("T")[0],
      comments: [],
      highRating: false,
    };
    setLocations((prev) => {
      const updated = [newLoc, ...prev];
      AsyncStorage.setItem("everstop_locations", JSON.stringify(updated));
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
      AsyncStorage.setItem("everstop_locations", JSON.stringify(updated));
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
      AsyncStorage.setItem("everstop_locations", JSON.stringify(updated));
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
    <LocationsContext.Provider value={{ locations, isLoading, filters, setFilters, addLocation, addComment, rateLocation, getLocation, filteredLocations }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocations must be used within LocationsProvider");
  return ctx;
}
