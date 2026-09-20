import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real Next.js guarantees a stable useRouter()/useSearchParams() reference
// across a component's re-renders. A mock that returns a NEW object every
// call breaks that guarantee - OnboardingWizard's data-fetch useEffect
// depends on `router`, so an unstable mock reference makes the effect
// re-run (and re-fetch, re-setState) on every single render, including
// every keystroke. That's a real, slow-growing render loop, not a test
// artifact: it reliably exhausted a 4GB heap in ~2 minutes during
// development of this suite. Memoizing here restores the real contract.
const router = { replace: vi.fn(), push: vi.fn() };
const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));

vi.mock("../../components/UserNav", () => ({
  useDashboardPlan: () => ({ plan: "free", userId: "test-user-id" }),
}));

import { OnboardingWizard } from "../../components/OnboardingWizard";

function mockProfileFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/profile/onboarding" && init?.method === "PATCH") {
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }
    if (url === "/api/profile/onboarding") {
      return new Response(
        JSON.stringify({
          data: {
            full_name: "",
            email: "",
            phone: "",
            country_current: "",
            countries_target: [],
            work_authorisation_category: "unsure",
            work_right_details: "",
            linkedin_url: "",
            github_url: "",
            portfolio_url: "",
            base_cv_text: "",
            photo_url: null,
            beta_terms_accepted_at: null,
            onboarding_step: 0,
            onboarding_complete: false,
            ...overrides,
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("OnboardingWizard - step 0 (basic information + beta terms)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockProfileFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks continuing without accepting the beta terms, even with otherwise valid fields", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/phone/i), "+44 7700 900000");
    await user.type(screen.getByLabelText(/current location/i), "London");
    await user.type(screen.getByLabelText(/target countries/i), "Germany, Ireland");

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByText(/you must accept the beta terms to continue/i),
    ).toBeInTheDocument();
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the beta-terms error the moment the checkbox is checked", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/phone/i), "+44 7700 900000");
    await user.type(screen.getByLabelText(/current location/i), "London");
    await user.type(screen.getByLabelText(/target countries/i), "Germany");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByText(/you must accept the beta terms to continue/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));

    expect(
      screen.queryByText(/you must accept the beta terms to continue/i),
    ).not.toBeInTheDocument();
  });

  it("does not render the beta-terms checkbox at all once already accepted server-side", async () => {
    vi.stubGlobal(
      "fetch",
      mockProfileFetch({ beta_terms_accepted_at: "2026-09-20T00:00:00.000Z" }),
    );
    render(<OnboardingWizard />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("rejects an invalid full name (digits) and does not advance", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));

    await user.type(screen.getByLabelText(/full name/i), "12345");
    await user.type(screen.getByLabelText(/phone/i), "+44 7700 900000");
    await user.type(screen.getByLabelText(/current location/i), "London");
    await user.type(screen.getByLabelText(/target countries/i), "Germany");
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByText(/enter a valid full name using letters/i),
    ).toBeInTheDocument();
    // Still on step 0: the work-authorisation step's heading must not appear.
    expect(
      screen.queryByText(/right-to-work position/i),
    ).not.toBeInTheDocument();
  });

  it("advances to step 1 once every step-0 field, including beta terms, is valid", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/phone/i), "+44 7700 900000");
    await user.type(screen.getByLabelText(/current location/i), "London");
    await user.type(screen.getByLabelText(/target countries/i), "Germany, Ireland");
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(screen.getByText(/right-to-work position/i)).toBeInTheDocument(),
    );
  });
});
