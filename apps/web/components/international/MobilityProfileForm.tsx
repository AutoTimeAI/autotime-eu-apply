import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { MobilityProfile } from "shared";
import { allCountries, positionLabels } from "./model";

export function MobilityProfileForm({
  completeness,
  profile,
  status,
  onProfileChange,
  onSubmit,
}: {
  completeness: number;
  profile: MobilityProfile;
  status: string;
  onProfileChange: Dispatch<SetStateAction<MobilityProfile>>;
  onSubmit: () => void;
}) {
  const update = (change: Partial<MobilityProfile>) =>
    onProfileChange((current) => ({ ...current, ...change }));
  const toggleCountry = (country: string) =>
    onProfileChange((current) => ({
      ...current,
      targetCountries: current.targetCountries.includes(country)
        ? current.targetCountries.filter((item) => item !== country)
        : [...current.targetCountries, country],
    }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="international-content mobility-form" onSubmit={submit}>
      <section className="international-heading">
        <div>
          <p className="eyebrow">Sensitive profile information</p>
          <h2>My mobility</h2>
          <p>
            Keep time-sensitive work-permission facts separate from permanent
            career evidence. “Unsure” is a valid answer.
          </p>
        </div>
        <strong>{completeness}% complete</strong>
      </section>
      <fieldset>
        <legend>Your position</legend>
        <div className="form-grid">
          <label>
            Current country
            <input
              value={profile.currentCountry}
              onChange={(event) =>
                update({ currentCountry: event.target.value })
              }
            />
          </label>
          <label>
            Applicant position
            <select
              aria-label="Applicant position"
              value={profile.applicantPosition}
              onChange={(event) =>
                update({
                  applicantPosition: event.target
                    .value as MobilityProfile["applicantPosition"],
                })
              }
            >
              {Object.entries(positionLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sponsorship required
            <select
              aria-label="Sponsorship required"
              value={profile.sponsorshipRequired}
              onChange={(event) =>
                update({
                  sponsorshipRequired: event.target
                    .value as MobilityProfile["sponsorshipRequired"],
                })
              }
            >
              <option value="unsure">Unsure</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            Current permission type
            <input
              value={profile.currentPermissionType ?? ""}
              onChange={(event) =>
                update({
                  currentPermissionType: event.target.value || undefined,
                })
              }
            />
          </label>
          <label>
            Permission expiry date
            <input
              type="date"
              value={profile.permissionExpiryDate ?? ""}
              onChange={(event) =>
                update({
                  permissionExpiryDate: event.target.value || undefined,
                })
              }
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Targets and timing</legend>
        <div className="country-checkboxes">
          {allCountries.map((country) => (
            <label key={country}>
              <input
                checked={profile.targetCountries.includes(country)}
                type="checkbox"
                onChange={() => toggleCountry(country)}
              />
              {country}
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>
            Relocation preference
            <select
              value={profile.relocationPreference}
              onChange={(event) =>
                update({
                  relocationPreference: event.target
                    .value as MobilityProfile["relocationPreference"],
                })
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="depends">Depends</option>
            </select>
          </label>
          <label>
            Earliest start date
            <input
              type="date"
              value={profile.earliestStartDate ?? ""}
              onChange={(event) =>
                update({ earliestStartDate: event.target.value || undefined })
              }
            />
          </label>
          <label>
            Notice period
            <input
              value={profile.noticePeriod ?? ""}
              onChange={(event) =>
                update({ noticePeriod: event.target.value || undefined })
              }
            />
          </label>
          <label>
            Relocation constraints
            <textarea
              rows={3}
              value={profile.relocationConstraints ?? ""}
              onChange={(event) =>
                update({
                  relocationConstraints: event.target.value || undefined,
                })
              }
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Additional facts</legend>
        <label>
          Notes
          <textarea
            rows={4}
            value={profile.notes ?? ""}
            onChange={(event) =>
              update({ notes: event.target.value || undefined })
            }
          />
        </label>
      </fieldset>
      <div className="mobility-actions">
        <button type="submit">Save verified mobility profile</button>
        {status ? <p role="status">{status}</p> : null}
      </div>
    </form>
  );
}
