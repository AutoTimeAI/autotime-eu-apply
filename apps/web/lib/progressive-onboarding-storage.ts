import { z } from "zod";

const onboardingSchema = z.object({
  schemaVersion: z.literal(1),
  userId: z.string().min(1),
  currentStep: z.enum(["career", "target", "direction", "complete"]),
  evidencePath: z.enum(["cv", "role", "education_project"]).nullable(),
  targetCountries: z.string(),
  workAuthorisation: z.string(),
  direction: z.enum(["pathways", "job_analysis"]).nullable(),
  updatedAt: z.string(),
});

export type ProgressiveOnboardingState = z.infer<typeof onboardingSchema>;
type OnboardingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const prefix = "autotime-progressive-onboarding:v1";

function requireUserId(userId: string) {
  const value = userId.trim();
  if (!value) throw new Error("An authenticated user ID is required.");
  return value;
}

export function getProgressiveOnboardingStorageKey(userId: string) {
  return `${prefix}:${requireUserId(userId)}`;
}

export function createProgressiveOnboardingState(
  userId: string,
): ProgressiveOnboardingState {
  return {
    schemaVersion: 1,
    userId: requireUserId(userId),
    currentStep: "career",
    evidencePath: null,
    targetCountries: "",
    workAuthorisation: "",
    direction: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadProgressiveOnboarding(
  storage: OnboardingStorage,
  authenticatedUserId: string,
) {
  const userId = requireUserId(authenticatedUserId);
  try {
    const parsed = onboardingSchema.safeParse(
      JSON.parse(
        storage.getItem(getProgressiveOnboardingStorageKey(userId)) ?? "null",
      ),
    );
    return parsed.success && parsed.data.userId === userId
      ? parsed.data
      : createProgressiveOnboardingState(userId);
  } catch {
    return createProgressiveOnboardingState(userId);
  }
}

export function saveProgressiveOnboarding(
  storage: OnboardingStorage,
  authenticatedUserId: string,
  value: ProgressiveOnboardingState,
) {
  const userId = requireUserId(authenticatedUserId);
  const parsed = onboardingSchema.parse({
    ...value,
    userId,
    updatedAt: new Date().toISOString(),
  });
  storage.setItem(
    getProgressiveOnboardingStorageKey(userId),
    JSON.stringify(parsed),
  );
  return parsed;
}
