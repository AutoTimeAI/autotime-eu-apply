/**
 * Public, unauthenticated beta-waitlist signup page at /join-waitlist. For
 * visitors without an account yet. Distinct from /waitlist, which is the
 * authenticated page shown to a signed-up user whose beta_access isn't
 * 'active'.
 */
import { PublicWaitlistContent } from "../../components/PublicWaitlistContent";

export const dynamic = "force-static";

export default function JoinWaitlistPage() {
  return <PublicWaitlistContent />;
}
