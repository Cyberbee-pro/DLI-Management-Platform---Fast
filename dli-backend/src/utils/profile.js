const PROFILE_VECTOR_CONFIG = {
  avatarUrl: "Avatar",
  resumeUrl: "Resume",
  linkedinUrl: "LinkedIn",
  instagramUrl: "Instagram",
  websiteUrl: "Website",
};

function isProfileFieldMissing(user, field) {
  const value = user?.[field];

  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
}

function getMissingProfileVectors(
  user,
  fields = Object.keys(PROFILE_VECTOR_CONFIG),
) {
  return fields.filter(
    (field) =>
      PROFILE_VECTOR_CONFIG[field] &&
      isProfileFieldMissing(user, field),
  );
}

module.exports = {
  PROFILE_VECTOR_CONFIG,
  getMissingProfileVectors,
  isProfileFieldMissing,
};
