import { HERO_MAX_LEVEL, heroClasses, races, skillsById } from "./data/gameData.js";
import { importedHeroBuilds, importedHeroBuildMetadata } from "./data/importedHeroBuilds.js";
import {
  getDefaultPortraitId,
  getPortraitOptions,
  getUpscaledPortraitSrc,
} from "./data/portraits.js";
import { statIcons, summaryIconKeys } from "./data/statIcons.js";
import {
  calculateHeroSummary,
  calculateStartingStats,
  clampLevel,
  getAvailableSkillUnlocks,
  getSkillPointsForLevel,
  getStatPointsForLevel,
  normalizeSkillAllocation,
  normalizeStatAllocation,
  validateSkillAllocation,
  validateStatAllocation,
} from "./rules/plannerRules.js";

const statLabels = {
  strength: "Strength",
  dexterity: "Dexterity",
  intelligence: "Intelligence",
  charisma: "Charisma",
};

const savedBuildStorageKey = "wbc3-character-planner.savedBuilds.v1";

document.title = "Warlords Battlecry 3 - Character Planner";

let build = createDefaultBuild();

let savedBuilds = loadSavedBuilds();
let activeSavedBuildId = null;
let localPathStatus = null;
let importedBuildMetadata = importedHeroBuildMetadata;
let localHeroImportError = "";
let localSettingsStatus = "";

const app = document.querySelector("#app");

function render() {
  const summary = calculateHeroSummary(build);
  const startingStats = calculateStartingStats(build.raceId, build.classId);
  const statValidation = validateStatAllocation(build);
  const skillValidation = validateSkillAllocation(build);
  const unlocks = getAvailableSkillUnlocks(build);
  const effectsBySkill = groupSkillEffectsBySkill(summary.skillEffectList);
  const race = races.find((entry) => entry.id === build.raceId);
  const heroClass = heroClasses.find((entry) => entry.id === build.classId);

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div class="top-actions">
          <div class="rules-pill">Rules: WBC3 10323</div>
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
            <input id="hero-name-input" type="text" maxlength="40" value="${escapeHtml(build.name ?? "")}" />
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
              ${heroClasses.map((item) => option(item.id, item.displayName, build.classId)).join("")}
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
            <div><span>Level XP</span><strong>${summary.xpForLevel.toLocaleString()}</strong></div>
            <div><span>Next level XP</span><strong>${formatXp(summary.nextLevelXp)}</strong></div>
          </div>

        </aside>

        <section class="panel stats-panel">
          <div class="panel-heading">
            <h2>Stats</h2>
            <span>${statValidation.spent} / ${statValidation.available}</span>
          </div>
          <div class="stat-grid">
            ${Object.keys(statLabels)
              .map((key) =>
                statRow(
                  key,
                  startingStats[key],
                  build.statAllocation[key],
                  summary.stats[key],
                  statValidation.spent < statValidation.available,
                ),
              )
              .join("")}
          </div>
          ${messages(statValidation.warnings)}
        </section>

        <section class="panel core-panel">
          <div class="panel-heading">
            <h2>Core</h2>
          </div>
          <div class="core-grid">
            ${summaryItem("Life", summary.life, { secondary: formatRegen(summary.lifeRegen, "HP") })}
            ${summaryItem("Mana", summary.mana, { secondary: formatRegen(summary.manaRegen, "MP") })}
            ${summaryItem("Combat", summary.combat)}
            ${summaryItem("Speed", summary.speed)}
            ${summaryItem("Damage", `${summary.damage} ${summary.damageType}`)}
            ${summaryItem("Attack Speed", formatAttackSpeed(summary.attackSpeed))}
          </div>
        </section>

        <section class="panel summary-panel">
          <div class="panel-heading">
            <h2>Utility</h2>
          </div>
          <div class="summary-grid">
            ${summaryItem("Spellcasting", summary.spellcasting)}
            ${summaryItem("Initial Troop XP", summary.initialTroopXp)}
            ${moraleEffectsSection(summary)}
            ${summaryItem("Merchant", formatMerchant(summary.merchant))}
            ${summaryItem("Command Radius", summary.commandRadius)}
            ${summaryItem("Command Score", summary.command)}
            ${summaryItem("Group Limit", summary.groupLimit)}
            ${summaryItem("Conversion Time", `${summary.conversionTime}s`)}
            ${summaryItem("Retinue Slots", summary.retinueSlots)}
          </div>
        </section>

        <section class="panel defense-panel">
          <div class="panel-heading">
            <h2>Defense</h2>
          </div>
          <div class="defense-grid">
            ${defenseGroup("Armor", summary.armor, [
              ["Piercing", summary.damageResistances.piercing],
              ["Slashing", summary.damageResistances.slashing],
              ["Crushing", summary.damageResistances.crushing],
            ])}
            ${defenseGroup("Resistance", summary.resistance, [
              ["Fire", summary.damageResistances.fire, "fire"],
              ["Cold", summary.damageResistances.cold, "cold"],
              ["Electricity", summary.damageResistances.electricity, "electricity"],
              ["Magic", summary.damageResistances.magic, "magic"],
            ])}
          </div>
        </section>

        <section class="panel skills-panel">
          <div class="panel-heading">
            <h2>Skills</h2>
            <span>${skillValidation.spent} / ${skillValidation.available}</span>
          </div>
          <div class="skills-list">
            ${unlocks.map((unlock) => skillRow(unlock, skillValidation, effectsBySkill.get(unlock.skillId) ?? [])).join("")}
          </div>
          ${messages(skillValidation.warnings)}
        </section>
      </section>
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  bindExclusiveTopbarMenus();

  document.querySelector("#reset-build-button").addEventListener("click", () => {
    resetBuild();
  });

  document.querySelector("#hero-name-input").addEventListener("input", (event) => {
    build = { ...build, name: event.target.value };
  });

  document.querySelector("#race-select").addEventListener("change", (event) => {
    const raceId = event.target.value;
    build = { ...build, raceId, portraitId: getDefaultPortraitId(raceId), skillAllocation: {} };
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

  document.querySelector("#save-current-build").addEventListener("click", () => {
    saveCurrentBuild();
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
  const menus = Array.from(document.querySelectorAll(".settings-menu, .saved-menu"));
  for (const menu of menus) {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      for (const otherMenu of menus) {
        if (otherMenu !== menu) otherMenu.open = false;
      }
    });
  }
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

function resetBuild() {
  build = createDefaultBuild();
  activeSavedBuildId = null;
  render();
}

function trimAllocations() {
  const statBudget = getStatPointsForLevel(build.level);
  const stats = normalizeStatAllocation(build.statAllocation);
  trimBudget(stats, statBudget);

  const skillBudget = getSkillPointsForLevel(build.level);
  const skills = normalizeSkillAllocation(build.skillAllocation);

  let changed = true;
  let guard = 0;
  while (changed && guard < 10) {
    guard += 1;
    changed = false;
    changed = trimBudget(skills, skillBudget) || changed;
    changed = trimSkillUnlocks(skills) || changed;
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

function createDefaultBuild() {
  return {
    name: "New Hero",
    raceId: "knight",
    classId: "warrior",
    level: 1,
    portraitId: getDefaultPortraitId("knight"),
    statAllocation: { strength: 0, dexterity: 0, intelligence: 0, charisma: 0 },
    skillAllocation: {},
  };
}

function option(id, label, selectedId) {
  return `<option value="${id}" ${id === selectedId ? "selected" : ""}>${label}</option>`;
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

function skillRow(unlock, skillValidation, effects = []) {
  const skill = skillsById[unlock.skillId];
  const allocated = build.skillAllocation[unlock.skillId] ?? 0;
  const originText = unlock.mergedFrom?.length > 1 ? "Race + class" : unlock.origin;
  const unlockText = getSkillUnlockText(unlock);
  const locked = !unlock.available ? "is-locked" : "";
  const hasEffects = effects.length ? "has-effects" : "";
  const maxed = unlock.maxLevel !== Infinity && unlock.currentLevel >= unlock.maxLevel;
  const canAdd = unlock.available && !maxed && skillValidation.spent < skillValidation.available;
  return `
    <article class="skill-row ${locked} ${hasEffects}">
      <div class="skill-info">
        <strong>${skill?.displayName ?? unlock.skillId}</strong>
        <span>${originText} / ${unlockText}</span>
      </div>
      ${skillEffectList(effects)}
      <div class="stepper">
        <button type="button" data-skill-key="${unlock.skillId}" data-skill-action="-1" ${allocated <= 0 ? "disabled" : ""}>-</button>
        <span>${allocated}</span>
        <button type="button" data-skill-key="${unlock.skillId}" data-skill-action="1" ${!canAdd ? "disabled" : ""}>+</button>
      </div>
      <output>${unlock.currentLevel}</output>
    </article>
  `;
}

function skillEffectList(effects) {
  return `
    <div class="skill-effects-inline">
      ${effects.map(skillEffectRow).join("")}
    </div>
  `;
}

function skillEffectRow(effect) {
  return `
    <div class="skill-effect-row">
      <span>${escapeHtml(effect.label)}</span>
      <strong>${escapeHtml(effect.value)}</strong>
      ${effect.detail ? `<small>${escapeHtml(effect.detail)}</small>` : ""}
    </div>
  `;
}

function getSkillUnlockText(unlock) {
  if (unlock.availableAt <= 1) return "start";
  if (unlock.levelAvailable && !unlock.prerequisiteMet) {
    return `level ${unlock.availableAt} / ${unlock.priorSkillPoints}/${unlock.requiredPriorSkillPoints} earlier pts`;
  }
  return `level ${unlock.availableAt}`;
}

function summaryItem(label, value, options = {}, iconKeyOverride = summaryIconKeys[label]) {
  const settings = typeof options === "string" ? { tooltip: options, iconKey: iconKeyOverride } : options;
  const tooltip = settings.tooltip ?? "";
  const secondary = settings.secondary ?? "";
  const iconKey = settings.iconKey ?? summaryIconKeys[label];
  const tooltipMarkup = tooltip ? `<span class="summary-tooltip" role="tooltip">${escapeHtml(tooltip)}</span>` : "";
  const secondaryMarkup = secondary ? `<small class="summary-subvalue">${escapeHtml(secondary)}</small>` : "";
  return `
    <div class="summary-item ${tooltip ? "has-tooltip" : ""}" ${tooltip ? 'tabindex="0"' : ""}>
      <span class="summary-label">${iconMarkup(iconKey)}${label}</span>
      <span class="summary-value">
        <strong>${value}</strong>
        ${secondaryMarkup}
      </span>
      ${tooltipMarkup}
    </div>
  `;
}

function defenseGroup(label, value, items, iconKey = summaryIconKeys[label]) {
  return `
    <div class="defense-group">
      <div class="defense-parent">
        <span class="summary-label">${iconMarkup(iconKey)}${label}</span>
        <strong>${value}</strong>
      </div>
      <div class="defense-sublist">
        ${items.map(([itemLabel, itemValue, itemIconKey = summaryIconKeys[itemLabel]]) => `
          <div class="defense-subrow">
            <span class="summary-label">${iconMarkup(itemIconKey)}${itemLabel}</span>
            <strong>${itemValue}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function moraleEffectsSection(summary) {
  return `
    <section class="morale-effects">
      <div class="morale-main">
        <span class="summary-label">${iconMarkup(summaryIconKeys.Morale)}Morale</span>
        <strong>${summary.morale}</strong>
      </div>
      <div class="morale-effects-list">
        ${moraleEffectRow("Army Limit Bonus", summary.armyLimitBonus)}
        ${moraleEffectRow("Command Effect", `${summary.commandEffect}s`)}
        ${moraleEffectRow("Unit Attack Speed", formatUnitAttackSpeed(summary.unitAttackSpeed))}
      </div>
    </section>
  `;
}

function moraleEffectRow(label, value) {
  return `
    <div class="morale-effect-row">
      <span>${label}</span>
      <strong>${value}</strong>
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

function iconMarkup(iconKey) {
  const icon = statIcons[iconKey];
  if (!icon) return "";
  return `<img class="stat-icon" src="${icon.src}" alt="" aria-hidden="true" />`;
}

function savedBuildRow(savedBuild) {
  const race = races.find((entry) => entry.id === savedBuild.raceId);
  const heroClass = heroClasses.find((entry) => entry.id === savedBuild.classId);
  const active = activeSavedBuildId === savedBuild.id ? "is-active" : "";
  const buildStatus = savedBuild.imported ? "Imported" : "Saved";

  return `
    <div class="saved-row ${active}">
      <img src="${getUpscaledPortraitSrc(savedBuild.portraitId)}" alt="${escapeHtml(savedBuild.name)} portrait" />
      <div>
        <strong>${escapeHtml(savedBuild.name)}</strong>
        <span>${escapeHtml(buildStatus)} / ${escapeHtml(race?.displayName ?? savedBuild.raceId)} ${escapeHtml(heroClass?.displayName ?? savedBuild.classId)} / L${savedBuild.level}</span>
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
  return `<div class="messages">${items.map((item) => `<p>${item}</p>`).join("")}</div>`;
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
  const seconds = Math.max(0, Number(milliseconds) || 0) / 1000;
  return seconds.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function formatSeconds(milliseconds) {
  const seconds = Math.max(0, Number(milliseconds) || 0) / 1000;
  return seconds.toFixed(1).replace(/\.0$/, "");
}

function formatMerchant(value) {
  const sign = value.discountPercent > 0 ? "+" : "";
  return `${value.score} (${sign}${value.discountPercent.toFixed(1)}%)`;
}

function loadSavedBuilds() {
  const imported = importedHeroBuilds.map(cloneSavedBuild);
  let stored = [];

  try {
    stored = JSON.parse(window.localStorage.getItem(savedBuildStorageKey) ?? "[]");
  } catch {
    stored = [];
  }

  const merged = new Map();
  const importedIds = new Set(imported.map((savedBuild) => savedBuild.id));
  for (const savedBuild of stored.map(cloneSavedBuild)) {
    if (savedBuild.imported && !importedIds.has(savedBuild.id)) continue;
    if (!savedBuild.imported) merged.set(savedBuild.id, savedBuild);
  }
  for (const savedBuild of imported) merged.set(savedBuild.id, savedBuild);
  const result = Array.from(merged.values());
  persistSavedBuilds(result);
  return result;
}

function mergeImportedHeroBuilds(builds, metadata) {
  const imported = Array.isArray(builds) ? builds.map(cloneSavedBuild) : [];
  const localSaved = savedBuilds.filter((savedBuild) => !savedBuild.imported);
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
    raceId: build.raceId,
    classId: build.classId,
    level: build.level,
    portraitId: build.portraitId,
    statAllocation: build.statAllocation,
    skillAllocation: build.skillAllocation,
    imported: false,
    origin: "Planner",
  });

  savedBuilds = [savedBuild, ...savedBuilds];
  activeSavedBuildId = savedBuild.id;
  persistSavedBuilds(savedBuilds);
  render();
}

function loadSavedBuild(id) {
  const savedBuild = savedBuilds.find((entry) => entry.id === id);
  if (!savedBuild) return;

  build = {
    name: savedBuild.name,
    raceId: savedBuild.raceId,
    classId: savedBuild.classId,
    level: savedBuild.level,
    portraitId: savedBuild.portraitId ?? getDefaultPortraitId(savedBuild.raceId),
    statAllocation: normalizeStatAllocation(savedBuild.statAllocation),
    skillAllocation: normalizeSkillAllocation(savedBuild.skillAllocation),
  };
  activeSavedBuildId = savedBuild.id;
  trimAllocations();
  render();
}

function persistSavedBuilds(value) {
  try {
    window.localStorage.setItem(savedBuildStorageKey, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in some embedded browser modes.
  }
}

function cloneSavedBuild(value) {
  return {
    id: String(value.id),
    name: String(value.name || "Unnamed Build"),
    raceId: String(value.raceId),
    classId: String(value.classId),
    level: clampLevel(value.level),
    portraitId: Number.isFinite(Number(value.portraitId)) ? Number(value.portraitId) : getDefaultPortraitId(value.raceId),
    statAllocation: normalizeStatAllocation(value.statAllocation),
    skillAllocation: normalizeSkillAllocation(value.skillAllocation),
    imported: Boolean(value.imported),
    origin: value.origin ? String(value.origin) : legacySavedBuildOrigin(value),
    originalHero: value.originalHero,
  };
}

function getCurrentBuildName() {
  const name = String(build.name ?? "").trim();
  if (name) return name;
  const race = races.find((entry) => entry.id === build.raceId);
  const heroClass = heroClasses.find((entry) => entry.id === build.classId);
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

render();
loadLocalPathStatus();
loadLocalHeroBuilds();

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
