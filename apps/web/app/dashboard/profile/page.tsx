/**
 * /dashboard/profile — candidate profile overview. Renders `ProfileSummary`
 * (the read view of the saved profile) followed by `ProfileConnect`
 * (account/connection controls related to the profile).
 */
import ProfileSummary from "../../../components/profile/ProfileSummary";
import ProfileConnect from "../../../components/profile/ProfileConnect";
export default function DashboardProfilePage(){return <><ProfileSummary/><ProfileConnect/></>;}
