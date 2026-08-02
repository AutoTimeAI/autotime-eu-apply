import { laneSelectionSchema, type LaneSelection } from "shared";
type PathwayStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const prefix = "autotime-role-pathways:v1";
function requireUserId(userId: string) {
  const value = userId.trim();
  if (!value)
    throw new Error("An authenticated user ID is required for Role Pathways.");
  return value;
}
export function getRolePathwaysStorageKey(userId: string) {
  return `${prefix}:${requireUserId(userId)}`;
}
export function saveLaneSelection(
  storage: PathwayStorage,
  authenticatedUserId: string,
  input: LaneSelection,
) {
  const userId = requireUserId(authenticatedUserId);
  const value = laneSelectionSchema.parse(input);
  if (value.userId !== userId)
    throw new Error("Cross-user Role Pathways storage is not allowed.");
  storage.setItem(getRolePathwaysStorageKey(userId), JSON.stringify(value));
  return value;
}
export function loadLaneSelection(
  storage: PathwayStorage,
  authenticatedUserId: string,
): LaneSelection | null {
  const userId = requireUserId(authenticatedUserId);
  try {
    const value = laneSelectionSchema.safeParse(
      JSON.parse(storage.getItem(getRolePathwaysStorageKey(userId)) ?? "null"),
    );
    return value.success && value.data.userId === userId ? value.data : null;
  } catch {
    return null;
  }
}
