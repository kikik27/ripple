export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_step",
    title: "First Step",
    desc: "Awaken in Himalayan Haven and prepare for the journey.",
    icon: "/assets/branding/ripple_emblem_1024.png",
  },
  {
    id: "highland_trail",
    title: "Highland Wayfarer",
    desc: "Inspect and stamp all 4 wayposts on the Highland Mail Trail.",
    icon: "/assets/branding/ripple_emblem_1024.png",
  },
  {
    id: "greet_neighbors",
    title: "Friendly Face",
    desc: "Introduce yourself to three neighbors in Komodo Grove.",
    icon: "/assets/living/icons/lw_icon_seed.png",
  },
  {
    id: "first_harvest",
    title: "Green Thumb",
    desc: "Tend the soil and harvest ripe crops from the garden plot.",
    icon: "/assets/living/icons/lw_icon_produce.png",
  },
  {
    id: "eastbank_flow",
    title: "Lifeblood Restored",
    desc: "Survey and balance the water gates to revive Eastbank Nursery.",
    icon: "/assets/icons/icon_water_canister.png",
  },
  {
    id: "master_angler",
    title: "Master Angler",
    desc: "Watch the float and reel in a fresh river fish at the village dock.",
    icon: "/assets/living/sprites/lw_animal_fish.png",
  },
  {
    id: "animal_friend",
    title: "Sanctuary Guardian",
    desc: "Feed or play with an animal friend in the sanctuary.",
    icon: "/assets/living/icons/lw_icon_hay.png",
  },
  {
    id: "water_to_homes",
    title: "Operation Komodo",
    desc: "Construct the community well and connect clean water to both homes.",
    icon: "/assets/icons/icon_water.png",
  },
];

const STORAGE_KEY = "ripple.achievements.v1";

export function getUnlockedAchievements(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isAchievementUnlocked(id: string): boolean {
  return getUnlockedAchievements().includes(id);
}

export function unlockAchievement(
  id: string,
  onUnlock?: (achievement: Achievement) => void,
): boolean {
  try {
    const unlocked = getUnlockedAchievements();
    if (unlocked.includes(id)) return false;
    unlocked.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (ach) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ripple:achievement", { detail: ach }));
      }
      if (onUnlock) {
        onUnlock(ach);
      }
    }
    return true;
  } catch {
    return false;
  }
}
