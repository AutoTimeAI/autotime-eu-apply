import { useEffect, useState } from "react"
import {
  onboardingSteps,
  onboardedStorageKey,
  type Section
} from "./constants"

type OnboardingProps = {
  onNavigate: (section: Section) => void
}

export function Onboarding({ onNavigate }: OnboardingProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = onboardingSteps[stepIndex]
  const isFinalStep = stepIndex === onboardingSteps.length - 1

  useEffect(() => {
    let isMounted = true

    const loadOnboardingState = async () => {
      const stored = await chrome.storage.local.get(onboardedStorageKey)
      const isOnboarded = stored[onboardedStorageKey] === true

      if (!isMounted) {
        return
      }

      setIsVisible(!isOnboarded)
      setIsLoading(false)
    }

    loadOnboardingState()

    return () => {
      isMounted = false
    }
  }, [])

  const handleStepCta = async () => {
    onNavigate(currentStep.section)

    if (isFinalStep) {
      await chrome.storage.local.set({ [onboardedStorageKey]: true })
      setIsVisible(false)
      return
    }

    setStepIndex((current) => current + 1)
  }

  if (isLoading || !isVisible) {
    return null
  }

  return (
    <section
      aria-label="First-run onboarding"
      className="status-message"
      role="dialog"
    >
      <strong>
        Step {stepIndex + 1} of {onboardingSteps.length}: {currentStep.title}
      </strong>
      <p className="empty-state">{currentStep.description}</p>
      <div className="form-grid">
        <button type="button" onClick={handleStepCta}>
          {isFinalStep ? "Got it" : currentStep.ctaLabel}
        </button>
      </div>
    </section>
  )
}
