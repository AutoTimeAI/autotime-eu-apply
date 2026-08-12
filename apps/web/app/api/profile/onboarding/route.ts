import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";

const patchSchema = z.object({
  fullName: z.string().trim().max(200).optional(), email: z.string().email().or(z.literal("")).optional(), phone: z.string().trim().max(50).optional(),
  countryCurrent: z.string().trim().max(120).optional(), countriesTarget: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  linkedinUrl: z.string().url().or(z.literal("")).optional(), githubUrl: z.string().url().or(z.literal("")).optional(), portfolioUrl: z.string().url().or(z.literal("")).optional(),
  baseCvText: z.string().max(100_000).optional(), onboardingStep: z.number().int().min(0).max(5).optional(), complete: z.boolean().optional(),
});

const select = "full_name,email,phone,photo_url,country_current,countries_target,current_country,target_countries,linkedin_url,github_url,portfolio_url,target_roles,work_right_details,base_cv_text,onboarding_step,onboarding_completed_at";
export async function GET(request: NextRequest) {
  const { user } = await getRequestUser(request); if (!user) return NextResponse.json({ data:null,error:"Unauthorised" },{status:401});
  const client=createAdminClient(); const {data,error}=await client.from("profiles").select(select).eq("user_id",user.id).maybeSingle();
  let photoUrl:string|null=null; if(data?.photo_url){const signed=await client.storage.from("profile-photos").createSignedUrl(data.photo_url,3600);photoUrl=signed.data?.signedUrl??null;}
  const countries=data?.countries_target?.length?data.countries_target:(data?.target_countries??"").split(",").map((item)=>item.trim()).filter(Boolean);
  return NextResponse.json({data:data?{...data,country_current:data.country_current||data.current_country,countries_target:countries,photoUrl}:null,error:error?.message??null},{status:error?500:200});
}
export async function PATCH(request: NextRequest) {
  try { const {user}=await getRequestUser(request);if(!user)return NextResponse.json({data:null,error:"Unauthorised"},{status:401});const body=patchSchema.parse(await request.json());
    const countries=body.countriesTarget; const changes={...(body.fullName!==undefined&&{full_name:body.fullName}),...(body.email!==undefined&&{email:body.email||null}),...(body.phone!==undefined&&{phone:body.phone||null}),...(body.countryCurrent!==undefined&&{country_current:body.countryCurrent,current_country:body.countryCurrent}),...(countries!==undefined&&{countries_target:countries,target_countries:countries.join(", ")}),...(body.linkedinUrl!==undefined&&{linkedin_url:body.linkedinUrl||null}),...(body.githubUrl!==undefined&&{github_url:body.githubUrl||null}),...(body.portfolioUrl!==undefined&&{portfolio_url:body.portfolioUrl||null}),...(body.baseCvText!==undefined&&{base_cv_text:body.baseCvText}),...(body.onboardingStep!==undefined&&{onboarding_step:body.onboardingStep}),...(body.complete?{onboarding_completed_at:new Date().toISOString(),onboarding_step:5}:{})};
    const values={user_id:user.id,full_name:body.fullName??"",email:body.email||user.email||null,phone:body.phone||null,country_current:body.countryCurrent??"",current_country:body.countryCurrent??"",countries_target:countries??[],target_countries:countries?.join(", ")??"",target_roles:"",work_right_details:"",linkedin_url:body.linkedinUrl||null,github_url:body.githubUrl||null,portfolio_url:body.portfolioUrl||null,base_cv_text:body.baseCvText??"",...changes};
    const client=createAdminClient();const {data:existing}=await client.from("profiles").select("id").eq("user_id",user.id).maybeSingle();
    const query=existing?client.from("profiles").update(changes).eq("user_id",user.id):client.from("profiles").insert(values);
    const {data,error}=await query.select(select).single();if(error)throw error;return NextResponse.json({data,error:null});
  } catch(error){return NextResponse.json({data:null,error:error instanceof Error?error.message:"Profile save failed"},{status:error instanceof z.ZodError?400:500});}
}
