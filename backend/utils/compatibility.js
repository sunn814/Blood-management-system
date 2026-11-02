// Blood group compatibility (red blood cell donation).
// Key = donor group, value = recipient groups that donor CAN give to.
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CAN_DONATE_TO = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], // universal donor
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"], // universal recipient
};

// Groups a donor of `donorGroup` can give blood to.
const canDonateTo = (donorGroup) => CAN_DONATE_TO[donorGroup] || [];

// Groups whose blood a patient of `recipientGroup` can safely receive.
// Order: exact match first, then the most "specific" donors, and the
// universal donor O- last so it is kept for emergencies.
const compatibleGroupsFor = (recipientGroup) => {
  if (!BLOOD_GROUPS.includes(recipientGroup)) return [];
  return BLOOD_GROUPS.filter((g) => CAN_DONATE_TO[g].includes(recipientGroup)).sort((a, b) => {
    if (a === recipientGroup) return -1;
    if (b === recipientGroup) return 1;
    return CAN_DONATE_TO[a].length - CAN_DONATE_TO[b].length;
  });
};

module.exports = { BLOOD_GROUPS, CAN_DONATE_TO, canDonateTo, compatibleGroupsFor };
