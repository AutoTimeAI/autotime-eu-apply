/**
 * Transactional "welcome" email sent after signup, built with
 * @react-email/components. Introduces the AutoTime workspace and nudges the
 * new user toward saving their profile and checking a job description.
 */
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text
} from "@react-email/components"

type WelcomeEmailProps = {
  name: string
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

/**
 * Renders the welcome email body, greeting the user by `name`.
 */
export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your UK/EU job search workspace is ready</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Welcome to AutoTime, {name}</Heading>
          <Text style={textStyle}>
            Your UK/EU job search, organised and AI-assisted, is ready.
          </Text>
          <Text style={textStyle}>
            Start by saving your candidate profile, then paste a job
            description to check fit, work-right risk and the next best action.
          </Text>
          <Text style={textStyle}>
            AutoTime will never invent experience for you. It helps turn the
            evidence you already have into sharper applications.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
