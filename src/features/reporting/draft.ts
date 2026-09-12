import type { Attachment, Category, Location } from "@/contracts";

export const emptyDraft = {
  draftId: "",
  step: 1,
  description: "",
  accessibility: "",
  latitude: 44.6488,
  longitude: -63.5752,
  locationLabel: "",
  locationConfirmed: false,
  sensitive: false,
  title: "",
  summary: "",
  category: "other" as Category,
  preparationId: "",
  relatedIssueId: "",
  reviewEdited: false,
  appliedPreparationId: "",
  attachments: [] as Attachment[],
};

/** Same stable 100 m public grid used by the persisted report projection. */
export function preparationLocation(
  location: Location,
  sensitive: boolean,
): Location {
  if (!sensitive) return location;
  const metersLatitude = 111_320;
  const latitude =
    (Math.round((location.latitude * metersLatitude) / 100) * 100) /
    metersLatitude;
  const metersLongitude =
    111_320 * Math.max(0.01, Math.cos((latitude * Math.PI) / 180));
  return {
    latitude,
    longitude:
      (Math.round((location.longitude * metersLongitude) / 100) * 100) /
      metersLongitude,
  };
}
