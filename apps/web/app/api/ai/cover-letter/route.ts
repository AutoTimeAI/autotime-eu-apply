import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { assertAiRouteRateLimit, RateLimitError, tailorCoverLetterWithOpenAI } from "../../../../lib/openai-server";
import { reserveAiCall, releaseAiCall, FeatureGateError, finalizeAiCall } from "../../../../lib/feature-gate";
import { createAdminClient } from "../../../../lib/supabase/admin";

const cvSchema = z.object({ contact:z.object({name:z.string(),email:z.string(),phone:z.string(),location:z.string(),linkedin:z.string().optional()}),summary:z.string(),experience:z.array(z.object({title:z.string(),company:z.string(),dates:z.string(),bullets:z.array(z.string())})),education:z.array(z.object({degree:z.string(),institution:z.string(),dates:z.string()})),skills:z.array(z.string()) });
const createSchema = z.object({ cv:cvSchema, jobId:z.string().uuid().optional(), jobTitle:z.string().trim().min(2).max(200), companyName:z.string().trim().min(2).max(200), jobDescription:z.string().trim().min(80).max(50000) });
const updateSchema = z.object({ id:z.string().uuid(), content:z.string().trim().min(100).max(20000) });

export async function POST(request:NextRequest){
  try{
    const {user}=await getRequestUser(request);if(!user)return NextResponse.json({data:null,error:"Unauthorised"},{status:401});
    const body=createSchema.parse(await request.json());await assertAiRouteRateLimit(user.id);const reservationId=await reserveAiCall(user.id);
    let result;try{result=await tailorCoverLetterWithOpenAI(body);}catch(error){await releaseAiCall(reservationId);throw error;}
    await finalizeAiCall(reservationId,{feature:"cover-letter",model:result.model,promptTokens:result.promptTokens,completionTokens:result.completionTokens,costUsd:result.costUsd});
    let letter={id:null as string|null,version:null as number|null,content:result.value};
    if(body.jobId){const db=createAdminClient();const latest=await db.from("cover_letters").select("version").eq("user_id",user.id).eq("job_id",body.jobId).order("version",{ascending:false}).limit(1).maybeSingle();if(latest.error)throw latest.error;const inserted=await db.from("cover_letters").insert({user_id:user.id,job_id:body.jobId,company_name:body.companyName,job_title:body.jobTitle,version:(latest.data?.version??0)+1,content:result.value}).select("id,version,content").single();if(inserted.error)throw inserted.error;letter=inserted.data;}
    return NextResponse.json({data:{letter},error:null});
  }catch(error){const status=error instanceof z.ZodError?400:error instanceof FeatureGateError?402:error instanceof RateLimitError?429:500;return NextResponse.json({data:null,error:error instanceof Error?error.message:"Cover-letter generation failed"},{status});}
}

export async function PATCH(request:NextRequest){try{const{user}=await getRequestUser(request);if(!user)return NextResponse.json({data:null,error:"Unauthorised"},{status:401});const body=updateSchema.parse(await request.json());const{data,error}=await createAdminClient().from("cover_letters").update({content:body.content}).eq("id",body.id).eq("user_id",user.id).select("id,version,content").single();if(error)throw error;return NextResponse.json({data:{letter:data},error:null});}catch(error){return NextResponse.json({data:null,error:error instanceof Error?error.message:"Cover-letter update failed"},{status:error instanceof z.ZodError?400:500});}}
