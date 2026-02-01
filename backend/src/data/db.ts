import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
export interface User {
  id: string;
  email: string;
  password: string;
  role: string;
}

export interface Band {
  id: string;
  band_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  genre: string;
  member_count: string;
  music_sample_link: string;
  bio: string;
  set_length: string;
  venmo_handle: string | null;
  instagram: string | null;
  spotify: string | null;
  soundcloud: string | null;
  bandcamp: string | null;
  facebook: string | null;
  website: string | null;
  scheduling_notes: string | null;
  equipment_consent: string;
  payment_consent: string;
  timeline_consent: string;
  has_photo: boolean;
  photo_filename: string | null;
  questions_comments: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  // Scheduling fields
  assigned_porch_id: string | null;
  set_start_time: string | null;
  set_end_time: string | null;
}

export interface Porch {
  id: string;
  owner_name: string;
  email: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  has_power: boolean;
  parking_notes: string | null;
  accessibility_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  event_id: string;
  start_time: string;
  end_time: string;
}

// Data stores
export const users: Map<string, User> = new Map();
export const bands: Map<string, Band> = new Map();
export const porches: Map<string, Porch> = new Map();
export const events: Map<string, Event> = new Map();
export const timeSlots: Map<string, TimeSlot> = new Map();

// Load mock data from JSON file
function loadMockData() {
  try {
    const mockDataPath = join(__dirname, "mock-data.json");
    const rawData = readFileSync(mockDataPath, "utf-8");
    const data = JSON.parse(rawData);

    // Load users (hash the admin password properly)
    if (data.users) {
      for (const user of data.users) {
        // For the admin user, use a fresh hash
        if (user.email === "martelly.lisa@gmail.com") {
          user.password = bcrypt.hashSync("password", 10);
        }
        users.set(user.email, user);
      }
    }

    // Load bands
    if (data.bands) {
      for (const band of data.bands) {
        bands.set(band.id, band);
      }
    }

    // Load porches
    if (data.porches) {
      for (const porch of data.porches) {
        porches.set(porch.id, porch);
      }
    }

    // Load events
    if (data.events) {
      for (const event of data.events) {
        events.set(event.id, event);
      }
    }

    // Load time slots
    if (data.timeSlots) {
      for (const slot of data.timeSlots) {
        timeSlots.set(slot.id, slot);
      }
    }

    console.log(`✅ Loaded mock data:`);
    console.log(`   - ${users.size} users`);
    console.log(`   - ${bands.size} bands`);
    console.log(`   - ${porches.size} porches`);
    console.log(`   - ${events.size} events`);
    console.log(`   - ${timeSlots.size} time slots`);
  } catch (error) {
    console.error("Failed to load mock data:", error);
  }
}

// Initialize data on module load
loadMockData();
