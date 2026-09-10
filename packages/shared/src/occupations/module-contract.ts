import { z } from "zod";

const governedSourceSchema = z.object({
  jurisdiction: z.string().trim().min(1),
  label: z.string().trim().min(1),
  reviewedAt: z.iso.date(),
  reviewIntervalDays: z.number().int().positive(),
  url: z.url(),
});

export const occupationModuleSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    label: z.string().trim().min(1),
    riskLevel: z.enum(["low", "regulated"]),
    supportedRoles: z.array(z.string().trim().min(1)).min(1),
    exclusions: z.array(z.string().trim().min(1)),
    applicableCountries: z.array(z.string().trim().min(1)).min(1),
    requiredEvidence: z.array(z.string().trim().min(1)).min(1),
    optionalEvidence: z.array(z.string().trim().min(1)),
    mandatoryRequirements: z.array(z.string().trim().min(1)),
    preferredRequirements: z.array(z.string().trim().min(1)),
    protectedTerms: z.array(z.string().trim().min(1)),
    uncertaintyPolicy: z.string().trim().min(1),
    outputConventions: z.array(z.string().trim().min(1)).min(1),
    accessibilityRequirements: z.array(z.string().trim().min(1)).min(1),
    sources: z.array(governedSourceSchema),
    owner: z.string().trim().min(1),
    qualifiedReviewer: z.string().trim().min(1).optional(),
    testPackId: z.string().trim().min(1),
  })
  .superRefine((module, context) => {
    if (module.riskLevel === "regulated" && !module.qualifiedReviewer) {
      context.addIssue({
        code: "custom",
        message: "Regulated occupation modules require a qualified reviewer.",
        path: ["qualifiedReviewer"],
      });
    }
    if (module.riskLevel === "regulated" && module.sources.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Regulated occupation modules require authoritative sources.",
        path: ["sources"],
      });
    }
  });

export type OccupationModule = z.infer<typeof occupationModuleSchema>;

export function validateOccupationModule(value: unknown): OccupationModule {
  return occupationModuleSchema.parse(value);
}

export function getStaleOccupationSources(
  module: OccupationModule,
  asOf: Date,
) {
  return module.sources.filter((source) => {
    const expiresAt = new Date(`${source.reviewedAt}T00:00:00.000Z`);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + source.reviewIntervalDays);
    return expiresAt < asOf;
  });
}
