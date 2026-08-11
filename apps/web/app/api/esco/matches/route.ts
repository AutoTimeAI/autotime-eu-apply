import { type NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";
export async function GET(request:NextRequest){const{user}=await getRequestUser(request);if(!user)return NextResponse.json({data:null,error:"Unauthorised"},{status:401});const{data,error}=await createAdminClient().rpc("match_esco_jobs",{p_user_id:user.id,p_limit:50});return NextResponse.json({data,error:error?.message??null},{status:error?500:200});}
