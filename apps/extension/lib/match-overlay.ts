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

const linkedInConsentKey="linkedin-single-page-match-risk-acknowledged";

export async function requestLinkedInEscoMatch(){
  if(!isLinkedInUrl(window.location.href)||!/^\/jobs\//i.test(window.location.pathname))return;
  const stored=await chrome.storage.local.get(linkedInConsentKey);
  if(stored[linkedInConsentKey]!==true){showLinkedInDisclosure();return;}
  await scoreCurrentLinkedInPage();
}

function showLinkedInDisclosure(){
  document.getElementById("autotime-linkedin-disclosure-host")?.remove();
  const host=document.createElement("aside");host.id="autotime-linkedin-disclosure-host";host.setAttribute("aria-label","LinkedIn match feature disclosure");const root=host.attachShadow({mode:"open"});
  root.innerHTML=`<style>:host{all:initial}.backdrop{position:fixed;inset:0;z-index:2147483647;background:rgba(10,24,44,.55);display:grid;place-items:center;padding:20px;box-sizing:border-box}.dialog{width:min(520px,100%);background:#fff;color:#13213a;border-radius:18px;padding:24px;box-shadow:0 22px 70px rgba(0,0,0,.3);font:15px/1.55 Arial,sans-serif}.label{color:#9b3d45;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}h2{font-size:22px;margin:6px 0 10px}p{color:#536176;margin:0 0 12px}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}button{border:1px solid #174a91;border-radius:10px;padding:10px 15px;font:700 14px Arial,sans-serif;cursor:pointer}.accept{background:#174a91;color:#fff}.cancel{background:#fff;color:#174a91}</style><div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="autotime-linkedin-risk-title"><div class="label">One-time risk notice</div><h2 id="autotime-linkedin-risk-title">Check this LinkedIn job only?</h2><p>AutoTime will read the title and description on the single LinkedIn job page you currently have open to calculate an ESCO skill match.</p><p>This page reading is outside LinkedIn’s terms and may carry a small risk of warnings or restrictions to your LinkedIn account. AutoTime will not click, message, collect profile data, scan results, or store the raw page content.</p><div class="actions"><button class="accept" type="button">I understand — check this job</button><button class="cancel" type="button">Cancel</button></div></section></div>`;
  root.querySelector(".cancel")?.addEventListener("click",()=>host.remove());root.querySelector(".accept")?.addEventListener("click",()=>void chrome.storage.local.set({[linkedInConsentKey]:true}).then(()=>{host.remove();return scoreCurrentLinkedInPage();}));document.documentElement.append(host);
}

async function scoreCurrentLinkedInPage(){
  const session=await getAccountSession();if(!session?.authToken.trim())return;
  const details=detectJobPage({allowLinkedInRead:true});if(!details.roleTitle||details.jobDescription.length<80)return;
  const response=await fetch(`${appUrl}/api/esco/score-job`,{method:"POST",headers:{Authorization:`Bearer ${session.authToken}`,"Content-Type":"application/json","x-autotime-source":"extension"},body:JSON.stringify({title:details.roleTitle,description:details.jobDescription}),signal:AbortSignal.timeout(12000)});if(!response.ok)return;
  const body=await response.json() as {data:Score|null};if(!body.data?.matched||!body.data.totalEssentialSkills)return;renderScore(body.data,"LinkedIn · explicit check");
}

function renderScore(score:Score,label="AutoTime · ESCO evidence"){
  document.getElementById("autotime-esco-match-host")?.remove();const host=document.createElement("aside");host.id="autotime-esco-match-host";host.setAttribute("aria-label","AutoTime ESCO job match");const root=host.attachShadow({mode:"open"});
  root.innerHTML=`<style>:host{all:initial}.card{position:fixed;right:18px;bottom:18px;z-index:2147483647;width:min(340px,calc(100vw - 36px));box-sizing:border-box;border:1px solid #b8c9df;border-radius:16px;background:#fff;color:#13213a;box-shadow:0 16px 44px rgba(20,52,91,.2);font:14px/1.45 Arial,sans-serif;padding:16px}.top{display:flex;justify-content:space-between;gap:12px}.brand{color:#174a91;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.score{font-size:20px;font-weight:800;margin:4px 0}.muted{color:#627086;margin:0}.missing{margin:12px 0 0}.missing strong{display:block;margin-bottom:3px}button{border:0;background:transparent;color:#52637a;font-size:20px;cursor:pointer;padding:0 2px}</style><div class="card"><div class="top"><div><div class="brand">${escapeHtml(label)}</div><div class="score">${score.matchedCount} of ${score.totalEssentialSkills} essential skills matched</div></div><button type="button" aria-label="Close match score">×</button></div><p class="muted">Explainable overlap from your confirmed skill profile. Raw page content was not stored.</p>${score.missingSkills?.length?`<p class="missing"><strong>Skills to evidence</strong>${score.missingSkills.slice(0,5).map(escapeHtml).join(", ")}</p>`:""}</div>`;root.querySelector("button")?.addEventListener("click",()=>host.remove());document.documentElement.append(host);
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]??character);}
