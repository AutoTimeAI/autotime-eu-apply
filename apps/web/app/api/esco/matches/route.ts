/**
 * GET /api/esco/matches
 *
 * Returns up to 50 ESCO-based job matches for the caller, computed by the
 * `match_esco_jobs` Postgres RPC from the caller's `user_skill_profile`.
 *
 * Auth: requires a valid session — resolved via `getRequestUser`. Requests
 * without a recognised user receive 401.
 */
import { type NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";
/**
 * Runs `match_esco_jobs` for the caller and returns the matches.
 *
 * Responses:
 * - 200: `{ data, error: null }` matched jobs (up to 50).
 * - 401: no authenticated user.
 * - 500: `{ data, error: <message> }` when the RPC call errors.
 */
export async function GET(request:NextRequest){const{user}=await getRequestUser(request);if(!user)return NextResponse.json({data:null,error:"Unauthorised"},{status:401});const{data,error}=await createAdminClient().rpc("match_esco_jobs",{p_user_id:user.id,p_limit:50});return NextResponse.json({data,error:error?.message??null},{status:error?500:200});}
