import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface StoredProfile {
  id: string;
  name: string;
  avatar: string | null;
  chips: number;
  xp: number;
}

const storePath = join(process.cwd(), 'server', 'data', 'profiles.json');
let profiles: Record<string, StoredProfile> = {};

if (existsSync(storePath)) {
  try {
    profiles = JSON.parse(readFileSync(storePath, 'utf8'));
  } catch {
    profiles = {};
  }
}

export function getProfile(id: string, fallback: Omit<StoredProfile, 'id'>): StoredProfile {
  if (!profiles[id]) {
    profiles[id] = { id, ...fallback };
    saveProfile(profiles[id]);
  }
  return profiles[id];
}

export function saveProfile(profile: StoredProfile) {
  profiles[profile.id] = profile;
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(profiles, null, 2));
}
