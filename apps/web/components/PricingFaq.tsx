"use client"

// Expandable FAQ grid for the /pricing page: clicking a question opens it
// in a modal dialog rather than an inline accordion, so the grid layout
// doesn't reflow as answers of varying length are revealed.

import { useState } from "react"

type PricingFaqItem = {
  question: string
  answer: string
}

type PricingFaqProps = {
  faqs: PricingFaqItem[]
}

/**
 * Renders pricing FAQ questions as a button grid; selecting one opens its
 * answer in a modal dialog (closed by clicking the backdrop or the Close
 * button). `faqs` is supplied by the caller — this component holds only the
 * "which FAQ is open" state.
 */
export function PricingFaq({ faqs }: PricingFaqProps) {
  const [activeFaq, setActiveFaq] = useState<PricingFaqItem | null>(null)

  return (
    <>
      <div className="faq-grid">
        {faqs.map((faq) => (
          <button
            className="faq-item"
            key={faq.question}
            type="button"
            onClick={() => setActiveFaq(faq)}
          >
            <span>{faq.question}</span>
            <strong aria-hidden="true">+</strong>
          </button>
        ))}
      </div>

      {activeFaq ? (
        <div
          className="faq-answer-backdrop"
          role="presentation"
          onClick={() => setActiveFaq(null)}
        >
          <section
            aria-modal="true"
            className="faq-answer-dialog"
            role="dialog"
            aria-labelledby="pricing-faq-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h3 id="pricing-faq-title">{activeFaq.question}</h3>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setActiveFaq(null)}
              >
                Close
              </button>
            </div>
            <p>{activeFaq.answer}</p>
          </section>
        </div>
      ) : null}
    </>
  )
}
