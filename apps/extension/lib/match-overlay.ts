import { detectJobPage } from "../contents/autofill";
import { getJobCaptureMode, isLinkedInUrl } from "./job-page";
import { appUrl } from "./openai";
import { getAccountSession } from "./storage";

type Score = { matched:boolean; title?:string; matchedCount?:number; totalEssentialSkills?:number; matchedSkills?:string[]; missingSkills?:string[] };

export async function showEscoMatchOverlay(){
  if(isLinkedInUrl(window.location.href)||document.getElementById("autotime-esco-match-host"))return;
  const session=await getAccountSession();if(!session?.authToken.trim())return;
  const mode=getJobCaptureMode(window.location.href);const details=mode==="selector-extraction"?detectJobPage():null;
  const payload=mode==="api-reference"?{url:window.location.href}:details?.roleTitle&&details.jobDescription.length>=80?{url:window.location.href,title:details.roleTitle,description:details.jobDescription}:null;
  if(!payload)return;
  const response=await fetch(`${appUrl}/api/esco/score-job`,{method:"POST",headers:{Authorization:`Bearer ${session.authToken}`,"Content-Type":"application/json","x-autotime-source":"extension"},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
  if(!response.ok)return;const body=await response.json() as {data:Score|null};if(!body.data?.matched||!body.data.totalEssentialSkills)return;
  const score=body.data;const host=document.createElement("aside");host.id="autotime-esco-match-host";host.setAttribute("aria-label","AutoTime ESCO job match");const root=host.attachShadow({mode:"open"});
  root.innerHTML=`<style>:host{all:initial}.card{position:fixed;right:18px;bottom:18px;z-index:2147483647;width:min(340px,calc(100vw - 36px));box-sizing:border-box;border:1px solid #b8c9df;border-radius:16px;background:#fff;color:#13213a;box-shadow:0 16px 44px rgba(20,52,91,.2);font:14px/1.45 Arial,sans-serif;padding:16px}.top{display:flex;justify-content:space-between;gap:12px}.brand{color:#174a91;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.score{font-size:20px;font-weight:800;margin:4px 0}.muted{color:#627086;margin:0}.missing{margin:12px 0 0}.missing strong{display:block;margin-bottom:3px}button{border:0;background:transparent;color:#52637a;font-size:20px;cursor:pointer;padding:0 2px}</style><div class="card"><div class="top"><div><div class="brand">AutoTime · ESCO evidence</div><div class="score">${score.matchedCount} of ${score.totalEssentialSkills} essential skills matched</div></div><button type="button" aria-label="Close match score">×</button></div><p class="muted">Explainable overlap from your confirmed skill profile.</p>${score.missingSkills?.length?`<p class="missing"><strong>Skills to evidence</strong>${score.missingSkills.slice(0,5).map(escapeHtml).join(", ")}</p>`:""}</div>`;
  root.querySelector("button")?.addEventListener("click",()=>host.remove());document.documentElement.append(host);
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]??character);}
