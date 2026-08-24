/**
 * /dashboard/role-pathways — career-direction / role-pathways workspace.
 * Loads its own CSS (role-pathways.css, phase-6-career-direction.css) and
 * renders `RolePathwaysExperience`.
 */
import { RolePathwaysExperience } from "../../../components/RolePathwaysExperience";
import "./role-pathways.css";
import "./phase-6-career-direction.css";
export default function RolePathwaysPage() {
  return <RolePathwaysExperience />;
}
