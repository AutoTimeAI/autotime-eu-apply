/**
 * /dashboard/international — optional workspace for building an
 * evidence-led view of work permission, sponsorship and relocation before
 * committing to an application. Renders `InternationalModule`, a client
 * component that manages its own section state (overview/mobility/etc).
 */
import { InternationalModule } from "../../../components/InternationalModule";

export default function InternationalPage() {
  return <InternationalModule />;
}
