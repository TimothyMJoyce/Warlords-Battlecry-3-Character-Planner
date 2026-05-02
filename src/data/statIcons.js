const iconPath = (name) => `/src/assets/icons/${name}.png`;

const damageIconNote = "Graphics.xcr/DamageIcons.bmp; verified damage icon atlas order";

export const statIcons = {
  piercing: { src: iconPath("piercing"), note: `${damageIconNote}; piercing` },
  slashing: { src: iconPath("slashing"), note: `${damageIconNote}; slashing` },
  crushing: { src: iconPath("crushing"), note: `${damageIconNote}; crushing` },
  cold: { src: iconPath("cold"), note: `${damageIconNote}; cold` },
  electricity: { src: iconPath("electricity"), note: `${damageIconNote}; electricity` },
  fire: { src: iconPath("fire"), note: `${damageIconNote}; fire` },
  magic: { src: iconPath("magic"), note: `${damageIconNote}; magic` },
};

export const summaryIconKeys = {
  Piercing: "piercing",
  Slashing: "slashing",
  Crushing: "crushing",
  Fire: "fire",
  Cold: "cold",
  Electricity: "electricity",
  Magic: "magic",
};
