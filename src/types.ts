export type StatKey = "strength" | "dexterity" | "intelligence" | "charisma";
export type RulesetId = "wbc3-10323" | "protectors";

export type PrimaryStats = Record<StatKey, number>;

export interface DataNote {
  topic: string;
  verified: boolean;
}

export interface SkillUnlock {
  skillId: string;
  origin: "race" | "class";
  availableAt: number;
  startingLevel: number;
  dataNote: DataNote;
  passive?: boolean;
}

export interface HeroRace {
  id: string;
  enumName: string;
  displayName: string;
  statMods: PrimaryStats;
  skills: SkillUnlock[];
  dataNote: DataNote;
}

export interface HeroClass {
  id: string;
  enumName: string;
  displayName: string;
  statMods: PrimaryStats;
  baseMana: number;
  baseArmor: number;
  baseResistance: number;
  baseLife: number;
  lifePerLevel: number;
  skills: SkillUnlock[];
  dataNote: DataNote;
}

export interface HeroSkill {
  id: string;
  enumName: string;
  displayName: string;
  category: string;
}

export interface CharacterBuild {
  rulesetId: RulesetId;
  name?: string;
  raceId: string;
  classId: string;
  level: number;
  portraitId?: number;
  avatarId?: string;
  statAllocation: PrimaryStats;
  skillAllocation: Record<string, number>;
}

export interface SavedBuild extends CharacterBuild {
  id: string;
  name: string;
  origin?: string;
  imported?: boolean;
}

export interface PointBudget {
  mode: "separate" | "shared";
  label: string;
  statLabel: string;
  skillLabel: string;
  statSpent: number;
  skillSpent: number;
  statCost: number;
  skillCost: number;
  available?: number;
  spent?: number;
  remaining?: number;
  statAvailable?: number;
  skillAvailable?: number;
}

export interface RegenSummary {
  periodMs: number;
  pointsPer20Seconds: number;
  skillBonusPercent: number;
}

export interface AttackSpeedSummary {
  periodMs: number;
  multiplier: number;
  bonusPercent: number;
  dexterityBonus: number;
  swiftnessBonus: number;
  fightSpeed: number;
}

export interface MerchantSummary {
  score: number;
  discountPercent: number;
}

export interface DamageResistances {
  piercing: number;
  slashing: number;
  crushing: number;
  fire: number;
  cold: number;
  electricity: number;
  magic: number;
}

export interface HeroSummary {
  level: number;
  xpForLevel: number;
  nextLevelXp: number | null;
  stats: PrimaryStats;
  skillLevels: Record<string, number>;
  combat: number;
  speed: number;
  attackSpeed: AttackSpeedSummary;
  life: number;
  mana: number;
  damage: number;
  damageType: string;
  armor: number;
  resistance: number;
  damageResistances: DamageResistances;
  lifeRegen: RegenSummary;
  manaRegen: RegenSummary;
  spellcasting: number;
  initialTroopXp: number;
  morale: number;
  merchant: MerchantSummary;
  armySetupPoints: number;
  commandRadius: number;
  command: number;
  groupLimit: number;
  conversion: number;
  conversionTime: number;
  conversionRange: number;
  armyLimitBonus: number;
  retinueSlots: number;
}
