"use client"

import { useState } from "react"

type PricingFaqItem = {
  question: string
  answer: string
}

type PricingFaqProps = {
  faqs: PricingFaqItem[]
}

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
