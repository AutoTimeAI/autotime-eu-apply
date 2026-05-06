import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text
} from "@react-email/components"

type UpgradeConfirmedEmailProps = {
  periodEnd: Date
  plan: string
}

const bodyStyle = {
  backgroundColor: "#f6f7f9",
  color: "#253044",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
}

const containerStyle = {
  margin: "0 auto",
  maxWidth: "560px",
  padding: "40px 24px"
}

const headingStyle = {
  color: "#17202f",
  fontSize: "28px",
  lineHeight: "1.2",
  margin: "0 0 18px"
}

const textStyle = {
  fontSize: "16px",
  lineHeight: "1.7",
  margin: "0 0 16px"
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date)
}

export default function UpgradeConfirmedEmail({
  periodEnd,
  plan
}: UpgradeConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your AutoTime {plan} upgrade is active</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Your upgrade is confirmed</Heading>
          <Text style={textStyle}>
            AutoTime {plan} is now active for your account.
          </Text>
          <Text style={textStyle}>
            Your current billing period runs until {formatDate(periodEnd)}.
          </Text>
          <Text style={textStyle}>
            You now have cloud sync, unlimited AI analyses, application content
            generation and interview prep for your UK/EU search.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
