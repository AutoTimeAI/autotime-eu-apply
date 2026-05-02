import type { Ref } from "react"
import type { OpenAISettings } from "../lib/storage"
import { getStatusClassName } from "./utils"

type AISettingsSectionProps = {
  settings: OpenAISettings
  status: string
  statusRef: Ref<HTMLParagraphElement>
  onClear: () => void
  onFieldChange: <K extends keyof OpenAISettings>(
    key: K,
    value: OpenAISettings[K]
  ) => void
  onSave: () => void
}

export function AISettingsSection({
  settings,
  status,
  statusRef,
  onClear,
  onFieldChange,
  onSave
}: AISettingsSectionProps) {
  return (
    <section className="panel-section">
      <h2>AI Settings</h2>

      <div className="form-grid">
        <label>
          OpenAI API key
          <input
            type="password"
            value={settings.apiKey}
            onChange={(event) => onFieldChange("apiKey", event.target.value)}
          />
        </label>

        <label>
          Model
          <select
            value={settings.model}
            onChange={(event) => onFieldChange("model", event.target.value)}
          >
            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
            <option value="gpt-4.1-nano">gpt-4.1-nano</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
        </label>

        <label>
          Monthly budget USD
          <input
            min="0"
            step="0.01"
            type="number"
            value={settings.monthlyBudgetUsd}
            onChange={(event) =>
              onFieldChange(
                "monthlyBudgetUsd",
                Number.parseFloat(event.target.value) || 0
              )
            }
          />
        </label>

        <button type="button" onClick={onSave}>
          Save AI Settings
        </button>

        <button className="danger-button" type="button" onClick={onClear}>
          Clear AI Settings
        </button>

        {status && (
          <p
            className={getStatusClassName(status)}
            ref={statusRef}
            role="status"
            tabIndex={-1}
          >
            {status}
          </p>
        )}
      </div>
    </section>
  )
}
