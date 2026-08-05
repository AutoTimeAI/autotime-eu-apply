import HomeExperience from "../../components/HomeExperience";
import { isTestAuthEnabled } from "../../lib/test-auth";

export default function DashboardPage() {
  return <HomeExperience testMode={isTestAuthEnabled()} />;
}
