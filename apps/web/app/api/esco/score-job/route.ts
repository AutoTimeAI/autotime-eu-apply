import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { classifyJobToEsco } from "../../../../lib/esco/classify-job";
import { createAdminClient } from "../../../../lib/supabase/admin";

const schema=z.object({url:z.string().url().max(2000).optional(),title:z.string().trim().max(300).optional(),description:z.string().trim().max(50000).optional()}).refine((value)=>value.url||value.title,{message:"Provide a job URL or title"});
const terms=(value:string)=>[...new Set(value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)??[])].slice(0,6);

export async function POST(request:NextRequest){try{
  const{user}=await getRequestUser(request);if(!user)return NextResponse.json({data:null,error:"Unauthorised"},{status:401});
  const body=schema.parse(await request.json());const db=createAdminClient();let title=body.title??"",description=body.description??"",occupationId:string|null=null,confidence=0,method="unmatched";
  if(body.url){const listing=await db.from("job_listings").select("title,description_raw,esco_occupation_id").eq("url",body.url).maybeSingle();if(listing.error)throw listing.error;if(listing.data){title=listing.data.title;description=listing.data.description_raw??"";occupationId=listing.data.esco_occupation_id;confidence=occupationId?1:0;method=occupationId?"classified-listing":"unmatched";}}
  if(!occupationId&&title){let candidates:Array<{id:string;preferred_label:string;description:string|null}>=[];for(const term of terms(title)){const result=await db.from("esco_occupations").select("id,preferred_label,description").eq("language","en").ilike("preferred_label",`%${term}%`).limit(50);if(result.error)throw result.error;candidates.push(...(result.data??[]).map((item)=>({id:item.id,preferred_label:item.preferred_label,description:item.description})));}const unique=[...new Map(candidates.map((item)=>[item.id,item])).values()];const match=classifyJobToEsco(title,description,unique.map((item)=>({id:item.id,preferredLabel:item.preferred_label,description:item.description})));occupationId=match.occupationId;confidence=match.confidence;method=match.method;}
  if(!occupationId)return NextResponse.json({data:{matched:false,title,reason:"No reliable ESCO occupation match was found."},error:null});
  const relations=await db.from("esco_occupation_skills").select("skill_id").eq("occupation_id",occupationId).eq("relation_type","essential");if(relations.error)throw relations.error;const skillIds=(relations.data??[]).map((item)=>item.skill_id);
  const [skills,profile]=await Promise.all([skillIds.length?db.from("esco_skills").select("id,preferred_label").in("id",skillIds):Promise.resolve({data:[],error:null}),skillIds.length?db.from("user_skill_profile").select("esco_skill_id,confidence").eq("user_id",user.id).in("esco_skill_id",skillIds).gt("confidence",0.5):Promise.resolve({data:[],error:null})]);if(skills.error)throw skills.error;if(profile.error)throw profile.error;
  const confirmed=new Set((profile.data??[]).map((item)=>item.esco_skill_id));const labels=new Map((skills.data??[]).map((item)=>[item.id,item.preferred_label]));const matched=skillIds.filter((id)=>confirmed.has(id)).map((id)=>labels.get(id)??id);const missing=skillIds.filter((id)=>!confirmed.has(id)).map((id)=>labels.get(id)??id);
  return NextResponse.json({data:{matched:true,title,occupationId,classification:{confidence,method},matchedSkills:matched,missingSkills:missing,matchedCount:matched.length,totalEssentialSkills:skillIds.length},error:null});
}catch(error){return NextResponse.json({data:null,error:error instanceof Error?error.message:"Job scoring failed"},{status:error instanceof z.ZodError?400:500});}}
