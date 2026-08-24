import { ApiCheck, AssertionBuilder, Frequency } from "checkly/constructs"

// Public application availability - the simplest, cheapest possible check:
// an unauthenticated GET of the landing page. Never sends any secret.
new ApiCheck("public-availability", {
  name: "Public availability - landing page",
  frequency: Frequency.EVERY_5M,
  locations: ["eu-west-1", "us-east-1"],
  tags: ["production", "availability"],
  request: {
    method: "GET",
    url: "https://autotime-eu-apply.vercel.app/",
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000)
    ]
  },
  maxResponseTime: 10000
})
