import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DEFAULT_HERO_ANIMATION_ID,
  DEFAULT_HERO_COLOR,
  DEFAULT_HERO_DIRECTION,
  getAllAvatarOptions,
  getAvailableHeroAnimationTypes,
  getCommandRadiusSceneMetrics,
  getDefaultAvatarId,
  getHeroAnimation,
  heroAvatars,
  normalizeHeroAnimationId,
  normalizeAvatarId,
} from "./data/heroAvatars.js";
import { importedHeroBuilds, importedHeroBuildMetadata } from "./data/importedHeroBuilds.js";
import {
  getDefaultPortraitId,
  getPortraitOptions,
  getUpscaledPortraitSrc,
} from "./data/portraits.js";
import {
  defaultSpellPreviewId,
  getSpellPreview,
  getSpellPreviewEffectIds,
  normalizeSpellPreviewId,
  spellPreviewGroups,
  spellPreviewSpells,
} from "./data/spellEffects.js";
import { statIcons, summaryIconKeys } from "./data/statIcons.js";
import {
  VANILLA_RULESET_ID,
  defaultRulesetId,
  getRuleset,
  normalizeRulesetId,
  rulesetOptions,
} from "./rules/rulesets.js";

const statLabels = {
  strength: "Strength",
  dexterity: "Dexterity",
  intelligence: "Intelligence",
  charisma: "Charisma",
};

const savedBuildStorageKey = "wbc3-character-planner.savedBuilds.v1";
const rulesetStorageKey = "wbc3-character-planner.ruleset.v1";
const draftStorageKey = "wbc3-character-planner.drafts.v1";
const themeStorageKey = "wbc3-character-planner.theme.v1";
const itemLevelFilters = [
  { id: "all", label: "All" },
  { id: "artifact", label: "Artifact" },
  { id: "set", label: "Set" },
];
const itemSearchPageSize = 8;
const moraleViewModes = new Set(["general", "racial"]);

document.title = "Warlords Battlecry 3 - Character Planner";

let theme = loadThemePreference();
applyTheme(theme);

let activeRulesetId = loadRulesetPreference();
let HERO_MAX_LEVEL;
let heroClasses;
let races;
let skillsById;
let calculateHeroSummary;
let calculateStartingStats;
let clampLevel;
let getAvailableSkillUnlocks;
let getPointBudget;
let normalizeSkillAllocation;
let normalizeStatAllocation;
let validateSkillAllocation;
let validateStatAllocation;
refreshActiveRulesetReferences();

let rulesetDrafts;
let build;
let savedBuilds;
let activeSavedBuildId = null;
let localPathStatus = null;
let importedBuildMetadata = importedHeroBuildMetadata;
let localHeroImportError = "";
let localSettingsStatus = "";
let localItemCatalog = [];
let localItemCatalogError = "";
let localItemShineSprites = {};
let localItemSets = [];
let localSpellTextByIndex = new Map();
let localSpellTextError = "";
let localSkillTextById = new Map();
let localSkillMagicTemplates = {};
let localSkillTextError = "";
let itemSearchQuery = "";
let itemLevelFilter = "all";
let itemSlotFilter = "all";
let itemSearchPage = 0;
let moraleViewMode = "racial";
let tooltipDismissHandlersBound = false;
let previewAnimationId = DEFAULT_HERO_ANIMATION_ID;
let heroPreviewExpanded = false;
let heroPreviewZoom = 1;
let heroPreviewDirection = DEFAULT_HERO_DIRECTION;
let heroPreviewAsset = null;
let heroPreviewAssetKey = "";
let heroPreviewAssetError = "";
let goldMinePreviewAsset = null;
let goldMinePreviewAssetError = "";
let grassTilePreviewAsset = null;
let grassTilePreviewAssetError = "";
let previewSpellId = defaultSpellPreviewId;
let activeSpellSphereId = spellPreviewGroups[0]?.id ?? "";
let heroPreviewFrame = 0;
let heroPreviewFrameElapsed = 0;
let goldMinePreviewFrame = 0;
let goldMinePreviewFrameElapsed = 0;
let goldMinePreviewLastTimestamp = 0;
let heroPreviewLastTimestamp = 0;
let heroPreviewRaf = 0;
let heroPreviewPrecacheStarted = false;
let heroPreviewPrecacheLoaded = 0;
let heroPreviewPrecacheTotal = 0;

const previewAssetCache = new Map();
const previewAssetRequests = new Map();

const previewMineOffsetCells = { x: 5, y: -2 };
const previewSpellTargetOffsetCells = { x: 4, y: -1 };
const heroPreviewPrecacheConcurrency = 3;
const heroPreviewLogicalWidth = 1216;
const heroPreviewLogicalHeight = 912;
const heroPreviewResolutionScale = 2;
const heroPreviewDirectionCount = 8;
const vanillaBaseWalkSpeed = 12;
const vanillaBaseWalkFrameMs = 90;

const spellSphereSkillIds = {
  healing: "magicHealing",
  summoning: "magicSummoning",
  nature: "magicNature",
  illusion: "magicIllusion",
  necromancy: "magicNecromancy",
  pyromancy: "magicPyromancy",
  alchemy: "magicAlchemy",
  runes: "magicRunes",
  ice: "magicIce",
  chaos: "magicChaos",
  poison: "magicPoison",
  divination: "magicDivination",
  arcane: "magicArcane",
  time: "magicTime",
};

const equipmentSlots = [
  { id: "head", label: "Head", accepts: [6, 7] },
  { id: "body", label: "Body", accepts: [2, 3] },
  { id: "weapon", label: "Weapon", accepts: [0, 1] },
  { id: "offhand", label: "Off Hand", accepts: [4, 8] },
  { id: "ring1", label: "Ring", accepts: [5, 10] },
  { id: "ring2", label: "Ring", accepts: [5, 10] },
  { id: "boots", label: "Boots", accepts: [9] },
];
const itemSlotFilters = [
  { id: "all", label: "All Slots", accepts: [] },
  ...equipmentSlots
    .filter((slot) => slot.id !== "ring2")
    .map((slot) => ({
      id: slot.id === "ring1" ? "ring" : slot.id,
      label: slot.label,
      accepts: slot.accepts,
    })),
];

const equipmentSlotsById = Object.fromEntries(equipmentSlots.map((slot) => [slot.id, slot]));

rulesetDrafts = loadRulesetDrafts();
build = rulesetDrafts.get(activeRulesetId) ?? createDefaultBuild(activeRulesetId);
savedBuilds = loadSavedBuilds();

const app = document.querySelector("#app");

function refreshActiveRulesetReferences() {
  activeRulesetId = normalizeRulesetId(activeRulesetId);
  const ruleset = getRuleset(activeRulesetId);
  HERO_MAX_LEVEL = ruleset.data.HERO_MAX_LEVEL;
  heroClasses = ruleset.data.heroClasses;
  races = ruleset.data.races;
  skillsById = ruleset.data.skillsById;
  calculateHeroSummary = ruleset.calculateHeroSummary;
  calculateStartingStats = ruleset.calculateStartingStats;
  clampLevel = ruleset.clampLevel;
  getAvailableSkillUnlocks = ruleset.getAvailableSkillUnlocks;
  getPointBudget = ruleset.getPointBudget;
  normalizeSkillAllocation = ruleset.normalizeSkillAllocation;
  normalizeStatAllocation = ruleset.normalizeStatAllocation;
  validateSkillAllocation = ruleset.validateSkillAllocation;
  validateStatAllocation = ruleset.validateStatAllocation;
}

function activeRuleset() {
  return getRuleset(activeRulesetId);
}

function buildWithLocalItemData(value) {
  if (activeRulesetId !== VANILLA_RULESET_ID) return value;
  return {
    ...value,
    itemCatalog: localItemCatalog,
    itemSets: localItemSets,
  };
}

function render() {
  rememberCurrentDraft();
  const summary = calculateHeroSummary(buildWithLocalItemData(build));
  const startingStats = calculateStartingStats(build.raceId, build.classId);
  const statValidation = validateStatAllocation(build);
  const skillValidation = validateSkillAllocation(build);
  const pointBudget = getPointBudget(build);
  const unlocks = getAvailableSkillUnlocks(build);
  const skillRows = getSkillRows(unlocks, summary);
  const effectsBySkill = groupSkillEffectsBySkill(summary.skillEffectList);
  const classOptions = getSortedHeroClasses();
  const race = races.find((entry) => entry.id === build.raceId);
  const heroClass = heroClasses.find((entry) => entry.id === build.classId);
  const avatarId = currentAvatarId();
  previewAnimationId = normalizeHeroAnimationId(avatarId, previewAnimationId);
  previewSpellId = normalizeSpellPreviewId(previewSpellId);

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div class="top-actions">
          ${rulesetMenu()}
          ${themeToggle()}
          ${localPathStatus ? settingsMenu(localPathStatus) : ""}
          <details class="saved-menu">
            <summary>
              <span>Saved Builds</span>
              <strong>${savedBuilds.length}</strong>
            </summary>
            <div class="saved-menu-panel">
              <div class="saved-heading">
                <h3>Saved Builds</h3>
                <button type="button" id="save-current-build">Save Current</button>
              </div>
              <div class="saved-list">
                ${savedBuilds.length ? savedBuilds.map((savedBuild) => savedBuildRow(savedBuild)).join("") : `<p class="empty-state">No saved builds yet.</p>`}
              </div>
              ${importedBuildMetadata.heroCount ? `<p class="import-note">${importedBuildMetadata.heroCount} imported from HeroData.xcr</p>` : ""}
              ${localHeroImportError ? `<p class="import-note is-error">${escapeHtml(localHeroImportError)}</p>` : ""}
            </div>
          </details>
        </div>
      </header>

      <section class="builder-grid">
        <aside class="panel identity-panel">
          <div class="panel-heading">
            <h2>Build</h2>
            <button type="button" id="reset-build-button" class="reset-build-button">Reset</button>
          </div>
          <div class="portrait-editor">
            <details class="portrait-menu">
              <summary aria-label="Choose portrait">
                <img src="${getUpscaledPortraitSrc(build.portraitId)}" alt="Hero portrait ${build.portraitId}" />
                <span>Change Portrait</span>
              </summary>
              <div class="portrait-options" role="listbox" aria-label="Portrait options">
                ${getPortraitOptions(build.raceId).map((id) => portraitOption(id)).join("")}
              </div>
            </details>
          </div>
          <label class="field">
            <span>Hero Name</span>
            <input
              id="hero-name-input"
              type="text"
              maxlength="40"
              placeholder="Enter hero name"
              title="Enter hero name"
              value="${escapeHtml(build.name ?? "")}"
            />
          </label>
          <label class="field">
            <span>Race</span>
            <select id="race-select">
              ${races.map((item) => option(item.id, item.displayName, build.raceId)).join("")}
            </select>
          </label>
          <label class="field">
            <span>Class</span>
            <select id="class-select">
              ${classOptions.map((item) => option(item.id, item.displayName, build.classId)).join("")}
            </select>
          </label>
          <div class="field">
            <span>Level</span>
            <div class="level-control">
              <input id="level-input" type="number" min="1" max="${HERO_MAX_LEVEL}" value="${build.level}" />
              <button type="button" id="level-50-button">Level 50</button>
            </div>
          </div>

          <div class="line-list">
            ${pointBudgetRows(pointBudget, statValidation, skillValidation)}
            <div><span>Level XP</span><strong>${summary.xpForLevel.toLocaleString()}</strong></div>
            <div><span>Next level XP</span><strong>${formatXp(summary.nextLevelXp)}</strong></div>
          </div>
          ${messages(statValidation.warnings)}
        </aside>

        <section class="panel strength-panel">
          ${statAllocator("strength", startingStats, statValidation, pointBudget, summary)}
          ${derivedStatsSection("", `
            ${derivedStatGroup([
              { label: "Life", value: summary.life, tooltip: statBreakdown(summary, "life") },
              { label: "Life Regen", value: formatRegen(summary.lifeRegen, "HP"), tooltip: statBreakdown(summary, "lifeRegen") },
              { label: "Combat", value: summary.combat, tooltip: statBreakdown(summary, "combat") },
              { label: "Damage", value: `${summary.damage} ${summary.damageType}`, tooltip: statBreakdown(summary, "damage") },
            ])}
          `)}
        </section>

        <section class="panel intelligence-panel">
          ${statAllocator("intelligence", startingStats, statValidation, pointBudget, summary)}
          ${derivedStatsSection("", `
            ${derivedStatGroup([
              { label: "Mana", value: summary.mana, tooltip: statBreakdown(summary, "mana") },
              { label: "Mana Regen", value: formatRegen(summary.manaRegen, "MP"), tooltip: statBreakdown(summary, "manaRegen") },
              { label: "Spellcasting", value: formatPercentBonus(summary.spellcasting), tooltip: statBreakdown(summary, "spellcasting") },
              { label: "Initial Troop XP", value: formatSignedValue(summary.initialTroopXp), tooltip: statBreakdown(summary, "initialTroopXp") },
            ])}
          `)}
        </section>

        <section class="panel dexterity-panel">
          ${statAllocator("dexterity", startingStats, statValidation, pointBudget, summary)}
          <div class="dexterity-grid">
            ${derivedStatsSection("", `
              ${derivedStatGroup([
                { label: "Speed", value: summary.speed, tooltip: statBreakdown(summary, "speed") },
                { label: "Attack Speed", value: formatAttackSpeed(summary.attackSpeed), tooltip: statBreakdown(summary, "attackSpeed") },
                { label: "Conversion Time", value: `${summary.conversionTime}s`, tooltip: statBreakdown(summary, "conversionTime") },
              ])}
            `)}
            ${defenseGroup("Armor", summary.armor, [
              ["Piercing", summary.damageResistances.piercing, "Piercing", statBreakdown(summary, "piercing")],
              ["Slashing", summary.damageResistances.slashing, "Slashing", statBreakdown(summary, "slashing")],
              ["Crushing", summary.damageResistances.crushing, "Crushing", statBreakdown(summary, "crushing")],
            ], summaryIconKeys.Armor, statBreakdown(summary, "armor"))}
            ${defenseGroup("Resistance", summary.resistance, [
              ["Fire", summary.damageResistances.fire, "fire", statBreakdown(summary, "fire")],
              ["Cold", summary.damageResistances.cold, "cold", statBreakdown(summary, "cold")],
              ["Electricity", summary.damageResistances.electricity, "electricity", statBreakdown(summary, "electricity")],
              ["Magic", summary.damageResistances.magic, "magic", statBreakdown(summary, "magic")],
            ], summaryIconKeys.Resistance, statBreakdown(summary, "resistance"))}
          </div>
        </section>

        <section class="panel charisma-panel">
          ${statAllocator("charisma", startingStats, statValidation, pointBudget, summary)}
          <div class="summary-grid">
            ${moraleEffectsSection(summary, race)}
            ${derivedStatsSection("", `
              ${derivedStatGroup([
                { label: "Merchant", value: formatMerchant(summary.merchant), tooltip: statBreakdown(summary, "merchant") },
                { label: "Command Radius", value: summary.commandRadius, tooltip: statBreakdown(summary, "commandRadius") },
                { label: "Army Setup Points", value: formatSignedValue(summary.armySetupPoints), tooltip: statBreakdown(summary, "armySetupPoints") },
              ])}
            `)}
          </div>
        </section>

        <section class="panel skills-panel">
          <div class="panel-heading">
            <h2>Skills</h2>
            <span>${skillBudgetText(skillValidation, pointBudget)}</span>
          </div>
          <div class="skills-list">
            ${skillRows.map((unlock) => skillRow(unlock, skillValidation, pointBudget, effectsBySkill.get(unlock.skillId) ?? [], summary)).join("")}
          </div>
          ${messages(skillValidation.warnings)}
          ${localSkillTextError ? `<p class="import-note is-error">${escapeHtml(localSkillTextError)}</p>` : ""}
        </section>

        ${spellSpheresPanel(summary)}
        ${itemsPanel()}
      </section>

      ${heroPreviewPanel(summary, race, heroClass, avatarId)}
    </main>
  `;

  bindEvents();
  precacheHeroPreviewAssets();
  if (heroPreviewExpanded) {
    startHeroPreview(summary, avatarId);
  } else {
    stopHeroPreview();
  }
  updateHeroPreviewCacheStatus();
}

function bindEvents() {
  bindExclusiveTopbarMenus();
  bindExclusiveTooltips();

  document.querySelectorAll("[data-ruleset-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectRuleset(button.dataset.rulesetId);
    });
  });

  document.querySelectorAll("[data-morale-view]").forEach((button) => {
    button.addEventListener("click", () => {
      moraleViewMode = normalizeMoraleViewMode(button.dataset.moraleView);
      render();
    });
  });

  document.querySelector("#theme-toggle").addEventListener("click", () => {
    setTheme(theme === "dark" ? "light" : "dark");
  });

  document.querySelector("#reset-build-button").addEventListener("click", () => {
    resetBuild();
  });

  document.querySelector("#hero-name-input").addEventListener("input", (event) => {
    build = { ...build, name: event.target.value };
    rememberCurrentDraft();
  });

  document.querySelector("#race-select").addEventListener("change", (event) => {
    const raceId = event.target.value;
    build = {
      ...build,
      raceId,
      avatarId: getDefaultAvatarId(raceId),
      portraitId: getDefaultPortraitId(raceId),
      skillAllocation: {},
    };
    render();
  });

  document.querySelector("#class-select").addEventListener("change", (event) => {
    build = { ...build, classId: event.target.value, skillAllocation: {} };
    render();
  });

  document.querySelector("#level-input").addEventListener("input", (event) => {
    build = { ...build, level: clampLevel(event.target.value) };
    trimAllocations();
    render();
  });

  document.querySelector("#level-50-button").addEventListener("click", () => {
    build = { ...build, level: clampLevel(50) };
    trimAllocations();
    render();
  });

  document.querySelectorAll("[data-portrait-id]").forEach((button) => {
    button.addEventListener("click", () => {
      build = { ...build, portraitId: Number(button.dataset.portraitId) };
      render();
    });
  });

  document.querySelectorAll("[data-stat-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.statKey;
      const delta = Number(button.dataset.statAction);
      updateStat(key, delta);
    });
  });

  document.querySelectorAll("[data-skill-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.skillKey;
      const delta = Number(button.dataset.skillAction);
      updateSkill(key, delta);
    });
  });

  document.querySelectorAll("[data-spell-sphere-id]").forEach((button) => {
    button.addEventListener("click", () => {
      activeSpellSphereId = button.dataset.spellSphereId;
      render();
    });
  });

  const itemSearchInput = document.querySelector("#item-search-input");
  itemSearchInput?.addEventListener("input", (event) => {
    const selectionStart = event.target.selectionStart;
    itemSearchQuery = event.target.value;
    itemSearchPage = 0;
    render();
    window.requestAnimationFrame(() => {
      const nextInput = document.querySelector("#item-search-input");
      nextInput?.focus();
      nextInput?.setSelectionRange(selectionStart, selectionStart);
    });
  });

  document.querySelectorAll("[data-item-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      itemLevelFilter = normalizeItemLevelFilter(button.dataset.itemFilter);
      itemSearchPage = 0;
      render();
    });
  });

  document.querySelectorAll("[data-item-slot-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      itemSlotFilter = normalizeItemSlotFilter(button.dataset.itemSlotFilter);
      itemSearchPage = 0;
      render();
    });
  });

  document.querySelectorAll("[data-item-page-delta]").forEach((button) => {
    button.addEventListener("click", () => {
      setItemSearchPage(itemSearchPage + Number(button.dataset.itemPageDelta));
    });
  });

  document.querySelectorAll("[data-equip-item-id]").forEach((button) => {
    button.addEventListener("click", () => {
      equipItem(button.dataset.equipItemId);
    });
  });

  document.querySelectorAll("[data-clear-item-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      clearItemSlot(button.dataset.clearItemSlot);
    });
  });

  document.querySelector("#save-current-build").addEventListener("click", () => {
    saveCurrentBuild();
  });

  document.querySelector("#hero-preview-details")?.addEventListener("toggle", (event) => {
    heroPreviewExpanded = event.currentTarget.open;
    if (heroPreviewExpanded) {
      startHeroPreview(calculateHeroSummary(buildWithLocalItemData(build)), currentAvatarId());
    } else {
      stopHeroPreview();
    }
  });

  const avatarSelect = document.querySelector("#hero-avatar-select");
  avatarSelect?.addEventListener("change", (event) => {
    selectHeroPreviewAvatar(event.target.value);
  });
  avatarSelect?.addEventListener("keydown", handleHeroPreviewAvatarKeydown);

  document.querySelector("#hero-animation-select")?.addEventListener("change", (event) => {
    previewAnimationId = event.target.value;
    heroPreviewFrame = 0;
    heroPreviewFrameElapsed = 0;
    render();
  });

  document.querySelector("#hero-spell-sphere-select")?.addEventListener("change", (event) => {
    const group = getSpellPreviewGroup(event.target.value);
    previewSpellId = normalizeSpellPreviewId(group.spells[0]?.id);
    loadSpellPreviewAssets(previewSpellId);
    render();
  });

  document.querySelector("#hero-spell-select")?.addEventListener("change", (event) => {
    previewSpellId = normalizeSpellPreviewId(event.target.value);
    loadSpellPreviewAssets(previewSpellId);
    render();
  });

  document.querySelector("#hero-preview-zoom")?.addEventListener("input", (event) => {
    heroPreviewZoom = normalizeHeroPreviewZoom(event.target.value);
    const zoomText = formatHeroPreviewZoom(heroPreviewZoom);
    document.querySelector("#hero-preview-zoom-value").textContent = zoomText;
    document.querySelector("#hero-preview-zoom-readout").textContent = `Zoom ${zoomText}`;
  });

  document.querySelectorAll("[data-hero-rotate]").forEach((button) => {
    button.addEventListener("click", () => {
      rotateHeroPreviewDirection(Number(button.dataset.heroRotate));
    });
  });

  const settingsForm = document.querySelector("#local-settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveLocalPathSettings(settingsForm);
    });
  }

  document.querySelector("#clear-local-settings")?.addEventListener("click", () => {
    clearLocalPathSettings();
  });

  document.querySelectorAll("[data-load-build]").forEach((button) => {
    button.addEventListener("click", () => {
      loadSavedBuild(button.dataset.loadBuild);
    });
  });
}

function bindExclusiveTopbarMenus() {
  const menus = Array.from(document.querySelectorAll(".rules-menu, .settings-menu, .saved-menu"));
  for (const menu of menus) {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      for (const otherMenu of menus) {
        if (otherMenu !== menu) otherMenu.open = false;
      }
    });
  }
}

function bindExclusiveTooltips() {
  const tooltips = Array.from(document.querySelectorAll(".summary-tooltip, .item-description-tooltip"));
  for (const tooltip of tooltips) {
    tooltip.addEventListener("toggle", () => {
      tooltip.classList.remove("is-positioned");
      if (!tooltip.open) return;
      for (const otherTooltip of getOpenTooltips()) {
        if (otherTooltip !== tooltip) otherTooltip.open = false;
      }
      positionTooltip(tooltip);
    });
  }
  bindGlobalTooltipDismissHandlers();
}

function bindGlobalTooltipDismissHandlers() {
  if (tooltipDismissHandlersBound) return;
  tooltipDismissHandlersBound = true;

  document.addEventListener("pointerdown", (event) => {
    if (event.target?.closest?.(".summary-tooltip, .item-description-tooltip")) return;
    closeOpenTooltips();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOpenTooltips();
  });

  window.addEventListener("scroll", closeTooltipsOutsideViewport, true);
  window.addEventListener("resize", closeTooltipsOutsideViewport);
}

function getOpenTooltips() {
  return Array.from(document.querySelectorAll(".summary-tooltip[open], .item-description-tooltip[open]"));
}

function closeOpenTooltips() {
  for (const tooltip of getOpenTooltips()) {
    tooltip.classList.remove("is-positioned");
    tooltip.open = false;
  }
}

function closeTooltipsOutsideViewport() {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  for (const tooltip of getOpenTooltips()) {
    const anchor = tooltip.querySelector("summary");
    const rect = anchor?.getBoundingClientRect();
    if (!rect || rect.bottom <= 0 || rect.top >= viewportHeight || rect.right <= 0 || rect.left >= viewportWidth) {
      tooltip.classList.remove("is-positioned");
      tooltip.open = false;
    } else {
      positionTooltip(tooltip);
    }
  }
}

function positionTooltip(tooltip) {
  const anchor = tooltip.querySelector("summary");
  const bubble = tooltip.querySelector("p");
  if (!anchor || !bubble) return;

  const margin = 12;
  const gap = 8;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  tooltip.classList.remove("is-positioned");
  bubble.style.left = "0px";
  bubble.style.top = "0px";

  const anchorRect = anchor.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();
  const bubbleWidth = Math.min(bubbleRect.width || 320, Math.max(120, viewportWidth - margin * 2));
  const bubbleHeight = Math.min(bubbleRect.height || 80, Math.max(60, viewportHeight - margin * 2));

  let left = anchorRect.right - bubbleWidth;
  left = Math.max(margin, Math.min(left, viewportWidth - bubbleWidth - margin));

  const topAbove = anchorRect.top - bubbleHeight - gap;
  const topBelow = anchorRect.bottom + gap;
  let top = topAbove >= margin ? topAbove : topBelow;
  if (top + bubbleHeight > viewportHeight - margin) {
    top = Math.max(margin, viewportHeight - bubbleHeight - margin);
  }

  bubble.style.left = `${Math.round(left)}px`;
  bubble.style.top = `${Math.round(top)}px`;
  tooltip.classList.add("is-positioned");
}

function updateStat(key, delta) {
  const allocation = normalizeStatAllocation(build.statAllocation);
  allocation[key] = Math.max(0, allocation[key] + delta);
  build = { ...build, statAllocation: allocation };
  trimAllocations();
  render();
}

function updateSkill(key, delta) {
  const allocation = normalizeSkillAllocation(build.skillAllocation);
  allocation[key] = Math.max(0, (allocation[key] ?? 0) + delta);
  if (allocation[key] <= 0) delete allocation[key];
  build = { ...build, skillAllocation: allocation };
  trimAllocations();
  render();
}

function equipItem(itemId) {
  const item = getLocalItemById(itemId);
  if (!item) return;

  const items = normalizeEquippedItems(build.items);
  const slotId = getPreferredEquipmentSlot(item, items);
  if (!slotId) return;

  items[slotId] = item.id;
  build = { ...build, items };
  rememberCurrentDraft();
  render();
}

function clearItemSlot(slotId) {
  if (!equipmentSlotsById[slotId]) return;
  const items = normalizeEquippedItems(build.items);
  if (!items[slotId]) return;
  items[slotId] = "";
  build = { ...build, items };
  rememberCurrentDraft();
  render();
}

function resetBuild() {
  build = createDefaultBuild(activeRulesetId);
  activeSavedBuildId = null;
  render();
}

function trimAllocations() {
  const stats = normalizeStatAllocation(build.statAllocation);
  const skills = normalizeSkillAllocation(build.skillAllocation);
  const initialBudget = getPointBudget({ ...build, statAllocation: stats, skillAllocation: skills });

  let changed = true;
  let guard = 0;
  while (changed && guard < 10) {
    guard += 1;
    changed = false;
    changed = trimSkillUnlocks(skills) || changed;
    if (initialBudget.mode === "shared") {
      const budget = getPointBudget({ ...build, statAllocation: stats, skillAllocation: skills });
      changed = trimSharedBudget(stats, skills, budget) || changed;
    } else {
      changed = trimBudget(stats, initialBudget.statAvailable) || changed;
      changed = trimBudget(skills, initialBudget.skillAvailable) || changed;
    }
  }

  build = { ...build, statAllocation: stats, skillAllocation: skills };
}

function trimBudget(map, budget) {
  let spent = Object.values(map).reduce((total, value) => total + value, 0);
  const keys = Object.keys(map).reverse();
  let changed = false;
  for (const key of keys) {
    while (spent > budget && map[key] > 0) {
      map[key] -= 1;
      spent -= 1;
      changed = true;
    }
    if (map[key] <= 0 && !Object.keys(statLabels).includes(key)) {
      delete map[key];
      changed = true;
    }
  }
  return changed;
}

function trimSharedBudget(stats, skills, budget) {
  let spent = getSharedSpent(stats, skills, budget.statCost, budget.skillCost);
  let changed = false;
  const trimMaps = [
    { map: skills, cost: budget.skillCost, preserveEmpty: false },
    { map: stats, cost: budget.statCost, preserveEmpty: true },
  ];

  for (const { map, cost, preserveEmpty } of trimMaps) {
    for (const key of Object.keys(map).reverse()) {
      while (spent > budget.available && map[key] > 0) {
        map[key] -= 1;
        spent -= cost;
        changed = true;
      }
      if (!preserveEmpty && map[key] <= 0) {
        delete map[key];
        changed = true;
      }
    }
  }

  return changed;
}

function getSharedSpent(stats, skills, statCost, skillCost) {
  return (
    Object.values(stats).reduce((total, value) => total + value, 0) * statCost +
    Object.values(skills).reduce((total, value) => total + value, 0) * skillCost
  );
}

function trimSkillUnlocks(skills) {
  const unlocks = getAvailableSkillUnlocks({ ...build, skillAllocation: skills });
  const unlocksBySkill = Object.fromEntries(unlocks.map((unlock) => [unlock.skillId, unlock]));
  let changed = false;

  for (const key of Object.keys(skills)) {
    const unlock = unlocksBySkill[key];
    if (!unlock || !unlock.available) {
      delete skills[key];
      changed = true;
      continue;
    }

    if (unlock.maxLevel !== Infinity) {
      const cap = Math.max(0, unlock.maxLevel - unlock.startingLevel);
      if (skills[key] > cap) {
        skills[key] = cap;
        changed = true;
      }
      if (skills[key] <= 0) {
        delete skills[key];
        changed = true;
      }
    }
  }

  return changed;
}

function createDefaultBuild(rulesetId = activeRulesetId) {
  const ruleset = getRuleset(rulesetId);
  const baseBuild = ruleset.createDefaultBuild();
  const raceId = baseBuild.raceId;
  return {
    ...baseBuild,
    rulesetId: ruleset.id,
    portraitId: getDefaultPortraitId(raceId),
    avatarId: getDefaultAvatarId(raceId),
    items: emptyEquippedItems(),
  };
}

function themeToggle() {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return `
    <button
      type="button"
      id="theme-toggle"
      class="theme-toggle"
      aria-label="Switch to ${nextTheme} mode"
      title="Switch to ${nextTheme} mode"
    >
      <span class="theme-icon" aria-hidden="true"></span>
      <span class="sr-only">${theme === "dark" ? "Dark mode" : "Light mode"}</span>
    </button>
  `;
}

function rulesetMenu() {
  const ruleset = activeRuleset();
  return `
    <details class="rules-menu">
      <summary>
        <span>Rules</span>
        <strong>${escapeHtml(ruleset.shortLabel)}</strong>
      </summary>
      <div class="rules-menu-panel">
        <h3>Ruleset</h3>
        <div class="ruleset-list">
          ${rulesetOptions.map((option) => rulesetOption(option)).join("")}
        </div>
      </div>
    </details>
  `;
}

function rulesetOption(option) {
  const selected = option.id === activeRulesetId;
  return `
    <button type="button" class="ruleset-option ${selected ? "is-selected" : ""}" data-ruleset-id="${escapeHtml(option.id)}">
      <span>${escapeHtml(option.label)}</span>
      ${selected ? "<strong>Active</strong>" : ""}
    </button>
  `;
}

function selectRuleset(value) {
  const nextRulesetId = normalizeRulesetId(value);
  if (nextRulesetId === activeRulesetId) return;
  rememberCurrentDraft();
  activeRulesetId = nextRulesetId;
  persistRulesetPreference(activeRulesetId);
  refreshActiveRulesetReferences();
  activeSavedBuildId = null;
  build = rulesetDrafts.get(activeRulesetId) ?? createDefaultBuild(activeRulesetId);
  trimAllocations();
  render();
}

function loadRulesetPreference() {
  try {
    return normalizeRulesetId(window.localStorage.getItem(rulesetStorageKey) ?? defaultRulesetId);
  } catch {
    return defaultRulesetId;
  }
}

function persistRulesetPreference(rulesetId) {
  try {
    window.localStorage.setItem(rulesetStorageKey, normalizeRulesetId(rulesetId));
  } catch {
    // Some embedded browser modes can block local storage.
  }
}

function loadRulesetDrafts() {
  const drafts = new Map();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(draftStorageKey) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return drafts;
    for (const [rulesetId, value] of Object.entries(parsed)) {
      const savedBuild = cloneSavedBuild(value, `draft-${rulesetId}`, rulesetId);
      if (savedBuild) {
        if (savedBuild.name === "New Hero" || savedBuild.name === "Draft") savedBuild.name = "";
        drafts.set(savedBuild.rulesetId, savedBuild);
      }
    }
  } catch {
    return drafts;
  }
  return drafts;
}

function rememberCurrentDraft() {
  if (!build) return;
  const draft = cloneSavedBuild(
    {
      ...build,
      id: `draft-${activeRulesetId}`,
      name: String(build.name ?? "").trim(),
      rulesetId: activeRulesetId,
      imported: false,
      origin: "Draft",
    },
    `draft-${activeRulesetId}`,
    activeRulesetId,
  );
  if (!draft) return;
  rulesetDrafts.set(activeRulesetId, draft);
  persistRulesetDrafts();
}

function persistRulesetDrafts() {
  try {
    window.localStorage.setItem(draftStorageKey, JSON.stringify(Object.fromEntries(rulesetDrafts)));
  } catch {
    // Local storage can be unavailable in some embedded browser modes.
  }
}

function loadThemePreference() {
  try {
    return window.localStorage.getItem(themeStorageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function setTheme(nextTheme) {
  theme = nextTheme === "light" ? "light" : "dark";
  applyTheme(theme);
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Some embedded browser modes can block local storage.
  }
  render();
}

function applyTheme(nextTheme) {
  document.documentElement.dataset.theme = nextTheme === "light" ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    nextTheme === "light" ? "#244f45" : "#111917",
  );
}

function option(id, label, selectedId) {
  return `<option value="${escapeHtml(id)}" ${id === selectedId ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function portraitOption(id) {
  const selected = Number(build.portraitId) === Number(id);
  return `
    <button
      type="button"
      class="portrait-option ${selected ? "is-selected" : ""}"
      data-portrait-id="${id}"
      role="option"
      aria-label="Portrait ${id}"
      aria-selected="${selected ? "true" : "false"}"
    >
      <img src="${getUpscaledPortraitSrc(id)}" alt="" />
    </button>
  `;
}

function statAllocator(key, startingStats, statValidation, pointBudget, summary) {
  return statRow(
    key,
    startingStats[key],
    build.statAllocation[key],
    summary.stats[key],
    canSpendStat(statValidation, pointBudget),
  );
}

function canSpendStat(statValidation, pointBudget) {
  if (pointBudget.mode === "shared") return pointBudget.remaining >= pointBudget.statCost;
  return statValidation.spent < statValidation.available;
}

function statRow(key, base, allocated = 0, total, canAdd) {
  return `
    <div class="stat-row">
      <div>
        <strong class="stat-label">${statLabels[key]}</strong>
        <span>Base ${base}</span>
      </div>
      <div class="stepper">
        <button type="button" data-stat-key="${key}" data-stat-action="-1" ${allocated <= 0 ? "disabled" : ""}>-</button>
        <span>${allocated}</span>
        <button type="button" data-stat-key="${key}" data-stat-action="1" ${!canAdd ? "disabled" : ""}>+</button>
      </div>
      <output>${total}</output>
    </div>
  `;
}

function getSkillRows(unlocks, summary) {
  const rows = [...unlocks];
  const existingSkillIds = new Set(rows.map((unlock) => unlock.skillId));
  const itemOnlySkillIds = new Set();

  for (const contribution of summary.itemEffects?.skillContributions ?? []) {
    const skillId = contribution.skillId;
    if (skillId && !existingSkillIds.has(skillId)) itemOnlySkillIds.add(skillId);
  }

  for (const skillId of [...itemOnlySkillIds].sort((left, right) => getSkillSortName(left).localeCompare(getSkillSortName(right)))) {
    rows.push({
      skillId,
      origin: "Item",
      mergedFrom: ["item"],
      availableAt: 1,
      levelAvailable: true,
      prerequisiteMet: true,
      available: true,
      passive: true,
      maxLevel: Infinity,
      currentLevel: 0,
      itemOnly: true,
    });
  }

  return rows;
}

function getSkillSortName(skillId) {
  return getSkillDisplayName(skillId, skillsById[skillId]?.displayName ?? skillId);
}

function skillRow(unlock, skillValidation, pointBudget, effects = [], summary = {}) {
  const skill = skillsById[unlock.skillId];
  const allocated = unlock.passive ? 0 : (build.skillAllocation[unlock.skillId] ?? 0);
  const originText = unlock.mergedFrom?.length > 1 ? "Race + class" : unlock.origin;
  const unlockText = getSkillUnlockText(unlock);
  const locked = !unlock.available ? "is-locked" : "";
  const hasEffects = effects.length ? "has-effects" : "";
  const itemTooltip = skillItemBreakdown(summary, unlock.skillId);
  const hasItemModifier = itemTooltip ? "has-tooltip" : "";
  const effectiveLevel = getEffectiveSkillLevel(summary, unlock.skillId, unlock.currentLevel);
  const maxed = unlock.maxLevel !== Infinity && unlock.currentLevel >= unlock.maxLevel;
  const canAdd = unlock.available && !unlock.passive && !maxed && canSpendSkill(skillValidation, pointBudget);
  const skillName = getSkillDisplayName(unlock.skillId, skill?.displayName ?? unlock.skillId);
  const skillDescription = getSkillDescription(unlock.skillId, effectiveLevel, effects) || "No game description available.";
  const controls = unlock.itemOnly
    ? `<span class="passive-skill">Item</span>`
    : unlock.passive
      ? `<span class="passive-skill">Passive</span>`
    : `
      <div class="stepper">
        <button type="button" data-skill-key="${unlock.skillId}" data-skill-action="-1" ${allocated <= 0 ? "disabled" : ""}>-</button>
        <span>${allocated}</span>
        <button type="button" data-skill-key="${unlock.skillId}" data-skill-action="1" ${!canAdd ? "disabled" : ""}>+</button>
      </div>
    `;
  return `
    <article class="skill-row ${locked} ${hasEffects} ${hasItemModifier}">
      <div class="skill-info">
        <strong>${escapeHtml(skillName)}</strong>
        <span>${escapeHtml(originText)} / ${escapeHtml(unlockText)}</span>
      </div>
      ${skillDescriptionCell(skillDescription)}
      ${controls}
      ${skillLevelOutput(unlock.currentLevel, effectiveLevel, itemTooltip, skillName)}
    </article>
  `;
}

function getEffectiveSkillLevel(summary, skillId, fallbackLevel = 0) {
  return Math.max(0, Math.trunc(Number(summary.skillLevels?.[skillId] ?? fallbackLevel) || 0));
}

function skillLevelOutput(baseLevel, effectiveLevel, tooltip, skillName) {
  const hasLevelBonus = effectiveLevel !== baseLevel;
  const baseMarkup = hasLevelBonus ? `<small>base ${escapeHtml(baseLevel)}</small>` : "";
  const tooltipMarkup = tooltip ? summaryTooltip(`${skillName} item modifiers`, tooltip) : "";
  return `
    <div class="skill-level-output ${tooltip ? "has-tooltip" : ""}">
      <strong>${escapeHtml(effectiveLevel)}</strong>
      ${baseMarkup}
      ${tooltipMarkup}
    </div>
  `;
}

function canSpendSkill(skillValidation, pointBudget) {
  if (pointBudget.mode === "shared") return pointBudget.remaining >= pointBudget.skillCost;
  return skillValidation.spent < skillValidation.available;
}

function skillDescriptionCell(description) {
  return `<div class="skill-description-cell">${escapeHtml(description)}</div>`;
}

function spellSpheresPanel(summary) {
  const spheres = getSpellSpheres(summary);
  if (!spheres.some((sphere) => sphere.group.id === activeSpellSphereId)) {
    activeSpellSphereId = spheres[0]?.group.id ?? "";
  }
  const activeSphere = spheres.find((sphere) => sphere.group.id === activeSpellSphereId) ?? spheres[0];
  return `
    <section class="panel spells-panel">
      <div class="panel-heading">
        <h2>Spells</h2>
      </div>
      <div class="spell-sphere-tabs" role="tablist" aria-label="Spell spheres">
        ${spheres.map(spellSphereTab).join("")}
      </div>
      ${activeSphere ? spellSphereCard(activeSphere) : `<p class="empty-state">No spell spheres are available.</p>`}
      ${localSpellTextError ? `<p class="import-note is-error">${escapeHtml(localSpellTextError)}</p>` : ""}
    </section>
  `;
}

function spellSphereTab(sphere) {
  const active = sphere.group.id === activeSpellSphereId ? "is-active" : "";
  const unlocked = sphere.spellCount > 0 ? "has-spells" : "";
  return `
    <button type="button" class="spell-sphere-tab ${active} ${unlocked}" data-spell-sphere-id="${escapeHtml(sphere.group.id)}" role="tab" aria-selected="${active ? "true" : "false"}">
      <span>${escapeHtml(sphere.group.label)}</span>
    </button>
  `;
}

function spellSphereCard(sphere) {
  return `
    <article class="spell-sphere-card">
      <div class="spell-list">
        ${sphere.group.spells.map(spellRow).join("")}
      </div>
    </article>
  `;
}

function spellRow(spell) {
  return `
    <article class="spell-row">
      <strong>${escapeHtml(getSpellDisplayName(spell))}</strong>
      <p>${escapeHtml(getSpellDescription(spell))}</p>
    </article>
  `;
}

function getSpellSpheres(summary) {
  const skillLevels = summary.skillLevels ?? {};
  return spellPreviewGroups
    .map((group) => {
      const skillId = spellSphereSkillIds[group.id];
      const skillLevel = Math.max(0, Math.trunc(Number(skillLevels[skillId]) || 0));
      const spellCount = getKnownSpellCount(skillLevel);
      const skillLabel = getSkillDisplayName(skillId, skillsById[skillId]?.displayName ?? group.label);
      return {
        group,
        skillId,
        skillLabel,
        skillLevel,
        spellCount,
      };
    });
}

function getKnownSpellCount(skillLevel) {
  const value = Math.max(0, Math.trunc(Number(skillLevel) || 0));
  if (value <= 0) return 0;
  return Math.min(10, value % 10 || 10);
}

function getKnownSpellLevel(skillLevel) {
  const value = Math.max(0, Math.trunc(Number(skillLevel) || 0));
  return value > 0 ? Math.ceil(value / 10) : 0;
}

function formatSpellKnowledge(skillLevel) {
  const count = getKnownSpellCount(skillLevel);
  if (!count) return "No spells";
  return `${count} ${count === 1 ? "spell" : "spells"} / level ${getKnownSpellLevel(skillLevel)}`;
}

function getSpellDisplayName(spell) {
  return localSpellTextByIndex.get(spell.gameTextIndex)?.name || spell.label;
}

function getSpellDescription(spell) {
  return localSpellTextByIndex.get(spell.gameTextIndex)?.description || "Game description text is not available.";
}

function getSkillDisplayName(skillId, fallback) {
  return localSkillTextById.get(skillId)?.name || fallback;
}

function getSkillDescription(skillId, skillLevel, effects = []) {
  const skillText = localSkillTextById.get(skillId);
  if (!skillText) return "";
  if (skillText.kind === "magic") return formatMagicSkillDescription(skillLevel);
  if (!skillText.descriptionTemplate) return "";
  return formatGameTemplate(skillText.descriptionTemplate, [getSkillEffectRawValue(skillId, skillLevel, effects)]);
}

function getSkillEffectRawValue(skillId, skillLevel, effects = []) {
  const effect = effects.find((item) => item.skillId === skillId && Number.isFinite(Number(item.rawValue)));
  if (effect) return Number(effect.rawValue);
  return Math.max(0, Math.trunc(Number(skillLevel) || 0));
}

function formatMagicSkillDescription(skillLevel) {
  const count = getKnownSpellCount(skillLevel);
  const rank = getKnownSpellLevel(skillLevel);
  if (!count) return localSkillMagicTemplates.noSpells || "Cannot cast any spells yet";
  if (count === 1) {
    return formatGameTemplate(localSkillMagicTemplates.oneSpell || "Cast the first %d spell at level %d", [count, rank]);
  }
  if (count === 10) {
    return formatGameTemplate(localSkillMagicTemplates.allSpells || "Cast all %d spells at level %d", [count, rank]);
  }
  return formatGameTemplate(localSkillMagicTemplates.firstSpells || "Cast the first %d spells at level %d", [count, rank]);
}

function formatGameTemplate(template, values = []) {
  let index = 0;
  const percentToken = "\u0000PERCENT\u0000";
  return String(template || "")
    .replace(/%%/g, percentToken)
    .replace(/%([+]?)(?:0\.(\d+))?([dfs])/g, (match, sign, decimals, type) => {
      const value = values[index] ?? 0;
      index += 1;
      if (type === "s") return String(value);

      const number = Number(value) || 0;
      const formatted = type === "f" && decimals ? number.toFixed(Number(decimals)) : String(Math.trunc(number));
      return sign === "+" && number >= 0 ? `+${formatted}` : formatted;
    })
    .replace(new RegExp(percentToken, "g"), "%");
}

function itemsPanel() {
  const equippedItems = normalizeEquippedItems(build.items);
  const equippedCount = equipmentSlots.filter((slot) => equippedItems[slot.id]).length;
  const searchPage = getVisibleItemSearchPage();
  return `
    <section class="panel items-panel">
      <div class="panel-heading">
        <h2>Items</h2>
        <span>${equippedCount} / ${equipmentSlots.length} equipped</span>
      </div>
      <div class="items-panel-grid">
        <div class="equipment-grid" aria-label="Hero equipment slots">
          ${equipmentSlots.map((slot) => equipmentSlot(slot, equippedItems[slot.id])).join("")}
        </div>
        <div class="item-search-panel">
          <div class="item-search-controls">
            <label class="field item-search-field">
              <span>Search Items</span>
              <input id="item-search-input" type="search" value="${escapeHtml(itemSearchQuery)}" placeholder="Search by name or effect" autocomplete="off" />
            </label>
            <div class="item-filter-groups">
              ${itemFilterButtons()}
              ${itemSlotFilterButtons()}
            </div>
          </div>
          <div class="item-search-results">
            ${itemSearchResults(searchPage.items)}
          </div>
          ${itemPaginationControls(searchPage)}
        </div>
      </div>
    </section>
  `;
}

function itemFilterButtons() {
  const counts = getItemFilterCounts();
  return `
    <div class="item-filter-bar" role="group" aria-label="Item rarity filter">
      ${itemLevelFilters
        .map((option) => {
          const active = itemLevelFilter === option.id;
          return `
            <button
              type="button"
              class="item-filter-button ${active ? "is-active" : ""}"
              data-item-filter="${escapeHtml(option.id)}"
              aria-pressed="${active ? "true" : "false"}"
            >
              <span>${escapeHtml(option.label)}</span>
              <strong>${counts[option.id] ?? 0}</strong>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function itemSlotFilterButtons() {
  const counts = getItemSlotFilterCounts();
  return `
    <div class="item-filter-bar item-slot-filter-bar" role="group" aria-label="Item slot filter">
      ${itemSlotFilters
        .map((option) => {
          const active = itemSlotFilter === option.id;
          return `
            <button
              type="button"
              class="item-filter-button item-slot-filter-button ${active ? "is-active" : ""}"
              data-item-slot-filter="${escapeHtml(option.id)}"
              aria-pressed="${active ? "true" : "false"}"
            >
              <span>${escapeHtml(option.label)}</span>
              <strong>${counts[option.id] ?? 0}</strong>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function itemPaginationControls(searchPage) {
  if (localItemCatalogError || !localItemCatalog.length || !searchPage.total) return "";
  return `
    <div class="item-pagination" aria-label="Item result pages">
      <span>${searchPage.start} - ${searchPage.end} of ${searchPage.total}</span>
      <span class="item-page-buttons">
        <button
          type="button"
          class="item-page-button"
          data-item-page-delta="-1"
          aria-label="Previous item page"
          title="Previous item page"
          ${searchPage.page <= 0 ? "disabled" : ""}
        >&larr;</button>
        <button
          type="button"
          class="item-page-button"
          data-item-page-delta="1"
          aria-label="Next item page"
          title="Next item page"
          ${searchPage.page >= searchPage.pageCount - 1 ? "disabled" : ""}
        >&rarr;</button>
      </span>
    </div>
  `;
}

function equipmentSlot(slot, itemId) {
  const item = getLocalItemById(itemId);
  const stateClass = item ? "is-equipped" : "is-empty";
  const title = item ? `${item.name}: ${formatItemEffect(item)}` : slot.label;
  const itemEffect = item ? `<small>${escapeHtml(formatItemEffect(item))}</small>` : "";
  return `
    <button type="button" class="equipment-slot equipment-slot-${slot.id} ${stateClass}" data-clear-item-slot="${escapeHtml(slot.id)}" title="${escapeHtml(title)}">
      <span>${escapeHtml(slot.label)}</span>
      <strong>${escapeHtml(item?.name ?? "Empty")}</strong>
      ${itemEffect}
    </button>
  `;
}

function itemSearchResults(results) {
  if (localItemCatalogError) {
    return `<p class="empty-state">${escapeHtml(localItemCatalogError)}</p>`;
  }
  if (!localItemCatalog.length) {
    return `<p class="empty-state">Local game item data is loading or unavailable.</p>`;
  }
  if (!results.length) {
    return `<p class="empty-state">No matching items.</p>`;
  }
  return results.map(itemResult).join("");
}

function itemResult(item) {
  const shineSprite = getItemShineSprite(item);
  const iconImage = item.iconSrc
    ? `<img class="item-icon" src="${escapeHtml(item.iconSrc)}" alt="" aria-hidden="true" />`
    : `<span class="item-icon item-icon-placeholder" aria-hidden="true"></span>`;
  const shine = shineSprite
    ? `<span class="item-shine item-shine-${escapeHtml(item.shine)}" style="--item-shine-sprite: url(${escapeHtml(shineSprite)});" aria-hidden="true"></span>`
    : "";
  const icon = `<span class="item-icon-frame">${iconImage}${shine}</span>`;
  const descriptionTooltip = item.description
    ? `
        <details class="item-description-tooltip">
          <summary aria-label="${escapeHtml(`${item.name} description`)}">?</summary>
          <p>${escapeHtml(item.description)}</p>
        </details>
      `
    : "";
  return `
    <article class="item-result">
      ${icon}
      <span class="item-result-text">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(formatItemEffect(item))}</small>
      </span>
      ${descriptionTooltip}
      <button type="button" class="item-equip-button" data-equip-item-id="${escapeHtml(item.id)}">Equip</button>
    </article>
  `;
}

function getVisibleItemSearchPage() {
  const items = getFilteredItemSearchResults();
  const pageCount = Math.max(1, Math.ceil(items.length / itemSearchPageSize));
  const page = clampItemSearchPage(itemSearchPage, pageCount);
  itemSearchPage = page;
  const startIndex = page * itemSearchPageSize;
  const endIndex = Math.min(startIndex + itemSearchPageSize, items.length);
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    page,
    pageCount,
    start: items.length ? startIndex + 1 : 0,
    end: endIndex,
  };
}

function getFilteredItemSearchResults() {
  const query = itemSearchQuery.trim().toLowerCase();
  return localItemCatalog.filter((item) => {
    if (!matchesItemLevelFilter(item)) return false;
    if (!matchesItemSlotFilter(item)) return false;
    if (!query) return true;
    return getItemSearchText(item).includes(query);
  });
}

function setItemSearchPage(page) {
  const pageCount = Math.max(1, Math.ceil(getFilteredItemSearchResults().length / itemSearchPageSize));
  itemSearchPage = clampItemSearchPage(page, pageCount);
  render();
}

function clampItemSearchPage(page, pageCount) {
  const numericPage = Number.isFinite(Number(page)) ? Math.trunc(Number(page)) : 0;
  return Math.min(Math.max(numericPage, 0), Math.max(pageCount - 1, 0));
}

function getItemFilterCounts() {
  const counts = { all: 0, artifact: 0, set: 0 };
  localItemCatalog.forEach((item) => {
    if (!matchesItemSlotFilter(item)) return;
    counts.all += 1;
    const filter = getItemFilterId(item);
    if (filter === "artifact" || filter === "set") {
      counts[filter] += 1;
    }
  });
  return counts;
}

function getItemSlotFilterCounts() {
  const counts = Object.fromEntries(itemSlotFilters.map((option) => [option.id, 0]));
  localItemCatalog.forEach((item) => {
    if (!matchesItemLevelFilter(item)) return;
    counts.all += 1;
    const itemType = Number(item?.type);
    itemSlotFilters.forEach((option) => {
      if (option.id === "all" || !option.accepts.includes(itemType)) return;
      counts[option.id] += 1;
    });
  });
  return counts;
}

function matchesItemLevelFilter(item) {
  if (itemLevelFilter === "all") return true;
  return getItemFilterId(item) === itemLevelFilter;
}

function getItemSlotFilter(filterId) {
  const id = normalizeItemSlotFilter(filterId);
  return itemSlotFilters.find((option) => option.id === id) ?? itemSlotFilters[0];
}

function matchesItemSlotFilter(item) {
  const filter = getItemSlotFilter(itemSlotFilter);
  if (filter.id === "all") return true;
  return filter.accepts.includes(Number(item?.type));
}

function normalizeItemSlotFilter(value) {
  const filter = String(value ?? "").toLowerCase();
  return itemSlotFilters.some((option) => option.id === filter) ? filter : "all";
}

function getItemSlotLabelForItem(item) {
  const itemType = Number(item?.type);
  const filter = itemSlotFilters.find((option) => option.id !== "all" && option.accepts.includes(itemType));
  return filter?.label ?? "";
}

function getItemSearchText(item) {
  return [
    item.name,
    item.typeLabel,
    getItemSlotLabelForItem(item),
    item.powerLabel,
    formatItemEffect(item),
    item.description,
  ]
    .join(" ")
    .toLowerCase();
}

function getItemFilterId(item) {
  const shine = String(item?.shine ?? "").toLowerCase();
  if (shine === "artifact" || shine === "set") return shine;
  const level = String(item?.level ?? item?.powerLabel ?? "").toLowerCase();
  if (level.includes("artifact")) return "artifact";
  if (level === "set" || level.includes("set item")) return "set";
  return "";
}

function normalizeItemLevelFilter(value) {
  const filter = String(value ?? "").toLowerCase();
  return itemLevelFilters.some((option) => option.id === filter) ? filter : "all";
}

function getItemShineSprite(item) {
  const shine = String(item?.shine ?? "");
  return shine ? String(localItemShineSprites[shine] ?? "") : "";
}

function getLocalItemById(itemId) {
  const id = String(itemId ?? "");
  if (!id) return null;
  return localItemCatalog.find((item) => item.id === id) ?? null;
}

function getPreferredEquipmentSlot(item, equippedItems) {
  const compatibleSlots = equipmentSlots.filter((slot) => slot.accepts.includes(item.type));
  if (!compatibleSlots.length) return "";
  const emptySlot = compatibleSlots.find((slot) => !equippedItems[slot.id]);
  return (emptySlot ?? compatibleSlots[0]).id;
}

function emptyEquippedItems() {
  return Object.fromEntries(equipmentSlots.map((slot) => [slot.id, ""]));
}

function normalizeEquippedItems(value = {}) {
  const items = emptyEquippedItems();
  if (!value || typeof value !== "object") return items;
  for (const slot of equipmentSlots) {
    const itemId = getStoredItemIdForSlot(value, slot.id);
    items[slot.id] = itemId;
  }
  return items;
}

function getStoredItemIdForSlot(value, slotId) {
  const legacySlots = {
    head: ["crown", "helm"],
    body: ["armor", "necklace"],
    offhand: ["shield", "banner"],
  };
  const candidateIds = [slotId, ...(legacySlots[slotId] ?? [])];
  const match = candidateIds.map((candidateId) => String(value[candidateId] ?? "")).find(Boolean);
  return match ?? "";
}

function formatItemEffect(item) {
  if (item.effectText) return String(item.effectText);
  if (Array.isArray(item.powers) && item.powers.length) {
    return item.powers.map(formatItemPower).join(", ");
  }
  const sign = Number(item.value) >= 0 ? "+" : "";
  return `${sign}${item.value} ${item.powerLabel}`;
}

function formatItemPower(power) {
  if (power.displayText) return power.displayText;
  if (power.text) return power.text;
  const sign = Number(power.data) >= 0 ? "+" : "";
  const details = [];
  if (Number.isInteger(power.chance)) details.push(`${power.chance}% chance`);
  if (Number.isInteger(power.level)) details.push(`level ${power.level}`);
  const suffix = details.length ? ` (${details.join(", ")})` : "";
  return `${sign}${power.data} ${power.typeLabel}${suffix}`;
}

function heroPreviewPanel(summary, race, heroClass, avatarId) {
  const animation = getHeroAnimation(previewAnimationId);
  const availableAnimations = getAvailableHeroAnimationTypes(avatarId);
  const radiusMetrics = getCommandRadiusSceneMetrics(summary.command);
  const avatarOptions = getAllAvatarOptions();
  const spell = getSpellPreview(previewSpellId);
  const spellSphereId = normalizeSpellPreviewSphereId(spell.sphereId);
  const spellGroup = getSpellPreviewGroup(spellSphereId);
  const spellControl =
    animation.id === "spell"
      ? `
          <label>
            <span>Spell Sphere</span>
            <select id="hero-spell-sphere-select">
              ${spellPreviewGroups.map((group) => option(group.id, group.label, spellSphereId)).join("")}
            </select>
          </label>
          <label>
            <span>Spell</span>
            <select id="hero-spell-select">
              ${spellGroup.spells.map((item) => option(item.id, getSpellDisplayName(item), spell.id)).join("")}
            </select>
          </label>
        `
      : "";
  return `
    <details id="hero-preview-details" class="panel hero-preview-panel" ${heroPreviewExpanded ? "open" : ""}>
      <summary class="hero-preview-summary">
        <div>
          <h2>Hero Preview</h2>
          <span>${escapeHtml(race?.displayName ?? build.raceId)} ${escapeHtml(heroClass?.displayName ?? build.classId)} / Command ${summary.command}</span>
        </div>
        <strong id="hero-preview-cache-status">${escapeHtml(getHeroPreviewCacheStatusText())}</strong>
      </summary>
      <div class="hero-preview-body">
        <div class="hero-preview-controls">
          <label>
            <span>Avatar</span>
            <select id="hero-avatar-select">
              ${avatarOptions.map((avatar) => option(avatar.id, `${avatar.displayName} (${avatar.id})`, avatarId)).join("")}
            </select>
          </label>
          <label>
            <span>Animation</span>
            <select id="hero-animation-select">
              ${availableAnimations.map((item) => option(item.id, item.label, animation.id)).join("")}
            </select>
          </label>
          ${spellControl}
          <label class="hero-preview-zoom-control">
            <span>Zoom</span>
            <div>
              <input id="hero-preview-zoom" type="range" min="1" max="4" step="0.25" value="${heroPreviewZoom}">
              <strong id="hero-preview-zoom-value">${escapeHtml(formatHeroPreviewZoom(heroPreviewZoom))}</strong>
            </div>
          </label>
        </div>
        <div class="hero-preview-stage">
          <canvas id="hero-preview-canvas" width="${heroPreviewLogicalWidth * heroPreviewResolutionScale}" height="${heroPreviewLogicalHeight * heroPreviewResolutionScale}" aria-label="Hero animation, gold mine, and command radius preview"></canvas>
          <button type="button" class="hero-rotate-gizmo hero-rotate-clockwise" data-hero-rotate="1" title="Rotate clockwise (Left arrow)" aria-label="Rotate clockwise">&#8635;</button>
          <button type="button" class="hero-rotate-gizmo hero-rotate-anticlockwise" data-hero-rotate="-1" title="Rotate anti-clockwise (Right arrow)" aria-label="Rotate anti-clockwise">&#8634;</button>
          <div class="hero-preview-readout">
            <span>Radius ${radiusMetrics.radius}</span>
            <span>${radiusMetrics.diameterX} x ${radiusMetrics.diameterY} px at game scale</span>
            <span id="hero-preview-zoom-readout">Zoom ${formatHeroPreviewZoom(heroPreviewZoom)}</span>
            <span id="hero-preview-direction-readout">Direction ${heroPreviewDirection}</span>
            <span>${formatHeroPreviewAnimationReadout(summary, animation, spell)}</span>
          </div>
        </div>
      </div>
    </details>
  `;
}

function normalizeSpellPreviewSphereId(value) {
  const id = String(value ?? "");
  return spellPreviewGroups.some((group) => group.id === id) ? id : spellPreviewGroups[0]?.id;
}

function getSpellPreviewGroup(sphereId) {
  return spellPreviewGroups.find((group) => group.id === sphereId) ?? spellPreviewGroups[0];
}

function currentAvatarId() {
  return normalizeAvatarId(build.raceId, build.avatarId);
}

function selectHeroPreviewAvatar(avatarId, options = {}) {
  const nextAvatarId = normalizeAvatarId(build.raceId, avatarId);
  build = { ...build, avatarId: nextAvatarId };
  previewAnimationId = normalizeHeroAnimationId(nextAvatarId, previewAnimationId);
  render();

  if (options.refocus) {
    window.requestAnimationFrame(() => {
      document.querySelector("#hero-avatar-select")?.focus();
    });
  }
}

function handleHeroPreviewAvatarKeydown(event) {
  const navigationKeys = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);
  if (!navigationKeys.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;

  event.preventDefault();
  const select = event.currentTarget;
  const lastIndex = select.options.length - 1;
  let nextIndex = select.selectedIndex;

  if (event.key === "ArrowDown") nextIndex = Math.min(lastIndex, select.selectedIndex + 1);
  if (event.key === "ArrowUp") nextIndex = Math.max(0, select.selectedIndex - 1);
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = lastIndex;

  if (nextIndex !== select.selectedIndex) {
    selectHeroPreviewAvatar(select.options[nextIndex].value, { refocus: true });
  }
}

function handleHeroPreviewDirectionKeydown(event) {
  if (!heroPreviewExpanded) return;
  if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;
  const tagName = target?.tagName;
  if (target?.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(tagName)) return;

  event.preventDefault();
  rotateHeroPreviewDirection(event.key === "ArrowLeft" ? 1 : -1);
}

function rotateHeroPreviewDirection(delta) {
  heroPreviewDirection =
    (heroPreviewDirection + Math.trunc(Number(delta) || 0) + heroPreviewDirectionCount) % heroPreviewDirectionCount;
  heroPreviewFrame = 0;
  heroPreviewFrameElapsed = 0;
  const readout = document.querySelector("#hero-preview-direction-readout");
  if (readout) readout.textContent = `Direction ${heroPreviewDirection}`;
}

function stopHeroPreview() {
  if (!heroPreviewRaf) return;
  window.cancelAnimationFrame(heroPreviewRaf);
  heroPreviewRaf = 0;
}

function startHeroPreview(summary, avatarId) {
  const canvas = document.querySelector("#hero-preview-canvas");
  if (!canvas) return;

  stopHeroPreview();

  const animation = getHeroAnimation(previewAnimationId);
  const assetKey = getHeroPreviewAssetKey(avatarId, animation.id);
  if (assetKey !== heroPreviewAssetKey) {
    heroPreviewAssetKey = assetKey;
    heroPreviewAsset = previewAssetCache.get(assetKey) ?? null;
    heroPreviewAssetError = "";
    heroPreviewFrame = 0;
    heroPreviewFrameElapsed = 0;
    loadHeroPreviewAsset(avatarId, animation.id);
  }
  loadGrassTilePreviewAsset();
  loadGoldMinePreviewAsset();
  if (animation.id === "spell") {
    loadSpellPreviewAssets(previewSpellId);
  }

  const tick = (timestamp) => {
    drawHeroPreview(canvas, summary, animation, timestamp);
    heroPreviewRaf = window.requestAnimationFrame(tick);
  };
  heroPreviewLastTimestamp = 0;
  goldMinePreviewLastTimestamp = 0;
  heroPreviewRaf = window.requestAnimationFrame(tick);
}

async function loadHeroPreviewAsset(avatarId, animationId) {
  const assetKey = getHeroPreviewAssetKey(avatarId, animationId);
  const cachedAsset = previewAssetCache.get(assetKey);
  if (cachedAsset) {
    if (assetKey === heroPreviewAssetKey) {
      heroPreviewAsset = cachedAsset;
      heroPreviewAssetError = getPreviewAssetError(cachedAsset);
    }
    return cachedAsset;
  }

  try {
    const asset = await fetchPreviewAsset(
      assetKey,
      `/api/local/avatar?avatarId=${encodeURIComponent(avatarId)}&animation=${encodeURIComponent(animationId)}&direction=${DEFAULT_HERO_DIRECTION}`,
    );
    if (assetKey === heroPreviewAssetKey) {
      heroPreviewAsset = asset;
      heroPreviewAssetError = getPreviewAssetError(asset);
    }
    return asset;
  } catch (error) {
    if (assetKey === heroPreviewAssetKey) {
      heroPreviewAsset = null;
      heroPreviewAssetError = error instanceof Error ? error.message : "Local game assets are unavailable.";
    }
    return null;
  }
}

async function loadGoldMinePreviewAsset() {
  const assetKey = getSceneObjectAssetKey("goldMine", "ambient");
  const cachedAsset = previewAssetCache.get(assetKey);
  if (cachedAsset) {
    goldMinePreviewAsset = cachedAsset;
    goldMinePreviewAssetError = getPreviewAssetError(cachedAsset);
    return cachedAsset;
  }

  try {
    const asset = await fetchPreviewAsset(assetKey, "/api/local/scene-object?objectId=goldMine&animation=ambient");
    goldMinePreviewAsset = asset;
    goldMinePreviewAssetError = getPreviewAssetError(asset);
    return asset;
  } catch (error) {
    goldMinePreviewAsset = null;
    goldMinePreviewAssetError = error instanceof Error ? error.message : "Gold mine asset is unavailable.";
    return null;
  }
}

async function loadGrassTilePreviewAsset() {
  const assetKey = getTerrainAssetKey("Grass", "TGB0");
  const cachedAsset = previewAssetCache.get(assetKey);
  if (cachedAsset) {
    grassTilePreviewAsset = cachedAsset;
    grassTilePreviewAssetError = getPreviewAssetError(cachedAsset);
    return cachedAsset;
  }

  try {
    const asset = await fetchPreviewAsset(assetKey, "/api/local/terrain-tile?terrain=Grass&tileId=TGB0");
    grassTilePreviewAsset = asset;
    grassTilePreviewAssetError = getPreviewAssetError(asset);
    return asset;
  } catch (error) {
    grassTilePreviewAsset = null;
    grassTilePreviewAssetError = error instanceof Error ? error.message : "Grass tile asset is unavailable.";
    return null;
  }
}

async function loadEffectPreviewAsset(effectId) {
  const assetKey = getEffectAssetKey(effectId);
  if (previewAssetCache.has(assetKey)) return previewAssetCache.get(assetKey);

  return fetchPreviewAsset(assetKey, `/api/local/effect?effectId=${encodeURIComponent(effectId)}`);
}

async function loadSpellPreviewAssets(spellId) {
  const spell = getSpellPreview(spellId);
  return Promise.all(getSpellPreviewEffectIds(spell).map((effectId) => loadEffectPreviewAsset(effectId)));
}

async function fetchPreviewAsset(assetKey, url) {
  if (previewAssetCache.has(assetKey)) return previewAssetCache.get(assetKey);
  if (previewAssetRequests.has(assetKey)) return previewAssetRequests.get(assetKey);

  const request = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        return { ok: false, available: false, error: formatHeroPreviewAssetError(body) };
      }
      if (!body.available) return body;
      const image = new Image();
      image.src = body.imageSrc;
      await image.decode();
      return { ...body, image };
    })
    .then((asset) => {
      previewAssetCache.set(assetKey, asset);
      return asset;
    })
    .finally(() => {
      previewAssetRequests.delete(assetKey);
    });

  previewAssetRequests.set(assetKey, request);
  return request;
}

function precacheHeroPreviewAssets() {
  if (!localPathStatus?.desktopMode) {
    updateHeroPreviewCacheStatus();
    return;
  }
  if (heroPreviewPrecacheStarted) return;
  heroPreviewPrecacheStarted = true;

  const jobs = [];
  jobs.push(() => loadGrassTilePreviewAsset());
  jobs.push(() => loadGoldMinePreviewAsset());
  for (const avatar of heroAvatars) {
    for (const animation of getAvailableHeroAnimationTypes(avatar.id)) {
      jobs.push(() => loadHeroPreviewAsset(avatar.id, animation.id));
    }
  }
  for (const effectId of getAllSpellPreviewEffectIds()) {
    jobs.push(() => loadEffectPreviewAsset(effectId));
  }

  heroPreviewPrecacheTotal = jobs.length;
  heroPreviewPrecacheLoaded = 0;
  updateHeroPreviewCacheStatus();

  let nextIndex = 0;
  const runNext = async () => {
    while (nextIndex < jobs.length) {
      const job = jobs[nextIndex];
      nextIndex += 1;
      try {
        await job();
      } catch {
        // Individual preview assets may be unavailable in static mode or for unsupported animations.
      } finally {
        heroPreviewPrecacheLoaded += 1;
        updateHeroPreviewCacheStatus();
      }
    }
  };

  for (let index = 0; index < Math.min(heroPreviewPrecacheConcurrency, jobs.length); index += 1) {
    runNext();
  }
}

function getHeroPreviewAssetKey(avatarId, animationId) {
  return `avatar:${String(avatarId ?? "").toUpperCase()}:${getHeroAnimation(animationId).id}`;
}

function getSceneObjectAssetKey(objectId, animationId) {
  return `scene:${objectId}:${getHeroAnimation(animationId).id}`;
}

function getEffectAssetKey(effectId) {
  return `effect:${String(effectId ?? "").toUpperCase()}`;
}

function getTerrainAssetKey(terrainName, tileId) {
  return `terrain:${String(terrainName ?? "").toLowerCase()}:${String(tileId ?? "").toUpperCase()}`;
}

function getAllSpellPreviewEffectIds() {
  return [
    ...new Set(spellPreviewSpells.flatMap((spell) => getSpellPreviewEffectIds(spell))),
  ];
}

function getPreviewAssetError(asset) {
  if (!asset) return "";
  if (!asset.ok) return asset.error ?? "Local game assets are unavailable.";
  if (!asset.available) return asset.reason ?? "This animation is not available.";
  return "";
}

function getHeroPreviewCacheStatusText() {
  if (!localPathStatus?.desktopMode) return "Local assets pending";
  if (!heroPreviewPrecacheStarted) return "Cache pending";
  if (!heroPreviewPrecacheTotal) return "Cache warming";
  if (heroPreviewPrecacheLoaded >= heroPreviewPrecacheTotal) return "Preview assets cached";
  return `Caching ${heroPreviewPrecacheLoaded}/${heroPreviewPrecacheTotal}`;
}

function updateHeroPreviewCacheStatus() {
  const status = document.querySelector("#hero-preview-cache-status");
  if (status) status.textContent = getHeroPreviewCacheStatusText();
}

function drawHeroPreview(canvas, summary, animation, timestamp) {
  const context = canvas.getContext("2d");
  const renderScale = canvas.width / heroPreviewLogicalWidth;
  const width = heroPreviewLogicalWidth;
  const height = heroPreviewLogicalHeight;
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);
  const metrics = getCommandRadiusSceneMetrics(summary.command);
  const scale = normalizeHeroPreviewZoom(heroPreviewZoom);

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  drawPreviewBackground(context, width, height);
  drawPreviewRadius(context, centerX, centerY, metrics, scale, timestamp);
  drawPreviewMine(context, centerX, centerY, scale, timestamp);
  drawSpellPreviewEffects(context, centerX, centerY, scale, animation, timestamp, "behind");
  drawPreviewHero(context, centerX, centerY, scale, summary, animation, timestamp);
  drawSpellPreviewEffects(context, centerX, centerY, scale, animation, timestamp, "front");
  drawPreviewMessage(context, width, height);
  context.setTransform(1, 0, 0, 1, 0, 0);
}

function drawPreviewBackground(context, width, height) {
  if (grassTilePreviewAsset?.available && grassTilePreviewAsset.image) {
    context.save();
    context.imageSmoothingEnabled = false;
    const pattern = context.createPattern(grassTilePreviewAsset.image, "repeat");
    if (pattern) {
      context.fillStyle = pattern;
      context.fillRect(0, 0, width, height);
      const shade = context.createLinearGradient(0, 0, width, height);
      shade.addColorStop(0, "rgba(255, 255, 255, 0.06)");
      shade.addColorStop(0.72, "rgba(39, 62, 38, 0.10)");
      shade.addColorStop(1, "rgba(18, 33, 22, 0.18)");
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
      context.restore();
      return;
    }
    context.restore();
  }

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#8da36f");
  gradient.addColorStop(0.55, "#6f8d5f");
  gradient.addColorStop(1, "#546f49");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 1200; index += 1) {
    const x = (index * 47) % width;
    const y = (index * 83) % height;
    const length = 5 + ((index * 13) % 13);
    const alpha = 0.05 + ((index % 7) * 0.012);
    context.strokeStyle = index % 3 === 0 ? `rgba(225, 239, 178, ${alpha})` : `rgba(37, 65, 34, ${alpha})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y - length * 0.45);
    context.stroke();
  }

  context.fillStyle = "rgba(28, 56, 31, 0.12)";
  for (let index = 0; index < 90; index += 1) {
    const x = (index * 131) % width;
    const y = (index * 71) % height;
    const radiusX = 12 + (index % 5) * 4;
    const radiusY = 3 + (index % 4);
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, -0.4, 0, Math.PI * 2);
    context.fill();
  }
}

function drawPreviewRadius(context, centerX, centerY, metrics, scale, timestamp) {
  if (metrics.radius <= 0) return;

  const radiusX = metrics.radiusX * scale;
  const radiusY = metrics.radiusY * scale;
  const phase = ((timestamp || 0) / 38) % 32;

  context.save();
  context.lineWidth = 5;
  context.strokeStyle = "rgba(18, 61, 112, 0.18)";
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();

  context.lineWidth = 2;
  context.setLineDash([18, 14]);
  context.lineDashOffset = -phase;
  context.strokeStyle = "rgba(245, 250, 255, 0.88)";
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();

  context.lineWidth = 2;
  context.setLineDash([8, 24]);
  context.lineDashOffset = 24 - phase;
  context.strokeStyle = "rgba(28, 111, 190, 0.95)";
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawPreviewMine(context, centerX, centerY, scale, timestamp) {
  const point = projectPreviewCell(centerX, centerY, scale, previewMineOffsetCells.x, previewMineOffsetCells.y);
  if (goldMinePreviewAsset?.available && goldMinePreviewAsset.image) {
    const frameCount = Math.max(1, goldMinePreviewAsset.frameCount || 1);
    const delta = goldMinePreviewLastTimestamp ? Math.max(0, timestamp - goldMinePreviewLastTimestamp) : 0;
    goldMinePreviewLastTimestamp = timestamp;
    goldMinePreviewFrameElapsed += delta;
    while (goldMinePreviewFrameElapsed >= 120) {
      goldMinePreviewFrameElapsed -= 120;
      goldMinePreviewFrame = (goldMinePreviewFrame + 1) % frameCount;
    }
    drawPreviewSprite(context, goldMinePreviewAsset, point.x, point.y, scale * 0.78, goldMinePreviewFrame, 0);
    drawGoldMineVfx(context, point.x, point.y, scale, timestamp);
    return;
  }

  drawFallbackMine(context, point.x, point.y, scale);
  drawGoldMineVfx(context, point.x, point.y, scale, timestamp);
}

function drawFallbackMine(context, x, y, scale) {
  const size = Math.max(0.82, scale);

  context.save();
  context.lineJoin = "round";

  context.fillStyle = "rgba(20, 32, 31, 0.24)";
  context.beginPath();
  context.ellipse(x + 2 * size, y + 12 * size, 48 * size, 14 * size, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(91, 105, 86, 0.6)";
  context.strokeStyle = "rgba(41, 58, 45, 0.35)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x, y - 24 * size);
  context.lineTo(x + 54 * size, y + 1 * size);
  context.lineTo(x + 2 * size, y + 29 * size);
  context.lineTo(x - 54 * size, y + 1 * size);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#5b5d58";
  context.strokeStyle = "#39413b";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x - 35 * size, y - 1 * size);
  context.lineTo(x - 17 * size, y - 28 * size);
  context.lineTo(x + 21 * size, y - 30 * size);
  context.lineTo(x + 42 * size, y - 2 * size);
  context.lineTo(x + 22 * size, y + 17 * size);
  context.lineTo(x - 20 * size, y + 18 * size);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#2a2f2d";
  context.beginPath();
  context.moveTo(x - 20 * size, y + 15 * size);
  context.quadraticCurveTo(x - 4 * size, y - 20 * size, x + 19 * size, y + 15 * size);
  context.closePath();
  context.fill();

  context.strokeStyle = "#7b5434";
  context.lineWidth = 5 * size;
  context.beginPath();
  context.moveTo(x - 20 * size, y + 14 * size);
  context.lineTo(x - 20 * size, y - 1 * size);
  context.quadraticCurveTo(x - 4 * size, y - 24 * size, x + 19 * size, y - 1 * size);
  context.lineTo(x + 19 * size, y + 14 * size);
  context.stroke();

  context.strokeStyle = "#4c3424";
  context.lineWidth = 2 * size;
  context.beginPath();
  context.moveTo(x - 28 * size, y + 2 * size);
  context.lineTo(x + 29 * size, y + 2 * size);
  context.moveTo(x - 17 * size, y - 13 * size);
  context.lineTo(x + 15 * size, y - 13 * size);
  context.stroke();

  context.fillStyle = "#d7a83f";
  context.strokeStyle = "#765d2d";
  context.lineWidth = 1.5;
  for (const ore of [
    { x: 35, y: 11, r: 8 },
    { x: 47, y: 9, r: 6 },
    { x: 41, y: 20, r: 7 },
  ]) {
    context.beginPath();
    context.moveTo(x + ore.x * size, y + (ore.y - ore.r) * size);
    context.lineTo(x + (ore.x + ore.r) * size, y + ore.y * size);
    context.lineTo(x + ore.x * size, y + (ore.y + ore.r) * size);
    context.lineTo(x + (ore.x - ore.r) * size, y + ore.y * size);
    context.closePath();
    context.fill();
    context.stroke();
  }

  context.fillStyle = "#5f3927";
  context.fillRect(x - 54 * size, y + 9 * size, 22 * size, 10 * size);
  context.fillStyle = "#2f3330";
  context.beginPath();
  context.arc(x - 49 * size, y + 22 * size, 4 * size, 0, Math.PI * 2);
  context.arc(x - 35 * size, y + 22 * size, 4 * size, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function drawGoldMineVfx(context, x, y, scale, timestamp) {
  const time = timestamp || 0;
  const size = Math.max(0.8, scale);

  context.save();
  context.globalCompositeOperation = "source-over";
  for (let index = 0; index < 9; index += 1) {
    const lifetime = 2600;
    const phase = ((time + index * 283) % lifetime) / lifetime;
    const drift = ((index * 37) % 29) - 14;
    const radius = (8 + phase * 18 + (index % 3) * 2) * size;
    const puffX = x + drift * size + Math.sin(phase * Math.PI * 2 + index) * 14 * size;
    const puffY = y - (64 + phase * 92 + (index % 2) * 14) * size;
    const alpha = Math.max(0, 0.22 * (1 - phase));

    context.fillStyle = `rgba(230, 232, 210, ${alpha})`;
    context.beginPath();
    context.ellipse(puffX, puffY, radius * 0.9, radius * 0.58, -0.18, 0, Math.PI * 2);
    context.fill();
  }

  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < 7; index += 1) {
    const phase = ((time + index * 191) % 1200) / 1200;
    const sparkleX = x + (30 + (index % 3) * 15) * size;
    const sparkleY = y + (2 + ((index * 11) % 22)) * size;
    const sparkle = (1 - Math.abs(phase - 0.5) * 2) * size;
    const alpha = Math.min(0.92, 0.18 + sparkle * 0.28);
    context.fillStyle = `rgba(255, 218, 91, ${alpha})`;
    context.beginPath();
    context.ellipse(sparkleX, sparkleY, (2 + sparkle * 5) * size, (1 + sparkle * 3) * size, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function projectPreviewCell(centerX, centerY, scale, cellX, cellY) {
  return {
    x: centerX + (cellX - cellY) * CELL_WIDTH * scale,
    y: centerY + (cellX + cellY) * CELL_HEIGHT * scale * 0.5,
  };
}

function drawPreviewSprite(context, asset, anchorX, anchorY, scale, frameIndex = 0, direction = DEFAULT_HERO_DIRECTION) {
  const rows = Math.max(1, Math.floor(asset.sheetHeight / asset.frameHeight));
  const sourceX = Math.min(frameIndex, Math.max(0, asset.frameCount - 1)) * asset.frameWidth;
  const sourceY = Math.min(direction, rows - 1) * asset.frameHeight;
  const drawX = anchorX - asset.originX * scale;
  const drawY = anchorY - asset.originY * scale;

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    asset.image,
    sourceX,
    sourceY,
    asset.frameWidth,
    asset.frameHeight,
    drawX,
    drawY,
    asset.frameWidth * scale,
    asset.frameHeight * scale,
  );
  context.restore();
}

function drawSpellPreviewEffects(context, centerX, centerY, scale, animation, timestamp, layer) {
  if (animation.id !== "spell") return;

  const spell = getSpellPreview(previewSpellId);
  const targetPoint = projectPreviewCell(
    centerX,
    centerY,
    scale,
    previewSpellTargetOffsetCells.x,
    previewSpellTargetOffsetCells.y,
  );

  if (layer === "behind") {
    drawEffectList(context, spell.effects.persistent, targetPoint.x, targetPoint.y, scale * 0.86, timestamp, {
      spread: 18,
      alpha: 0.92,
    });
    drawEffectList(context, spell.effects.target, targetPoint.x, targetPoint.y, scale * 0.92, timestamp, {
      spread: 26,
      alpha: 0.98,
    });
    drawMissileEffect(context, spell.effects.missile, centerX, centerY - 18 * scale, targetPoint.x, targetPoint.y, scale, timestamp);
    return;
  }

  drawEffectList(context, spell.effects.casting, centerX, centerY - 2 * scale, scale * 0.78, timestamp, {
    spread: 12,
    alpha: 0.92,
  });
}

function drawEffectList(context, effectIds, x, y, scale, timestamp, options = {}) {
  const availableAssets = effectIds.map((effectId) => getEffectPreviewAsset(effectId)).filter(Boolean);
  const spread = options.spread ?? 0;

  availableAssets.forEach((asset, index) => {
    const offsetIndex = index - (availableAssets.length - 1) / 2;
    const frame = getTimedPreviewFrame(asset, timestamp, index * 97);
    const drawX = x + offsetIndex * spread * scale;
    const drawY = y + Math.abs(offsetIndex) * 5 * scale;
    context.save();
    context.globalAlpha = options.alpha ?? 1;
    drawPreviewSprite(context, asset, drawX, drawY, scale, frame, 0);
    context.restore();
  });
}

function drawMissileEffect(context, effectIds, startX, startY, endX, endY, scale, timestamp) {
  const asset = effectIds.map((effectId) => getEffectPreviewAsset(effectId)).find(Boolean);
  if (!asset) return;

  const cycle = 1100;
  const phase = ((timestamp || 0) % cycle) / cycle;
  const travel = Math.min(1, phase / 0.82);
  const arc = Math.sin(travel * Math.PI) * 44 * scale;
  const x = startX + (endX - startX) * travel;
  const y = startY + (endY - startY) * travel - arc;
  const frame = getTimedPreviewFrame(asset, timestamp, 0);

  context.save();
  context.globalCompositeOperation = "lighter";
  drawPreviewSprite(context, asset, x, y, scale * 0.82, frame, heroPreviewDirection);
  context.restore();
}

function getEffectPreviewAsset(effectId) {
  const asset = previewAssetCache.get(getEffectAssetKey(effectId));
  if (!asset?.available || !asset.image) return null;
  return asset;
}

function getTimedPreviewFrame(asset, timestamp, offset = 0) {
  const frameCount = Math.max(1, asset.frameCount || 1);
  const frameDuration = getEffectPreviewFrameDuration(asset);
  return Math.floor(((timestamp || 0) + offset) / frameDuration) % frameCount;
}

function getEffectPreviewFrameDuration(asset) {
  const id = String(asset?.effectId ?? asset?.spriteId ?? "");
  if (id === "EZ09" || id === "EZ11" || id === "EZ32") return 46;
  if (id.startsWith("EJ")) return 78;
  return 55;
}

function drawPreviewHero(context, centerX, centerY, scale, summary, animation, timestamp) {
  if (!heroPreviewAsset?.available || !heroPreviewAsset.image) {
    drawFallbackHero(context, centerX, centerY, scale);
    return;
  }

  const frameCount = Math.max(1, heroPreviewAsset.frameCount || 1);
  const delta = heroPreviewLastTimestamp ? Math.max(0, timestamp - heroPreviewLastTimestamp) : 0;
  heroPreviewLastTimestamp = timestamp;
  const frameDuration = getHeroPreviewFrameDuration(summary, animation, frameCount);
  heroPreviewFrameElapsed += delta;
  while (heroPreviewFrameElapsed >= frameDuration) {
    heroPreviewFrameElapsed -= frameDuration;
    heroPreviewFrame = (heroPreviewFrame + 1) % frameCount;
  }

  drawPreviewSprite(context, heroPreviewAsset, centerX, centerY, scale, heroPreviewFrame, heroPreviewDirection);
}

function drawFallbackHero(context, centerX, centerY, scale) {
  const heroScale = scale;
  context.save();
  context.fillStyle = "rgba(20, 32, 31, 0.28)";
  context.beginPath();
  context.ellipse(centerX, centerY + 7 * heroScale, 18 * heroScale, 7 * heroScale, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#7d2931";
  context.fillRect(centerX - 8 * heroScale, centerY - 46 * heroScale, 16 * heroScale, 38 * heroScale);
  context.fillStyle = "#273d4c";
  context.fillRect(centerX - 12 * heroScale, centerY - 28 * heroScale, 24 * heroScale, 23 * heroScale);
  context.fillStyle = "#d8c39a";
  context.fillRect(centerX - 6 * heroScale, centerY - 58 * heroScale, 12 * heroScale, 12 * heroScale);
  context.restore();
}

function drawPreviewMessage(context, width, height) {
  const text =
    heroPreviewAssetError ||
    goldMinePreviewAssetError ||
    grassTilePreviewAssetError ||
    (!heroPreviewAsset ? "Loading local hero animation..." : "");
  if (!text) return;

  context.save();
  context.fillStyle = "rgba(20, 32, 31, 0.78)";
  context.fillRect(18, height - 54, width - 36, 34);
  context.fillStyle = "#ffffff";
  context.font = "700 15px Segoe UI, Arial, sans-serif";
  context.fillText(text, 34, height - 32);
  context.restore();
}

function formatHeroPreviewAssetError(body) {
  if (body?.error === "Unknown API endpoint") {
    return "Preview assets need the updated desktop server. Reopen the rebuilt WBC3 Planner.exe.";
  }
  return body?.error ?? "Local game assets are unavailable.";
}

function normalizeHeroPreviewZoom(value) {
  return Math.min(4, Math.max(1, Number(value) || 1));
}

function formatHeroPreviewZoom(value) {
  return `${Math.round(normalizeHeroPreviewZoom(value) * 100)}%`;
}

function formatHeroPreviewAnimationReadout(summary, animation, spell) {
  if (animation.id === "fight") return `Attack cycle ${formatAttackSpeed(summary.attackSpeed)}`;
  if (animation.id === "walk") return `Walk speed ${summary.speed}`;
  if (animation.id === "spell") return spell.label;
  return animation.label;
}

function getHeroPreviewFrameDuration(summary, animation, frameCount) {
  if (animation.id === "fight") {
    return Math.max(20, summary.attackSpeed.periodMs / frameCount);
  }
  if (animation.id === "die") return 120;
  if (animation.id === "spell") return 85;
  if (animation.id === "walk") {
    const speed = Math.max(1, Number(summary.speed) || vanillaBaseWalkSpeed);
    return Math.max(22, Math.min(180, (vanillaBaseWalkFrameMs * vanillaBaseWalkSpeed) / speed));
  }
  return 105;
}

function getSkillUnlockText(unlock) {
  if (unlock.availableAt <= 1) return "start";
  if (unlock.levelAvailable && !unlock.prerequisiteMet) {
    return `level ${unlock.availableAt} / ${unlock.priorSkillPoints}/${unlock.requiredPriorSkillPoints} earlier pts`;
  }
  return `level ${unlock.availableAt}`;
}

function derivedStatsSection(title, content) {
  return `
    <section class="derived-section">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
      ${content}
    </section>
  `;
}

const statBreakdownLabels = {
  armor: "Armor",
  armySetupPoints: "Army Setup Points",
  attackSpeed: "Attack Speed",
  cold: "Cold",
  combat: "Combat",
  commandRadius: "Command Radius",
  conversionTime: "Conversion Time",
  crushing: "Crushing",
  damage: "Damage",
  electricity: "Electricity",
  fire: "Fire",
  initialTroopXp: "Initial Troop XP",
  life: "Life",
  lifeRegen: "Life Regen",
  magic: "Magic",
  mana: "Mana",
  manaRegen: "Mana Regen",
  merchant: "Merchant",
  morale: "Morale",
  piercing: "Piercing",
  resistance: "Resistance",
  slashing: "Slashing",
  speed: "Speed",
  spellcasting: "Spellcasting",
};

function statBreakdown(summary, ...keys) {
  const rows = [];
  const itemBreakdowns = summary.itemBreakdowns ?? {};
  const groups = keys
    .map((key) => ({ key, entries: Array.isArray(itemBreakdowns[key]) ? itemBreakdowns[key] : [] }))
    .filter((group) => group.entries.length);
  const showLabels = groups.length > 1;

  for (const { key, entries } of groups) {
    for (const entry of entries) {
      const source = entry.source ? `${entry.source}: ` : "";
      const prefix = showLabels ? `${statBreakdownLabels[key] ?? key}: ` : "";
      rows.push(`${prefix}${source}${entry.text}`);
    }
  }

  return rows.length ? `Item modifiers:\n${dedupeRows(rows).join("\n")}` : "";
}

function skillItemBreakdown(summary, skillId) {
  const rows = [];
  const itemEffects = summary.itemEffects ?? {};

  for (const contribution of itemEffects.skillContributions ?? []) {
    if (contribution.skillId !== skillId) continue;
    const source = contribution.source ? `${contribution.source}: ` : "";
    const amount = formatSignedValue(contribution.amount);
    const levelText = Math.abs(Number(contribution.amount) || 0) === 1 ? "skill level" : "skill levels";
    const detail = contribution.text ? ` (${contribution.text})` : "";
    rows.push(`${source}${amount} ${levelText}${detail}`);
  }

  return rows.length ? `Item modifiers:\n${dedupeRows(rows).join("\n")}` : "";
}

function dedupeRows(rows) {
  return [...new Set(rows.map((row) => String(row ?? "").trim()).filter(Boolean))];
}

function summaryItem(label, value, options = {}, iconKeyOverride = summaryIconKeys[label]) {
  const settings = typeof options === "string" ? { tooltip: options, iconKey: iconKeyOverride } : options;
  const tooltip = settings.tooltip ?? "";
  const secondary = settings.secondary ?? "";
  const iconKey = settings.iconKey ?? summaryIconKeys[label];
  const tooltipMarkup = tooltip ? summaryTooltip(`${label} item modifiers`, tooltip) : "";
  const secondaryMarkup = secondary ? `<small class="summary-subvalue">${escapeHtml(secondary)}</small>` : "";
  return `
    <div class="summary-item ${tooltip ? "has-tooltip" : ""}">
      <span class="summary-label">${iconMarkup(iconKey)}${escapeHtml(label)}</span>
      <span class="summary-value">
        <strong>${escapeHtml(value)}</strong>
        ${secondaryMarkup}
      </span>
      ${tooltipMarkup}
    </div>
  `;
}

function summaryTooltip(label, tooltip) {
  return `
    <details class="summary-tooltip">
      <summary aria-label="${escapeHtml(label)}">?</summary>
      <p>${escapeHtml(tooltip)}</p>
    </details>
  `;
}

function derivedStatGroup(rows) {
  return `
    <section class="derived-stat-group">
      <div class="derived-stat-group-list">
        ${rows.map((row) => derivedStatRow(row)).join("")}
      </div>
    </section>
  `;
}

function derivedStatRow({ label, value, secondary = "", tooltip = "", iconKey = summaryIconKeys[label] }) {
  const tooltipMarkup = tooltip ? summaryTooltip(`${label} item modifiers`, tooltip) : "";
  const secondaryMarkup = secondary ? `<small class="summary-subvalue">${escapeHtml(secondary)}</small>` : "";
  return `
    <div class="derived-stat-row ${tooltip ? "has-tooltip" : ""}">
      <span class="summary-label">${iconMarkup(iconKey)}${escapeHtml(label)}</span>
      <span class="derived-stat-value">
        <strong>${escapeHtml(value)}</strong>
        ${secondaryMarkup}
        ${tooltipMarkup}
      </span>
    </div>
  `;
}

function defenseGroup(label, value, items, iconKey = summaryIconKeys[label], tooltip = "") {
  return `
    <div class="defense-group">
      <div class="defense-parent ${tooltip ? "has-tooltip" : ""}">
        <span class="summary-label">${iconMarkup(iconKey)}${escapeHtml(label)}</span>
        <span class="defense-value">
          <strong>${escapeHtml(value)}</strong>
          ${tooltip ? summaryTooltip(`${label} item modifiers`, tooltip) : ""}
        </span>
      </div>
      <div class="defense-sublist">
        ${items.map(([itemLabel, itemValue, itemIconKey = summaryIconKeys[itemLabel], itemTooltip = ""]) => `
          <div class="defense-subrow ${itemTooltip ? "has-tooltip" : ""}">
            <span class="summary-label">${iconMarkup(itemIconKey)}${escapeHtml(itemLabel)}</span>
            <span class="defense-value">
              <strong>${escapeHtml(itemValue)}</strong>
              ${itemTooltip ? summaryTooltip(`${itemLabel} item modifiers`, itemTooltip) : ""}
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function moraleEffectsSection(summary, race) {
  const selectedView = getSelectedMoraleView(summary);
  const tooltip = statBreakdown(summary, "morale");
  return `
    <section class="morale-effects">
      <div class="morale-main ${tooltip ? "has-tooltip" : ""}">
        <span class="summary-label">${iconMarkup(summaryIconKeys.Morale)}Morale</span>
        <span class="morale-controls">
          ${moraleRaceSwitcher(summary, race)}
          <span class="morale-value">
            <strong>${escapeHtml(selectedView.morale)}</strong>
            ${tooltip ? summaryTooltip("Morale item modifiers", tooltip) : ""}
          </span>
        </span>
      </div>
      <div class="morale-effects-list">
        ${moraleEffectRow("Army Limit Bonus", formatSignedValue(selectedView.armyLimitBonus), tooltip)}
        ${moraleEffectRow("Command Effect", `${selectedView.commandEffect}s`, tooltip)}
        ${moraleEffectRow("Unit Attack Speed", formatUnitAttackSpeed(selectedView.unitAttackSpeed), tooltip)}
      </div>
    </section>
  `;
}

function moraleRaceSwitcher(summary, race) {
  const breakdown = summary.moraleBreakdown ?? {};
  const racialBonus = Math.trunc(Number(breakdown.racial) || 0);
  if (racialBonus === 0) return "";

  const selectedMode = normalizeMoraleViewMode(moraleViewMode);
  const raceLabel = race?.displayName ?? "Race";
  const skillLabel = skillsById?.[breakdown.racialSkillId]?.displayName ?? "race bonus";
  const options = [
    {
      id: "general",
      label: "All",
      title: `Show morale without ${skillLabel}`,
    },
    {
      id: "racial",
      label: raceLabel,
      title: `Show morale with ${skillLabel} (${formatSignedValue(racialBonus)})`,
    },
  ];

  return `
    <span class="morale-switcher" role="group" aria-label="Morale race bonus view">
      ${options.map((option) => `
        <button
          type="button"
          class="morale-switch-button ${option.id === selectedMode ? "is-active" : ""}"
          data-morale-view="${escapeHtml(option.id)}"
          aria-pressed="${option.id === selectedMode ? "true" : "false"}"
          title="${escapeHtml(option.title)}"
        >
          ${escapeHtml(option.label)}
        </button>
      `).join("")}
    </span>
  `;
}

function getSelectedMoraleView(summary) {
  const fallback = fallbackMoraleView(summary);
  if (!hasRaceMoraleBonus(summary)) {
    return summary.moraleViews?.racial ?? fallback;
  }

  const mode = normalizeMoraleViewMode(moraleViewMode);
  return summary.moraleViews?.[mode] ?? summary.moraleViews?.racial ?? fallback;
}

function fallbackMoraleView(summary) {
  return {
    morale: summary.morale,
    armyLimitBonus: summary.armyLimitBonus,
    commandEffect: summary.commandEffect,
    unitAttackSpeed: summary.unitAttackSpeed,
  };
}

function hasRaceMoraleBonus(summary) {
  return Math.trunc(Number(summary.moraleBreakdown?.racial) || 0) !== 0;
}

function normalizeMoraleViewMode(value) {
  return moraleViewModes.has(value) ? value : "racial";
}

function moraleEffectRow(label, value, tooltip = "") {
  return `
    <div class="morale-effect-row ${tooltip ? "has-tooltip" : ""}">
      <span>${escapeHtml(label)}</span>
      <span class="morale-value">
        <strong>${escapeHtml(value)}</strong>
        ${tooltip ? summaryTooltip(`${label} item modifiers`, tooltip) : ""}
      </span>
    </div>
  `;
}

function groupSkillEffectsBySkill(effects = []) {
  const groups = new Map();
  for (const effect of effects) {
    if (!groups.has(effect.skillId)) groups.set(effect.skillId, []);
    groups.get(effect.skillId).push(effect);
  }
  return groups;
}

function getSortedHeroClasses() {
  return [...heroClasses].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function iconMarkup(iconKey) {
  const icon = statIcons[iconKey];
  if (!icon) return "";
  return `<img class="stat-icon" src="${icon.src}" alt="" aria-hidden="true" />`;
}

function savedBuildRow(savedBuild) {
  const savedRuleset = getRuleset(savedBuild.rulesetId);
  const race = savedRuleset.data.races.find((entry) => entry.id === savedBuild.raceId);
  const heroClass = savedRuleset.data.heroClasses.find((entry) => entry.id === savedBuild.classId);
  const active = activeSavedBuildId === savedBuild.id ? "is-active" : "";
  const buildStatus = savedBuild.imported ? "Imported" : "Saved";

  return `
    <div class="saved-row ${active}">
      <img src="${getUpscaledPortraitSrc(savedBuild.portraitId)}" alt="${escapeHtml(savedBuild.name)} portrait" />
      <div>
        <strong>${escapeHtml(savedBuild.name)}</strong>
        <span>${escapeHtml(buildStatus)} / ${escapeHtml(savedRuleset.label)} / ${escapeHtml(race?.displayName ?? savedBuild.raceId)} ${escapeHtml(heroClass?.displayName ?? savedBuild.classId)} / L${savedBuild.level}</span>
      </div>
      <button type="button" data-load-build="${escapeHtml(savedBuild.id)}">Load</button>
    </div>
  `;
}

function settingsMenu(status) {
  const settings = status.settings ?? {};
  const entries = Array.isArray(status.paths) ? status.paths : [];
  const entriesByLabel = new Map(entries.map((entry) => [entry.label, entry]));
  const found = entries.filter((entry) => entry.ok).length;
  const count = entries.length || 4;
  const stateClass = found === count ? "is-valid" : "is-missing";
  return `
    <details class="settings-menu ${stateClass}">
      <summary>
        <span>Settings</span>
        <strong>${found}/${count}</strong>
      </summary>
      <div class="settings-panel">
        <h3>Paths</h3>
        <form id="local-settings-form" class="settings-form">
          ${settingsField("Game Install", "gameInstallDir", settings.gameInstallDir, entriesByLabel.get("Game Install"))}
          ${settingsField("HeroData", "heroDataPath", settings.heroDataPath, entriesByLabel.get("HeroData"))}
          ${settingsField("Portraits", "portraitsPath", settings.portraitsPath, entriesByLabel.get("Portraits"))}
          ${settingsField("Graphics", "graphicsPath", settings.graphicsPath, entriesByLabel.get("Graphics"))}
          <div class="settings-actions">
            <button type="submit">Save Paths</button>
            <button type="button" id="clear-local-settings">Auto Detect</button>
          </div>
          ${localSettingsStatus ? `<p class="settings-status">${escapeHtml(localSettingsStatus)}</p>` : ""}
        </form>
      </div>
    </details>
  `;
}

function settingsField(label, name, value = "", entry = null) {
  const trimmedValue = String(value ?? "").trim();
  const inputValue = trimmedValue || (entry?.ok ? entry.path : "");
  const stateClass = entry?.ok ? "is-valid" : "is-missing";
  const statusText = entry?.ok ? (trimmedValue ? "Saved path found" : "Auto path found") : "Path not found";
  const detail = entry?.ok ? entry.path : entry?.error ?? "";
  return `
    <label class="settings-field ${stateClass}">
      <span>
        <strong>${label}</strong>
        <em>${statusText}</em>
      </span>
      <input name="${name}" type="text" value="${escapeHtml(inputValue)}" autocomplete="off" />
      <small>${escapeHtml(detail)}</small>
    </label>
  `;
}

function messages(items) {
  if (!items.length) return "";
  return `<div class="messages">${items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`;
}

function pointBudgetRows(pointBudget, statValidation, skillValidation) {
  if (pointBudget.mode === "shared") {
    return `
      <div><span>Hero Points</span><strong>${pointBudget.spent} / ${pointBudget.available}</strong></div>
      <div><span>Stats / Skills</span><strong>${pointBudget.statSpent * pointBudget.statCost} / ${pointBudget.skillSpent}</strong></div>
    `;
  }
  return `
    <div><span>Stat Points</span><strong>${statValidation.spent} / ${statValidation.available}</strong></div>
    <div><span>Skill Points</span><strong>${skillValidation.spent} / ${skillValidation.available}</strong></div>
  `;
}

function skillBudgetText(skillValidation, pointBudget) {
  if (pointBudget.mode === "shared") {
    return `${pointBudget.spent} / ${pointBudget.available} hero`;
  }
  return `${skillValidation.spent} / ${skillValidation.available}`;
}

function formatXp(value) {
  return value === null ? "Max level" : value.toLocaleString();
}

function formatAttackSpeed(value) {
  return `${formatSecondsPrecise(value.periodMs)}s`;
}

function formatUnitAttackSpeed(value) {
  return `${formatSecondsPrecise(value.periodMs)}s`;
}

function formatRegen(value, unit) {
  return `1 ${unit} / ${formatSeconds(value.periodMs)}s`;
}

function formatSecondsPrecise(milliseconds) {
  const numeric = Number(milliseconds);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric > 0 && numeric < 10) return "<0.01";
  const seconds = Math.max(0, numeric) / 1000;
  const text = seconds.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
  return text || "0";
}

function formatSeconds(milliseconds) {
  const seconds = Math.max(0, Number(milliseconds) || 0) / 1000;
  return seconds.toFixed(1).replace(/\.0$/, "");
}

function formatMerchant(value) {
  const percent = Number(value.discountPercent) || 0;
  if (percent > 0) return `${value.score} (${percent.toFixed(1)}% discount)`;
  if (percent < 0) return `${value.score} (${Math.abs(percent).toFixed(1)}% markup)`;
  return String(value.score);
}

function formatSignedValue(value) {
  const number = Math.trunc(Number(value) || 0);
  return number > 0 ? `+${number}` : String(number);
}

function formatPercentBonus(value) {
  const number = Math.trunc(Number(value) || 0);
  const sign = number >= 0 ? "+" : "";
  return `${sign}${number}%`;
}

function loadSavedBuilds() {
  const imported = sanitizeSavedBuilds(importedHeroBuilds, "imported-recovered", VANILLA_RULESET_ID);
  let stored = [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(savedBuildStorageKey) ?? "[]");
    stored = Array.isArray(parsed) ? parsed : [];
  } catch {
    stored = [];
  }

  const merged = new Map();
  const importedIds = new Set(imported.map((savedBuild) => savedBuild.id));
  for (const savedBuild of sanitizeSavedBuilds(stored, "saved-recovered", VANILLA_RULESET_ID)) {
    if (savedBuild.imported && !importedIds.has(savedBuild.id)) continue;
    if (!savedBuild.imported) merged.set(savedBuild.id, savedBuild);
  }
  for (const savedBuild of imported) merged.set(savedBuild.id, savedBuild);
  const result = Array.from(merged.values());
  persistSavedBuilds(result);
  return result;
}

function mergeImportedHeroBuilds(builds, metadata) {
  const imported = sanitizeSavedBuilds(builds, "imported-recovered", VANILLA_RULESET_ID);
  const localSaved = savedBuilds.filter((savedBuild) => savedBuild && !savedBuild.imported);
  const merged = new Map();

  for (const savedBuild of localSaved) merged.set(savedBuild.id, savedBuild);
  for (const savedBuild of imported) merged.set(savedBuild.id, savedBuild);

  savedBuilds = Array.from(merged.values());
  importedBuildMetadata = metadata ?? {
    path: "",
    archive: "",
    resourceCount: 0,
    heroCount: imported.length,
  };

  if (!savedBuilds.some((savedBuild) => savedBuild.id === activeSavedBuildId)) {
    activeSavedBuildId = null;
  }

  persistSavedBuilds(savedBuilds);
  render();
}

function saveCurrentBuild() {
  const defaultName = getCurrentBuildName();
  const name = window.prompt("Save build as", defaultName);
  if (!name) return;
  const savedName = name.trim() || defaultName;
  build = { ...build, name: savedName };

  const savedBuild = cloneSavedBuild({
    id: `saved-${Date.now()}`,
    name: savedName,
    rulesetId: activeRulesetId,
    raceId: build.raceId,
    classId: build.classId,
    level: build.level,
    portraitId: build.portraitId,
    avatarId: currentAvatarId(),
    statAllocation: build.statAllocation,
    skillAllocation: build.skillAllocation,
    items: normalizeEquippedItems(build.items),
    imported: false,
    origin: "Planner",
  });
  if (!savedBuild) return;

  savedBuilds = [savedBuild, ...savedBuilds];
  activeSavedBuildId = savedBuild.id;
  persistSavedBuilds(savedBuilds);
  render();
}

function loadSavedBuild(id) {
  const savedBuild = savedBuilds.find((entry) => entry.id === id);
  if (!savedBuild) return;

  activeRulesetId = normalizeRulesetId(savedBuild.rulesetId);
  persistRulesetPreference(activeRulesetId);
  refreshActiveRulesetReferences();
  build = {
    rulesetId: activeRulesetId,
    name: savedBuild.name,
    raceId: savedBuild.raceId,
    classId: savedBuild.classId,
    level: savedBuild.level,
    portraitId: savedBuild.portraitId ?? getDefaultPortraitId(savedBuild.raceId),
    avatarId: normalizeAvatarId(savedBuild.raceId, savedBuild.avatarId),
    statAllocation: normalizeStatAllocation(savedBuild.statAllocation),
    skillAllocation: normalizeSkillAllocation(savedBuild.skillAllocation),
    items: normalizeEquippedItems(savedBuild.items),
  };
  activeSavedBuildId = savedBuild.id;
  trimAllocations();
  render();
}

function persistSavedBuilds(value) {
  try {
    window.localStorage.setItem(savedBuildStorageKey, JSON.stringify(sanitizeSavedBuilds(value, "saved-recovered")));
  } catch {
    // Local storage can be unavailable in some embedded browser modes.
  }
}

function sanitizeSavedBuilds(value, fallbackPrefix, fallbackRulesetId = VANILLA_RULESET_ID) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => cloneSavedBuild(entry, `${fallbackPrefix}-${index + 1}`, fallbackRulesetId))
    .filter(Boolean);
}

function cloneSavedBuild(value, fallbackId = "", fallbackRulesetId = VANILLA_RULESET_ID) {
  if (!value || typeof value !== "object") return null;
  const rulesetId = normalizeRulesetId(value.rulesetId ?? fallbackRulesetId);
  const ruleset = getRuleset(rulesetId);
  const fallbackBuild = createDefaultBuild(rulesetId);
  const raceId = ruleset.data.races.some((entry) => entry.id === value.raceId) ? String(value.raceId) : fallbackBuild.raceId;
  const classId = ruleset.data.heroClasses.some((entry) => entry.id === value.classId) ? String(value.classId) : fallbackBuild.classId;
  return {
    id: String(value.id || fallbackId || `saved-${Date.now()}`),
    name: value.name == null ? "Unnamed Build" : String(value.name),
    rulesetId,
    raceId,
    classId,
    level: ruleset.clampLevel(value.level),
    portraitId: Number.isFinite(Number(value.portraitId)) ? Number(value.portraitId) : getDefaultPortraitId(raceId),
    avatarId: normalizeAvatarId(raceId, value.avatarId),
    statAllocation: ruleset.normalizeStatAllocation(value.statAllocation),
    skillAllocation: ruleset.normalizeSkillAllocation(value.skillAllocation),
    items: normalizeEquippedItems(value.items),
    imported: Boolean(value.imported),
    origin: value.origin ? String(value.origin) : legacySavedBuildOrigin(value),
    originalHero: value.originalHero,
  };
}

function getCurrentBuildName() {
  const name = String(build.name ?? "").trim();
  if (name) return name;
  const ruleset = getRuleset(build.rulesetId);
  const race = ruleset.data.races.find((entry) => entry.id === build.raceId);
  const heroClass = ruleset.data.heroClasses.find((entry) => entry.id === build.classId);
  return `${race?.displayName ?? "Hero"} ${heroClass?.displayName ?? "Build"} L${build.level}`;
}

function legacySavedBuildOrigin(value) {
  const legacyKey = "sou" + "rce";
  return value[legacyKey] ? String(value[legacyKey]) : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

window.addEventListener("keydown", handleHeroPreviewDirectionKeydown);

render();
loadLocalPathStatus();
loadLocalHeroBuilds();
loadLocalItems();
loadLocalSpellText();
loadLocalSkillText();

async function loadLocalPathStatus() {
  try {
    const response = await fetch("/api/local/paths", { cache: "no-store" });
    if (!response.ok) return;
    localPathStatus = await response.json();
    render();
  } catch {
    // Static web hosting does not provide the local desktop API.
  }
}

async function loadLocalHeroBuilds() {
  try {
    const response = await fetch("/api/local/heroes", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      localHeroImportError =
        body?.error === "Unknown API endpoint"
          ? "Hero import needs the current desktop server. Close and reopen WBC3 Planner."
          : body?.error
            ? `Hero import failed: ${body.error}`
            : "";
      render();
      return;
    }

    localHeroImportError = "";
    mergeImportedHeroBuilds(body.builds, body.metadata);
  } catch {
    // Static web hosting does not provide the local desktop API.
  }
}

async function loadLocalItems() {
  try {
    const response = await fetch("/api/local/items", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      localItemCatalog = [];
      localItemShineSprites = {};
      localItemSets = [];
      localItemCatalogError =
        body?.error === "Unknown API endpoint"
          ? "Item search needs the current desktop server. Close and reopen WBC3 Planner."
          : body?.error
            ? `Item search failed: ${body.error}`
            : "";
      render();
      return;
    }

    localItemCatalog = Array.isArray(body.items) ? body.items : [];
    localItemShineSprites = body.shineSprites && typeof body.shineSprites === "object" ? body.shineSprites : {};
    localItemSets = Array.isArray(body.sets) ? body.sets : [];
    localItemCatalogError = "";
    render();
  } catch {
    // Static web hosting does not provide the local desktop API.
  }
}

async function loadLocalSpellText() {
  try {
    const response = await fetch("/api/local/spells", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      localSpellTextByIndex = new Map();
      localSpellTextError =
        body?.error === "Unknown API endpoint"
          ? ""
          : body?.error
            ? `Spell descriptions failed: ${body.error}`
            : "";
      render();
      return;
    }

    localSpellTextByIndex = new Map(
      (Array.isArray(body.spells) ? body.spells : [])
        .filter((spell) => Number.isInteger(Number(spell.index)))
        .map((spell) => [
          Number(spell.index),
          {
            name: String(spell.name ?? ""),
            description: String(spell.description ?? ""),
          },
        ]),
    );
    localSpellTextError = "";
    render();
  } catch {
    // Static web hosting does not provide the local desktop API.
  }
}

async function loadLocalSkillText() {
  try {
    const response = await fetch("/api/local/skills", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      localSkillTextById = new Map();
      localSkillMagicTemplates = {};
      localSkillTextError =
        body?.error === "Unknown API endpoint"
          ? ""
          : body?.error
            ? `Skill descriptions failed: ${body.error}`
            : "";
      render();
      return;
    }

    localSkillTextById = new Map(
      (Array.isArray(body.skills) ? body.skills : [])
        .filter((skill) => skill?.id)
        .map((skill) => [
          String(skill.id),
          {
            name: String(skill.name ?? ""),
            descriptionTemplate: String(skill.descriptionTemplate ?? ""),
            kind: String(skill.kind ?? "skill"),
          },
        ]),
    );
    localSkillMagicTemplates = body.magicTemplates && typeof body.magicTemplates === "object" ? body.magicTemplates : {};
    localSkillTextError = "";
    render();
  } catch {
    // Static web hosting does not provide the local desktop API.
  }
}

async function saveLocalPathSettings(form) {
  const formData = new FormData(form);
  const payload = {
    gameInstallDir: String(formData.get("gameInstallDir") ?? ""),
    heroDataPath: String(formData.get("heroDataPath") ?? ""),
    portraitsPath: String(formData.get("portraitsPath") ?? ""),
    graphicsPath: String(formData.get("graphicsPath") ?? ""),
  };
  localSettingsStatus = "Saving paths...";
  render();
  try {
    const response = await fetch("/api/local/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.ok) {
      localSettingsStatus = body?.error ? `Settings failed: ${body.error}` : "Settings failed.";
      render();
      return;
    }

    localPathStatus = body.pathStatus ?? localPathStatus;
    localSettingsStatus = "Paths saved.";
    loadLocalItems();
    loadLocalSpellText();
    loadLocalSkillText();

    if (body.heroImport?.ok) {
      localHeroImportError = "";
      mergeImportedHeroBuilds(body.heroImport.builds, body.heroImport.metadata);
      return;
    }

    if (body.heroImport?.error) {
      localHeroImportError = `Hero import failed: ${body.heroImport.error}`;
    }
    render();
  } catch (error) {
    localSettingsStatus = error instanceof Error ? `Settings failed: ${error.message}` : "Settings failed.";
    render();
  }
}

function clearLocalPathSettings() {
  const form = document.querySelector("#local-settings-form");
  if (!form) return;
  for (const input of form.querySelectorAll("input")) {
    input.value = "";
  }
  saveLocalPathSettings(form);
}
