import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getMissingOnboardingEvidence, hasCompletedRequiredOnboarding, isValidLinkedInProfile } from "../../../../lib/onboarding-readiness";

const humanName = z.string().trim().min(2).max(100).regex(/^[\p{L}\p{M}][\p{L}\p{M}' .-]+$/u, "Invalid name");
const placeName = z.string().trim().min(2).max(120).regex(/^[\p{L}\p{M}][\p{L}\p{M}' .,-]+$/u, "Invalid location or country");
const optionalWebUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}, "Enter a valid http:// or https:// URL");
const patchSchema = z.object({
  fullName: humanName.optional(), email: z.string().trim().email().max(254).or(z.literal("")).optional(), phone: z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,24}$/).or(z.literal("")).optional(),
  countryCurrent: placeName.optional(), countriesTarget: z.array(placeName).min(1).max(20).optional(),
  linkedinUrl: optionalWebUrl.optional(), githubUrl: optionalWebUrl.optional(), portfolioUrl: optionalWebUrl.optional(),
  workAuthorisationCategory:z.enum(["eu_eea_swiss_citizen","existing_permission","sponsorship_required","country_specific","unsure"]).optional(),workRightDetails:z.string().trim().max(2000).optional(),
  baseCvText: z.string().max(100_000).optional(), onboardingStep: z.number().int().min(0).max(6).optional(), complete: z.boolean().optional(),
}).superRefine((body,ctx)=>{
  if(((body.onboardingStep??0)>=3||body.complete)&&!isValidLinkedInProfile(body.linkedinUrl))ctx.addIssue({code:"custom",path:["linkedinUrl"],message:"A valid LinkedIn profile URL is required"});
  if(body.complete){
    const missing=getMissingOnboardingEvidence({full_name:body.fullName,phone:body.phone,country_current:body.countryCurrent,countries_target:body.countriesTarget,work_right_details:body.workRightDetails,linkedin_url:body.linkedinUrl,base_cv_text:body.baseCvText});
    for(const field of missing)ctx.addIssue({code:"custom",path:[field],message:`Complete ${field} before finishing onboarding`});
  }
});

const select = "full_name,email,phone,photo_url,country_current,countries_target,current_country,target_countries,linkedin_url,github_url,portfolio_url,target_roles,work_authorisation_category,work_right_details,base_cv_text,experience_highlights,project_summaries,onboarding_step,onboarding_completed_at,alert_frequency,alert_last_sent_at";
export async function GET(request: NextRequest) {
  const { user } = await getRequestUser(request); if (!user) return NextResponse.json({ data:null,error:"Unauthorised" },{status:401});
  const client=createAdminClient(); const {data,error}=await client.from("profiles").select(select).eq("user_id",user.id).maybeSingle();
  let photoUrl:string|null=null; if(data?.photo_url){const signed=await client.storage.from("profile-photos").createSignedUrl(data.photo_url,3600);photoUrl=signed.data?.signedUrl??null;}
  const countries=data?.countries_target?.length?data.countries_target:(data?.target_countries??"").split(",").map((item)=>item.trim()).filter(Boolean);
  const normalised=data?{...data,country_current:data.country_current||data.current_country,countries_target:countries,photoUrl}:null;
  return NextResponse.json({data:normalised?{...normalised,onboarding_ready:hasCompletedRequiredOnboarding(normalised),onboarding_missing:getMissingOnboardingEvidence(normalised)}:null,error:error?.message??null},{status:error?500:200});
}
export async function PATCH(request: NextRequest) {
  try { const {user}=await getRequestUser(request);if(!user)return NextResponse.json({data:null,error:"Unauthorised"},{status:401});const body=patchSchema.parse(await request.json());
    const countries=body.countriesTarget; const changes={...(body.fullName!==undefined&&{full_name:body.fullName}),...(body.email!==undefined&&{email:body.email||null}),...(body.phone!==undefined&&{phone:body.phone||null}),...(body.countryCurrent!==undefined&&{country_current:body.countryCurrent,current_country:body.countryCurrent}),...(countries!==undefined&&{countries_target:countries,target_countries:countries.join(", ")}),...(body.linkedinUrl!==undefined&&{linkedin_url:body.linkedinUrl||null}),...(body.githubUrl!==undefined&&{github_url:body.githubUrl||null}),...(body.portfolioUrl!==undefined&&{portfolio_url:body.portfolioUrl||null}),...(body.workAuthorisationCategory!==undefined&&{work_authorisation_category:body.workAuthorisationCategory,sponsorship_needed:body.workAuthorisationCategory==="sponsorship_required"}),...(body.workRightDetails!==undefined&&{work_right_details:body.workRightDetails}),...(body.baseCvText!==undefined&&{base_cv_text:body.baseCvText}),...(body.onboardingStep!==undefined&&{onboarding_step:body.onboardingStep}),...(body.complete?{onboarding_completed_at:new Date().toISOString(),onboarding_step:6}:{})};
    const values={user_id:user.id,full_name:body.fullName??"",email:body.email||user.email||null,phone:body.phone||null,country_current:body.countryCurrent??"",current_country:body.countryCurrent??"",countries_target:countries??[],target_countries:countries?.join(", ")??"",target_roles:"",work_right_details:body.workRightDetails??"",linkedin_url:body.linkedinUrl||null,github_url:body.githubUrl||null,portfolio_url:body.portfolioUrl||null,base_cv_text:body.baseCvText??"",...changes};
    const client=createAdminClient();const {data:existing}=await client.from("profiles").select("id").eq("user_id",user.id).maybeSingle();
    const query=existing?client.from("profiles").update(changes).eq("user_id",user.id):client.from("profiles").insert(values);
    const {data,error}=await query.select(select).single();if(error)throw error;return NextResponse.json({data,error:null});
  } catch(error){
    if(error instanceof z.ZodError){
      return NextResponse.json({data:null,error:error.issues[0]?.message??"Correct the highlighted profile fields.",fields:Array.from(new Set(error.issues.map(issue=>String(issue.path[0]??"")).filter(Boolean)))},{status:400});
    }
    return NextResponse.json({data:null,error:error instanceof Error?error.message:"Profile save failed"},{status:500});
  }
}
