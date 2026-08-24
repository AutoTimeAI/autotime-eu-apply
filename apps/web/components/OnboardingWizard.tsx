"use client";
/** Collects the minimum evidence needed to personalise trustworthy job guidance. */
import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboardPlan } from "./UserNav";

const completeKey = "autotime-v2-onboarding-complete";
/** Records local completion for the current user after server onboarding succeeds. */
export function markOnboardingComplete(userId: string) {
  if (typeof window !== "undefined")
    localStorage.setItem(`${completeKey}:${userId}`, "true");
}
/** Returns whether this browser has completed onboarding for the user. */
export function hasCompletedOnboarding(userId: string) {
  return (
    typeof window === "undefined" ||
    localStorage.getItem(`${completeKey}:${userId}`) === "true"
  );
}
type WorkCategory =
  | "eu_eea_swiss_citizen"
  | "existing_permission"
  | "sponsorship_required"
  | "country_specific"
  | "unsure";
type Values = {
  fullName: string;
  email: string;
  phone: string;
  countryCurrent: string;
  countriesTarget: string;
  workAuthorisationCategory: WorkCategory;
  workRightDetails: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  baseCvText: string;
  photoUrl: string | null;
};
const empty: Values = {
  fullName: "",
  email: "",
  phone: "",
  countryCurrent: "",
  countriesTarget: "",
  workAuthorisationCategory: "unsure",
  workRightDetails: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  baseCvText: "",
  photoUrl: null,
};
const labels = [
  "Basic information",
  "Work authorisation",
  "Professional links",
  "Profile photo",
  "CV",
  "Review and confirm",
];
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,99}$/u;
const placePattern = /^[\p{L}\p{M}][\p{L}\p{M}' .,-]{1,119}$/u;
const phonePattern = /^\+?[0-9][0-9 ()-]{6,24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validWebUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
function validLinkedInProfile(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      (url.hostname === "linkedin.com" ||
        url.hostname.endsWith(".linkedin.com")) &&
      /^\/in\/[^/]+\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}
function findLinkedInProfileUrl(text: string) {
  const joinedWrappedSlugs = text.replace(/-\s*\r?\n\s*/g, "-");
  const match = joinedWrappedSlugs.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-z0-9_-]+\/?/i,
  );
  if (!match) return "";
  const url = match[0].replace(/\/$/, "");
  return url.startsWith("http") ? url : `https://${url}`;
}

function getBuiltCvEvidence(userId: string): string {
  if (typeof window === "undefined") return "";
  try {
    const cv = JSON.parse(
      localStorage.getItem(`autotime-cv-data:${userId}`) || "null",
    );
    if (
      !cv ||
      !(
        cv.contact?.name ||
        cv.summary?.trim() ||
        cv.experience?.length ||
        cv.education?.length ||
        cv.skills?.length
      )
    )
      return "";
    return [
      cv.contact?.name,
      [
        cv.contact?.email,
        cv.contact?.phone,
        cv.contact?.location,
        cv.contact?.linkedin,
      ]
        .filter(Boolean)
        .join(" | "),
      cv.summary,
      ...(cv.experience ?? []).flatMap(
        (item: {
          title?: string;
          company?: string;
          dates?: string;
          bullets?: string[];
        }) => [
          `${item.title ?? ""} — ${item.company ?? ""} (${item.dates ?? ""})`,
          ...(item.bullets ?? []),
        ],
      ),
      ...(cv.education ?? []).map(
        (item: { degree?: string; institution?: string; dates?: string }) =>
          `${item.degree ?? ""} — ${item.institution ?? ""} (${item.dates ?? ""})`,
      ),
      (cv.skills ?? []).join(", "),
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

/** Renders and persists the multi-step founder-beta onboarding journey. */
export function OnboardingWizard() {
  const router = useRouter(),
    params = useSearchParams(),
    { userId } = useDashboardPlan();
  const edit = params.get("edit");
  const gatewayRequired = params.get("required") === "1";
  const requested =
    edit === "basic"
      ? 0
      : edit === "work-authorisation"
        ? 1
        : edit === "urls"
          ? 2
          : edit === "photo"
            ? 3
            : edit === "cv"
              ? 4
              : null;
  const editing = requested !== null;
  const [validationError, setValidationError] = useState("");
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [uploadedCvName, setUploadedCvName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fieldError = (field: string) =>
    invalidFields.includes(field)
      ? (
          {
            fullName:
              "Enter a valid full name using letters, spaces, apostrophes or hyphens.",
            phone: "Enter a valid phone number with 7–25 digits/characters.",
            email: "Enter a valid email address.",
            countryCurrent: "Enter a valid city or country name.",
            countriesTarget: "Add valid country names separated by commas.",
            workRightDetails:
              "Enter 10–2,000 characters describing verified facts.",
            linkedinUrl:
              "Add your LinkedIn profile URL, for example https://www.linkedin.com/in/your-name.",
            githubUrl: "Enter a complete http:// or https:// GitHub URL.",
            portfolioUrl: "Enter a complete http:// or https:// portfolio URL.",
            baseCvText: "Add CV evidence containing at least 50 characters.",
          } as Record<string, string>
        )[field]
      : "";
  const [step, setStep] = useState(requested ?? 0),
    [values, setValues] = useState(empty),
    [status, setStatus] = useState("Loading your setup…");
  const countries = values.countriesTarget
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  useEffect(() => {
    void fetch("/api/profile/onboarding")
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok) {
          setStatus(payload.error);
          return;
        }
        const data = payload.data;
        if (data)
          setValues({
            fullName: data.full_name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            countryCurrent: data.country_current ?? data.current_country ?? "",
            countriesTarget:
              (data.countries_target ?? []).join(", ") ||
              (data.target_countries ?? ""),
            workAuthorisationCategory:
              data.work_authorisation_category ?? "unsure",
            workRightDetails: data.work_right_details ?? "",
            linkedinUrl: data.linkedin_url ?? "",
            githubUrl: data.github_url ?? "",
            portfolioUrl: data.portfolio_url ?? "",
            baseCvText: data.base_cv_text?.trim() || getBuiltCvEvidence(userId),
            photoUrl: data.photoUrl ?? null,
          });
        if (requested === null && data?.onboarding_ready) {
          router.replace("/dashboard/profile");
          return;
        }
        if (requested === null) {
          const missing = data?.onboarding_missing ?? [];
          const requiredStep = missing.some((field: string) =>
            ["fullName", "phone", "countryCurrent", "countriesTarget"].includes(
              field,
            ),
          )
            ? 0
            : missing.includes("workRightDetails")
              ? 1
              : missing.includes("linkedinUrl")
                ? 2
                : missing.includes("baseCvText")
                  ? 4
                  : Math.min(data?.onboarding_step ?? 0, 5);
          setStep(
            gatewayRequired
              ? requiredStep
              : Math.min(data?.onboarding_step ?? 0, 5),
          );
        }
        setStatus("");
      });
  }, [gatewayRequired, requested, router, userId]);
  const save = async (nextStep: number, complete = false) => {
    const cvLinkedIn = findLinkedInProfileUrl(values.baseCvText);
    const linkedinUrl = validLinkedInProfile(values.linkedinUrl)
      ? values.linkedinUrl
      : cvLinkedIn || values.linkedinUrl;
    if (linkedinUrl !== values.linkedinUrl)
      setValues((current) => ({ ...current, linkedinUrl }));
    setStatus("Saving…");
    const response = await fetch("/api/profile/onboarding", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...values,
        linkedinUrl,
        countriesTarget: countries,
        onboardingStep: nextStep,
        complete,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      if (payload.fields?.includes("linkedinUrl")) {
        setInvalidFields((fields) =>
          Array.from(new Set([...fields, "linkedinUrl"])),
        );
        setValidationError(
          "Add a valid LinkedIn profile URL to complete setup.",
        );
        if (complete && !editing) setStep(2);
      }
      setStatus(payload.error || "Could not save your profile.");
      return false;
    }
    setStatus("");
    return true;
  };
  const next = async () => {
    setValidationError("");
    setInvalidFields([]);
    let invalid: string[] = [];
    if (step === 0) {
      invalid = [
        !namePattern.test(values.fullName.trim()) ? "fullName" : "",
        !phonePattern.test(values.phone.trim()) ? "phone" : "",
        values.email.trim() && !emailPattern.test(values.email.trim())
          ? "email"
          : "",
        !placePattern.test(values.countryCurrent.trim())
          ? "countryCurrent"
          : "",
        !countries.length ||
        countries.some((country) => !placePattern.test(country))
          ? "countriesTarget"
          : "",
      ].filter(Boolean);
    }
    if (
      step === 1 &&
      (values.workRightDetails.trim().length < 10 ||
        values.workRightDetails.trim().length > 2000)
    )
      invalid = ["workRightDetails"];
    if (step === 2) {
      invalid = [
        !validLinkedInProfile(values.linkedinUrl) ? "linkedinUrl" : "",
        !validWebUrl(values.githubUrl) ? "githubUrl" : "",
        !validWebUrl(values.portfolioUrl) ? "portfolioUrl" : "",
      ].filter(Boolean);
    }
    if (step === 4 && values.baseCvText.trim().length < 50)
      invalid = ["baseCvText"];
    if (invalid.length) {
      setInvalidFields(invalid);
      setValidationError("Correct the highlighted fields before continuing.");
      return;
    }
    if (await save(Math.min(step + 1, 5))) {
      if (editing) router.replace("/dashboard/profile");
      else setStep((current) => Math.min(current + 1, 5));
    }
  };
  const upload = async (
    event: ChangeEvent<HTMLInputElement>,
    kind: "photo" | "cv",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (kind === "cv") setUploadedCvName("");
    setIsUploading(true);
    setValidationError("");
    setStatus(kind === "photo" ? "Uploading photo…" : "Reading CV…");
    try {
      const body = new FormData();
      body.set("file", file);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 45000);
      let response: Response;
      try {
        response = await fetch(
          kind === "photo" ? "/api/profile/photo" : "/api/profile/import-cv",
          { method: "POST", body, signal: controller.signal },
        );
      } finally {
        window.clearTimeout(timer);
      }
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error);
        event.target.value = "";
        return;
      }
      setValues((current) => {
        if (kind === "photo")
          return { ...current, photoUrl: payload.data.photoUrl };
        const extractedLinkedIn = findLinkedInProfileUrl(payload.data.text);
        return {
          ...current,
          baseCvText: payload.data.text,
          linkedinUrl: validLinkedInProfile(current.linkedinUrl)
            ? current.linkedinUrl
            : extractedLinkedIn || current.linkedinUrl,
        };
      });
      if (kind === "cv") {
        setUploadedCvName(file.name);
        setInvalidFields((fields) =>
          fields.filter(
            (field) => field !== "baseCvText" && field !== "linkedinUrl",
          ),
        );
      }
      setStatus(
        kind === "photo"
          ? "Photo uploaded privately."
          : "CV extracted and ready. Review the text or continue.",
      );
    } catch (error) {
      setStatus(
        error instanceof DOMException && error.name === "AbortError"
          ? "CV processing took too long. Try a smaller file or DOCX."
          : "Could not process this file. Please try again.",
      );
      event.target.value = "";
    } finally {
      setIsUploading(false);
    }
  };
  const reviewWorkAuth = async () => {
    setStatus("Checking wording…");
    const response = await fetch("/api/ai/work-authorisation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: values.workAuthorisationCategory,
        statement: values.workRightDetails,
        targetCountries: countries,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error);
      return;
    }
    setValues((current) => ({
      ...current,
      workRightDetails: payload.data.correctedStatement,
    }));
    setStatus(
      [payload.data.caution, ...payload.data.missingFacts]
        .filter(Boolean)
        .join(" "),
    );
  };
  const finish = async () => {
    setValidationError("");
    setInvalidFields([]);
    if (await save(6, true)) {
      markOnboardingComplete(userId);
      window.location.assign("/dashboard/profile");
    }
  };
  return (
    <main className="onboarding-wizard-shell">
      <div
        className="onboarding-wizard-progress"
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={1}
        aria-valuemax={6}
        aria-valuenow={step + 1}
        aria-valuetext={`Step ${step + 1} of 6: ${labels[step]}`}
      >
        <span style={{ width: `${((step + 1) / 6) * 100}%` }} />
      </div>
      <p className="eyebrow" aria-live="polite">
        Step {step + 1} of 6 · {labels[step]}
      </p>
      <section className="onboarding-step" aria-labelledby="onboarding-title">
        {step === 0 ? (
          <>
            <h1 id="onboarding-title">Basic information</h1>
            <p>
              Tell us where you are now and which markets you are targeting.
            </p>
            {(
              [
                ["fullName", "Full name", "text", "name", 100],
                ["phone", "Phone *", "tel", "tel", 25],
                ["email", "Contact email (optional)", "email", "email", 254],
                [
                  "countryCurrent",
                  "Current location",
                  "text",
                  "address-level2",
                  120,
                ],
                [
                  "countriesTarget",
                  "Target countries (comma separated)",
                  "text",
                  "country-name",
                  500,
                ],
              ] as const
            ).map(([field, label, type, autoComplete, maxLength]) => (
              <label key={field}>
                {label}
                <input
                  type={type}
                  autoComplete={autoComplete}
                  maxLength={maxLength}
                  required={
                    field === "fullName" ||
                    field === "phone" ||
                    field === "countryCurrent" ||
                    field === "countriesTarget"
                  }
                  aria-invalid={invalidFields.includes(field)}
                  value={values[field]}
                  onChange={(e) => {
                    setValues({ ...values, [field]: e.target.value });
                    setInvalidFields((fields) =>
                      fields.filter((item) => item !== field),
                    );
                  }}
                />
                {fieldError(field) ? (
                  <span className="onboarding-field-error">
                    {fieldError(field)}
                  </span>
                ) : null}
              </label>
            ))}
          </>
        ) : null}
        {step === 1 ? (
          <>
            <h1 className="onboarding-work-right-title" id="onboarding-title">
              What is your current right-to-work position for your target
              countries?
            </h1>
            <p>
              Select the closest factual position. Requirements vary by country;
              AutoTime does not infer status or provide immigration advice.
            </p>
            <label>
              Current position
              <select
                value={values.workAuthorisationCategory}
                onChange={(e) =>
                  setValues({
                    ...values,
                    workAuthorisationCategory: e.target.value as WorkCategory,
                  })
                }
              >
                <option value="eu_eea_swiss_citizen">
                  I am an EU/EEA/Swiss citizen
                </option>
                <option value="existing_permission">
                  I already have permission to work in at least one target
                  country
                </option>
                <option value="sponsorship_required">
                  I will require employer sponsorship
                </option>
                <option value="country_specific">
                  My position differs by target country
                </option>
                <option value="unsure">I am unsure and need to verify</option>
              </select>
            </label>
            <label>
              Explain only facts you have verified
              <textarea
                rows={6}
                minLength={10}
                maxLength={2000}
                aria-invalid={invalidFields.includes("workRightDetails")}
                value={values.workRightDetails}
                onChange={(e) => {
                  setValues({ ...values, workRightDetails: e.target.value });
                  setInvalidFields((fields) =>
                    fields.filter((field) => field !== "workRightDetails"),
                  );
                }}
                placeholder="Example: I hold permission to work in Ireland until [date]. I would require sponsorship for Germany."
              />
              {fieldError("workRightDetails") ? (
                <span className="onboarding-field-error">
                  {fieldError("workRightDetails")}
                </span>
              ) : null}
            </label>
            <button
              type="button"
              className="button-secondary"
              disabled={values.workRightDetails.trim().length < 10}
              onClick={reviewWorkAuth}
            >
              AI: check clarity and missing facts
            </button>
            <p className="onboarding-legal-note">
              AI can improve wording and identify questions. It cannot determine
              legal status; verify official sources or seek qualified advice.
            </p>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h1 id="onboarding-title">Professional links</h1>
            <p>
              Your LinkedIn profile is required. GitHub and portfolio links are
              optional. Use complete http:// or https:// addresses.
            </p>
            {(
              [
                ["linkedinUrl", "LinkedIn profile URL *"],
                ["githubUrl", "GitHub URL (optional)"],
                ["portfolioUrl", "Portfolio URL (optional)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="url"
                  inputMode="url"
                  required={key === "linkedinUrl"}
                  maxLength={500}
                  placeholder={
                    key === "linkedinUrl"
                      ? "https://www.linkedin.com/in/your-name"
                      : ""
                  }
                  aria-invalid={invalidFields.includes(key)}
                  value={values[key]}
                  onChange={(e) => {
                    setValues({ ...values, [key]: e.target.value });
                    setInvalidFields((fields) =>
                      fields.filter((field) => field !== key),
                    );
                  }}
                />
                {fieldError(key) ? (
                  <span className="onboarding-field-error">
                    {fieldError(key)}
                  </span>
                ) : null}
              </label>
            ))}
          </>
        ) : null}
        {step === 3 ? (
          <>
            <h1 id="onboarding-title">Profile photo</h1>
            <p>
              Optional. Photos are stored privately and scoped to your account.
            </p>
            {values.photoUrl ? (
              <img
                alt="Profile preview"
                className="profile-onboarding-photo"
                src={values.photoUrl}
              />
            ) : (
              <p>No photo uploaded.</p>
            )}
            <label>
              Choose photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => upload(e, "photo")}
              />
            </label>
          </>
        ) : null}
        {step === 4 ? (
          <>
            <h1 id="onboarding-title">Add your CV</h1>
            <p className="onboarding-required-note">
              <strong>Required.</strong> Upload a DOCX or text-based PDF, paste
              CV evidence, or build a new CV before continuing.
            </p>
            <label>
              Upload CV (DOCX or PDF)
              <input
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => upload(e, "cv")}
              />
              <span className="cv-field-hint">
                Maximum 5 MB. Scanned image-only PDFs are not supported.
              </span>
            </label>
            {uploadedCvName ? (
              <div className="onboarding-cv-ready" role="status">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>CV ready</strong>
                  <p>
                    {uploadedCvName} ·{" "}
                    {values.baseCvText.length.toLocaleString()} characters
                    extracted
                  </p>
                </div>
              </div>
            ) : values.baseCvText.trim().length >= 50 ? (
              <div className="onboarding-cv-ready" role="status">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>CV evidence ready</strong>
                  <p>
                    Saved CV content is available. You can review it or
                    continue.
                  </p>
                </div>
              </div>
            ) : null}
            <label>
              CV evidence
              <textarea
                rows={12}
                minLength={50}
                maxLength={100000}
                aria-invalid={invalidFields.includes("baseCvText")}
                value={values.baseCvText}
                onChange={(e) => {
                  setValues({ ...values, baseCvText: e.target.value });
                  setInvalidFields((fields) =>
                    fields.filter((field) => field !== "baseCvText"),
                  );
                }}
              />
              {fieldError("baseCvText") ? (
                <span className="onboarding-field-error">
                  {fieldError("baseCvText")}
                </span>
              ) : null}
            </label>
            <Link
              className="button-secondary"
              href="/dashboard/cv-tailor?returnTo=%2Fdashboard%2Fonboarding%3Fedit%3Dcv"
            >
              Build one now
            </Link>
          </>
        ) : null}
        {step === 5 ? (
          <>
            <h1 id="onboarding-title">Review and confirm</h1>
            <dl className="onboarding-review-list">
              <div>
                <dt>Name</dt>
                <dd>{values.fullName || "Missing"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>
                  {values.email || "No email"} · {values.phone || "No phone"}
                </dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{values.countryCurrent || "Missing"}</dd>
              </div>
              <div>
                <dt>Target countries</dt>
                <dd>{countries.join(", ") || "Missing"}</dd>
              </div>
              <div>
                <dt>Work authorisation</dt>
                <dd>{values.workRightDetails || "Missing"}</dd>
              </div>
              <div>
                <dt>Professional links</dt>
                <dd>
                  {[values.linkedinUrl, values.githubUrl, values.portfolioUrl]
                    .filter(Boolean)
                    .join(" · ") || "None added"}
                </dd>
              </div>
              <div>
                <dt>Photo</dt>
                <dd>{values.photoUrl ? "Added" : "Skipped"}</dd>
              </div>
              <div>
                <dt>CV</dt>
                <dd
                  className={
                    values.baseCvText ? "review-confirmed" : "review-missing"
                  }
                >
                  {values.baseCvText
                    ? `Ready · ${values.baseCvText.length} characters`
                    : "Missing — return to Step 5"}
                </dd>
              </div>
            </dl>
          </>
        ) : null}
        {validationError && step !== 0 ? (
          <p className="onboarding-validation-alert" role="alert">
            {validationError}
          </p>
        ) : null}
        <p role="status">{status}</p>
        <div className="onboarding-actions">
          {step === 5 ? (
            <button type="button" disabled={isUploading} onClick={finish}>
              Complete setup
            </button>
          ) : (
            <button type="button" disabled={isUploading} onClick={next}>
              {isUploading
                ? "Processing…"
                : editing
                  ? "Save changes"
                  : step === 3
                    ? "Continue or skip"
                    : "Continue"}
            </button>
          )}
          {!editing && step > 0 ? (
            <button
              type="button"
              className="secondary-button"
              disabled={isUploading}
              onClick={() => {
                setValidationError("");
                setInvalidFields([]);
                setStep((current) => current - 1);
              }}
            >
              Back
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
