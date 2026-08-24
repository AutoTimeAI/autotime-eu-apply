/**
 * /dashboard/role-pathways/questionnaire — the ESCO skills questionnaire
 * used to build an explainable role-matching profile (evidence-based
 * answers mapped to official ESCO skill relationships, not a hiring
 * prediction). Renders `EscoQuestionnaire`, a client component that talks
 * to the /api/esco/* endpoints.
 */
import EscoQuestionnaire from "../../../../components/EscoQuestionnaire";
export default function EscoQuestionnairePage() { return <EscoQuestionnaire />; }
