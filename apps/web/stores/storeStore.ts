import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  city: string;
  deliveryFee: number;
  minOrderAmount: number;
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
}

interface StoreState {
  currentStore: StoreInfo | null;
  availableStores: StoreInfo[];
  location: { lat: number; lng: number } | null;
  loading: boolean;
  notServiceable: boolean;
  setStore: (store: StoreInfo) => void;
  detectStore: (lat: number, lng: number) => Promise<void>;
  clearStore: () => void;
  setLocation: (lat: number, lng: number) => void;
  detectByPincode: (pincode: string) => Promise<void>;
}

export const useStoreStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentStore: null,
      availableStores: [],
      location: null,
      loading: false,
      notServiceable: false,

      setStore: (store) => {
        set({ currentStore: store, notServiceable: false });
      },

      detectStore: async (lat, lng) => {
        set({ loading: true, location: { lat, lng }, notServiceable: false });
        try {
          const { data } = await api.get(`/stores/nearby?lat=${lat}&lng=${lng}`);
          const stores: StoreInfo[] = data.data || [];

          if (stores.length === 0) {
            set({ currentStore: null, availableStores: [], loading: false, notServiceable: true });
            return;
          }

          // Auto-select nearest store
          set({
            currentStore: stores[0],
            availableStores: stores,
            loading: false,
            notServiceable: false,
          });
        } catch {
          set({ loading: false, notServiceable: true });
        }
      },

      clearStore: () => {
        set({ currentStore: null, availableStores: [], location: null, notServiceable: false });
      },

      setLocation: (lat, lng) => {
        set({ location: { lat, lng } });
      },

      detectByPincode: async (pincode) => {
        set({ loading: true, notServiceable: false });
        try {
          // Geocode pincode using a simple mapping (could use external API in production)
          const pincodeCoords: Record<string, { lat: number; lng: number }> = {
            "400001": { lat: 19.076, lng: 72.8777 }, // Mumbai
            "400002": { lat: 19.0896, lng: 72.8656 },
            "110001": { lat: 28.6139, lng: 77.209 }, // Delhi
            "560001": { lat: 12.9716, lng: 77.5946 }, // Bangalore
            "600001": { lat: 13.0827, lng: 80.2707 }, // Chennai
            "500001": { lat: 17.385, lng: 78.4867 }, // Hyderabad
            "700001": { lat: 22.5726, lng: 88.3639 }, // Kolkata
            "380001": { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
            "411001": { lat: 18.5204, lng: 73.8567 }, // Pune
            "395001": { lat: 21.1702, lng: 72.8311 }, // Surat
          };
          
          const coords = pincodeCoords[pincode];
          if (!coords) {
            // Try Nominatim (OpenStreetMap) as fallback
            try {
              const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`);
              const data = await response.json();
              if (data.length > 0) {
                await get().detectStore(parseFloat(data[0].lat), parseFloat(data[0].lon));
                return;
              }
            } catch {}
            
            set({ loading: false, notServiceable: true });
            return;
          }
          
          await get().detectStore(coords.lat, coords.lng);
        } catch {
          set({ loading: false, notServiceable: true });
        }
      },
    }),
    {
      name: "instamart-store",
      partialize: (state) => ({
        currentStore: state.currentStore,
        location: state.location,
      }),
    }
  )
);
