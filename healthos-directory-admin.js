// Restricted HealthOS platform hospital-directory administration.
(() => {
 const URL="https://berfmuhqfuwcgpnqxrtm.supabase.co";
 const KEY="sb_publishable_UIhbdxfxl8jsU9KnIE93pg_HTEsU39C";
 const ENDPOINT=URL+"/functions/v1/healthos-hospital-directory-admin";
 let client, sources=[];
  const OSM_RUN_STORAGE_KEY="healthos_ogun_osm_preview_v1";
  const freshOsmRun=()=>({area:null,nextTile:0,totalTiles:null,candidates:new Map(),failedTiles:new Map(),rawCount:0,insideCount:0,retryRound:0,retryQueue:[],retryCursor:0,successTiles:new Set()});
  function restoreOsmRun(){
   try{
    const saved=JSON.parse(localStorage.getItem(OSM_RUN_STORAGE_KEY)||"null");
    if(!saved||saved.area!=="ogun_state")return freshOsmRun();
    return {...freshOsmRun(),...saved,candidates:new Map(saved.candidates||[]),failedTiles:new Map(saved.failedTiles||[]),successTiles:new Set(saved.successTiles||[])};
   }catch(_){return freshOsmRun();}
  }
  let osmRunState=restoreOsmRun();
  function persistOsmRun(){
   try{
    localStorage.setItem(OSM_RUN_STORAGE_KEY,JSON.stringify({...osmRunState,candidates:Array.from(osmRunState.candidates.entries()),failedTiles:Array.from(osmRunState.failedTiles.entries()),successTiles:Array.from(osmRunState.successTiles)}));
   }catch(_){/* Storage may be unavailable; the active run can still continue in memory. */}
  }
 const $=id=>document.getElementById(id);
 const say=(s,bad=false)=>{const e=$("directoryAdminMessage");e.textContent=s;e.className="message "+(bad?"error":"success");};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const OGUN_LGAS=["Abeokuta North","Abeokuta South","Ado-Odo/Ota","Egbado North (Yewa North)","Egbado South (Yewa South)","Ewekoro","Ifo","Ijebu East","Ijebu North","Ijebu North East","Ijebu Ode","Ikenne","Imeko Afon","Ipokia","Obafemi Owode","Odeda","Odogbolu","Ogun Waterside","Remo North","Shagamu"];
 function renderOgunLgaCoverage(){
  const rows=$("osmLgaCoverageRows"),summary=$("osmLgaCoverageSummary");
  if(!rows||!summary)return;
  if(osmRunState.area!=="ogun_state"||!osmRunState.candidates.size){rows.innerHTML='<tr><td colspan="3">Run the Ogun State dry search to populate this report.</td></tr>';summary.textContent="No state-wide candidate data available yet.";return;}
  const counts=new Map(OGUN_LGAS.map(name=>[name,0]));
  const normalize=value=>String(value||"").toLowerCase().replace(/\b(lga|local government area)\b/g,"").replace(/[^a-z0-9]/g,"");
  let boundaryAssigned=0,tagAssigned=0,unassigned=0;
  for(const candidate of osmRunState.candidates.values()){
   const boundaryName=String(candidate.local_government_area||"").trim();
   if(boundaryName){
    const match=OGUN_LGAS.find(name=>normalize(name)===normalize(boundaryName)||normalize(name.replace(" (Yewa North)",""))===normalize(boundaryName)||normalize(name.replace(" (Yewa South)",""))===normalize(boundaryName));
    if(match){counts.set(match,counts.get(match)+1);boundaryAssigned++;continue;}
   }
   const tags=candidate.raw_tags||{};
   const hints=[tags["addr:district"],tags["addr:county"],tags["addr:municipality"],tags["addr:locality"],tags["addr:town"],tags["addr:city"],tags["is_in"],tags["is_in:district"],tags["is_in:county"]].filter(Boolean).join(" ");
   const haystack=normalize(hints);
   let matched=false;
   for(const lga of OGUN_LGAS){
    const aliases=([lga,lga.replace(" (Yewa North)",""),lga.replace(" (Yewa South)",""),lga==="Egbado North (Yewa North)"?"Yewa North":lga==="Egbado South (Yewa South)"?"Yewa South":lga==="Shagamu"?"Sagamu":lga]).map(normalize);
    if(aliases.some(alias=>alias&&haystack.includes(alias))){counts.set(lga,counts.get(lga)+1);tagAssigned++;matched=true;break;}
   }
   if(!matched)unassigned++;
  }
  const observed=Array.from(counts.values()).filter(n=>n>0).length;
  rows.innerHTML=OGUN_LGAS.map(name=>{const n=counts.get(name);return '<tr><td>'+esc(name)+'</td><td>'+n+'</td><td>'+(n?'Candidates assigned':'No candidates assigned yet')+'</td></tr>';}).join("");
  summary.textContent=observed+" of 20 LGAs represented. "+boundaryAssigned+" candidates assigned by OCHA administrative polygons; "+tagAssigned+" by OSM location tags; "+unassigned+" remain unassigned. Coverage describes discovered OSM candidates only, not the total number of hospitals.";
 }
 async function call(method="GET",body){
  const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token)throw Error("Sign in with the authorised platform administrator account.");
  const r=await fetch(ENDPOINT,{method,headers:{Authorization:"Bearer "+session.access_token,apikey:KEY,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>({error:"Invalid response"}));if(!r.ok){const err=new Error(d.error||"Request failed");err.code=d.code||("HTTP_"+r.status);throw err;}return d;
 }
 async function load(){
  try{
   const d=await call();sources=(d.sources||[]);$("platformDirectoryAdmin").hidden=false;$("openDirectoryAdminButton").hidden=false;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=false;
   $("directorySourceRows").innerHTML=sources.map(s=>'<tr><td>'+esc(s.source_name)+'</td><td>'+esc(s.source_type)+'</td><td>'+esc(s.data_license)+'<br><small>'+esc(s.permission_basis)+'</small></td><td>'+(s.permission_review_status||"pending")+' / '+(s.is_enabled?"Enabled":"Disabled")+'</td><td>'+(s.source_name.includes("GRID3 Nigeria Health Facilities v2.0")?'<button class="logout-button" data-permission-review="'+esc(s.id)+'">Review v2.0 licence</button> ':"")+(s.is_enabled?"—":'<button class="logout-button" data-enable="'+esc(s.id)+'">Enable</button>')+'</td></tr>').join("")||'<tr><td colspan="5">No sources registered.</td></tr>';
   $("directoryListingRows").innerHTML=(d.listings||[]).map(x=>'<tr><td>'+esc(x.public_name)+'</td><td>'+esc([x.city,x.state,x.address].filter(Boolean).join(", "))+'</td><td>'+esc(x.source_record_id)+'</td><td>'+esc(x.listing_status)+'</td><td>'+(x.duplicate_candidate?"Candidate — manual comparison":"No flag")+'</td><td>'+(x.listing_status==="review_required"?'<button class="logout-button" data-review="'+esc(x.id)+'" data-decision="approved_for_public">Approve</button> <button class="logout-button" data-review="'+esc(x.id)+'" data-decision="suppressed">Suppress</button>':"—")+'</td></tr>').join("")||'<tr><td colspan="6">No listings awaiting review.</td></tr>';
   $("directoryImportSource").innerHTML=sources.filter(s=>s.is_enabled).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.source_name)+'</option>').join("");
   say("Authorised. "+sources.length+" sources and "+(d.listings||[]).length+" listings loaded.");
  }catch(e){$("openDirectoryAdminButton").hidden=false;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=false;$("platformDirectoryAdmin").hidden=false;say("Directory check failed"+(e.code?" ("+e.code+")":"")+": "+(e.message||"Unknown error"),true);}
 }
 document.addEventListener("DOMContentLoaded",()=>{
  client=window.supabase.createClient(URL,KEY);
  // Keep the platform admin console outside the hospital dashboard wrapper.
  // The wrapper is hidden until management verification, so nesting the console
  // inside it makes the global Platform Directory Admin button appear unresponsive.
  const adminPanel=$("platformDirectoryAdmin");

  if(adminPanel && adminPanel.parentElement!==document.body){document.body.appendChild(adminPanel);}
  if(adminPanel && !document.getElementById("ngBoundaryImportCard")){
   const card=document.createElement("section");
   card.id="ngBoundaryImportCard";
   card.style.cssText="margin:18px 0;padding:18px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;color:#102b46";
   card.innerHTML='<h3 style="margin-top:0">Nigeria State & LGA Boundary Import</h3><p>Import official World Bank administrative polygons into the restricted geographic reference table. This does not publish or verify hospital records.</p><button id="ngBoundaryImportButton" class="primary-button" type="button">Import Nigeria state and LGA boundaries</button><p id="ngBoundaryImportMessage" class="message" role="status" aria-live="polite"></p>';
   adminPanel.insertBefore(card,adminPanel.firstChild);
   card.querySelector("#ngBoundaryImportButton").addEventListener("click",async ev=>{
    const button=ev.currentTarget,msg=card.querySelector("#ngBoundaryImportMessage");
    if(!confirm("Import Nigeria state and LGA boundary polygons from the World Bank official boundary service? This writes only geographic reference polygons; it does not alter, verify, or publish any hospital record."))return;
    button.disabled=true;msg.textContent="Contacting the boundary importer. Please keep this page open…";
    try{
     const {data:{session}}=await client.auth.getSession();
     if(!session?.access_token)throw new Error("Your administrator session has expired. Sign in again.");
     const response=await fetch(URL+"/functions/v1/healthos-ng-boundary-import",{
      method:"POST",
      headers:{Authorization:"Bearer "+session.access_token,apikey:KEY,"Content-Type":"application/json"},
      body:JSON.stringify({action:"import_nigeria_boundaries"})
     });
     const result=await response.json().catch(()=>({error:"Invalid boundary-import response"}));
     if(!response.ok)throw new Error(result.error||"Boundary import failed (HTTP "+response.status+")");
     const counts=result.stored_counts||{};
     msg.textContent="Import response: "+JSON.stringify(result.import_summary||[])+" Stored polygons — states: "+(counts.states??"not reported")+", LGAs: "+(counts.lgas??"not reported")+". "+(result.note||"");
     msg.className="message success";
    }catch(error){msg.textContent=error.message||"Boundary import failed.";msg.className="message error";}
    finally{button.disabled=false;}
   });
  }
  $("openDirectoryAdminButton").addEventListener("click",()=>{$("platformDirectoryAdmin").hidden=false;$("platformDirectoryAdmin").scrollIntoView({behavior:"smooth"});load();});
  const directoryNav=$("platformDirectoryAdminNav");if(directoryNav)directoryNav.addEventListener("click",e=>{e.preventDefault();$("openDirectoryAdminButton").click();});
  $("directoryAdminClose").addEventListener("click",()=>{$("platformDirectoryAdmin").hidden=true;});
  client.auth.onAuthStateChange((event,session)=>{if(session){$("openDirectoryAdminButton").hidden=false;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=false;load();}else{$("openDirectoryAdminButton").hidden=true;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=true;$("platformDirectoryAdmin").hidden=true;}});
  $("directorySourceForm").addEventListener("submit",async e=>{e.preventDefault();try{await call("POST",{action:"register_source",source_name:$("directorySourceName").value,source_type:$("directorySourceType").value,source_website:$("directorySourceWebsite").value,data_license:$("directorySourceLicense").value,permission_basis:$("directorySourcePermission").value,country_code:"NG"});e.target.reset();say("Source registered disabled. Verify its permission before enabling.");await load();}catch(x){say(x.message,true);}});
  $("platformDirectoryAdmin").addEventListener("click",async e=>{try{
   const en=e.target.closest("[data-enable]"),rv=e.target.closest("[data-review]"),pr=e.target.closest("[data-permission-review]");
   if(pr){
    const approved=confirm("GRID3 v2.0 metadata identifies CC BY 4.0 and permits reuse with attribution. The dataset is non-exhaustive and not fully validated. Approve this exact v2.0 source for restricted manual review only? This does NOT verify hospitals or publish listings.");
    if(!approved)return;
    const notes="Reviewed exact GRID3 NGA Health Facilities v2.0 ArcGIS item metadata (DOI 10.7916/kv1n-0743). CC BY 4.0 permits reuse with clear attribution. Approval is limited to v2.0 controlled ingestion into restricted manual review; records remain provisional and unverified. Does not cover v3.0 or authorise public publication.";
    await call("POST",{action:"review_source_permission",source_id:pr.dataset.permissionReview,decision:"approved",permission_evidence_url:"https://www.arcgis.com/home/item.html?id=081506afb7f14af1a3f64130343a6a6a",permission_review_notes:notes});
    say("v2.0 permission review recorded. Source remains disabled; enable separately when ready for controlled staging.");await load();
   }
   if(en){if(!confirm("Have you verified the licence and legal permission for public use?"))return;await call("POST",{action:"enable_source",source_id:en.dataset.enable});say("Source enabled.");await load();}
   if(rv){const reason=prompt("Enter the reason for this review decision:");if(!reason?.trim())return;await call("POST",{action:"review_listing",listing_id:rv.dataset.review,decision:rv.dataset.decision,reason});say("Decision recorded.");await load();}
  }catch(x){say(x.message,true);}});
  const runGrid3=async(action,button)=>{
    button.disabled=true;
    const previewButton=$("grid3PreviewButton"),stageButton=$("grid3StageButton");
    if(previewButton)previewButton.disabled=true;if(stageButton)stageButton.disabled=true;
    const message=$("grid3PreviewMessage");
    const selectedState=$("grid3StateSelect")?.value||"Lagos";
    message.textContent=action==="stage_for_review"?"Retrieving "+selectedState+" records and staging them in the restricted manual-review queue…":"Retrieving GRID3 facilities for "+selectedState+"…";
    if(action!=="stage_for_review")$("grid3PreviewRows").innerHTML='<tr><td colspan="5">Loading preview…</td></tr>';
    try{
     const {data,error}=await client.functions.invoke("healthos-grid3-hospital-collector",{body:{action,state:selectedState}});
     if(error)throw error;if(data?.error)throw Error(data.error+(data.details?": "+data.details:""));
     if(action==="stage_for_review"){
      message.textContent=selectedState+" staging complete: "+data.newly_staged_count+" new records added to restricted manual review. "+data.unique_record_count+" unique records retrieved; "+data.coordinate_valid_count+" have valid coordinates. LGA boundary classification was applied; records without a unique LGA or valid coordinates are marked for correction. Nothing was published.";
     }else{
      const rows=data.records||[];
      const lgas=[...new Set(rows.map(x=>String(x.local_government_area||"").trim()).filter(Boolean))].sort();
      const normName=v=>String(v||"").toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").replace(/\\b(hospital|clinic|health|centre|center|maternity|home|medical|general)\\b/g," ").replace(/[^a-z0-9]+/g," ").trim().replace(/\\s+/g," ");
      const distanceM=(a,b)=>{if(!Number.isFinite(Number(a.latitude))||!Number.isFinite(Number(a.longitude))||!Number.isFinite(Number(b.latitude))||!Number.isFinite(Number(b.longitude)))return Infinity;const rad=v=>v*Math.PI/180,lat1=rad(Number(a.latitude)),lat2=rad(Number(b.latitude)),dlat=lat2-lat1,dlon=rad(Number(b.longitude)-Number(a.longitude)),h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
      const duplicateReasons=new Map();
      for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
       const a=rows[i],b=rows[j],na=normName(a.public_name),nb=normName(b.public_name);
       const sameArea=String(a.state||selectedState).toLowerCase()===String(b.state||selectedState).toLowerCase()&&String(a.local_government_area||"").toLowerCase()===String(b.local_government_area||"").toLowerCase();
       const metres=distanceM(a,b),sameName=na.length>=5&&na===nb;
       const sameIdentifier=String(a.nhfr_uid||"").trim()&&String(a.nhfr_uid||"").trim()===String(b.nhfr_uid||"").trim();
       if((sameName&&sameArea&&(metres<=500||!Number.isFinite(metres)))||sameIdentifier){
        const reason=sameIdentifier?"Same NHFR UID — verify; identifier alone is not proof":metres<=500?"Similar facility name and coordinates within "+Math.round(metres)+" m":"Same normalized name and administrative area";
        duplicateReasons.set(i,reason);duplicateReasons.set(j,reason);
       }
      }
      const duplicateCount=duplicateReasons.size;
      message.textContent=selectedState+" preview complete: "+(data.matching_record_count??rows.length)+" matching records; showing "+rows.length+". "+lgas.length+" distinct LGAs represented. "+data.state_label_match_count+" passed state-label screening; "+data.coordinate_valid_count+" have coordinates. "+duplicateCount+" records flagged for possible duplicate review. Flags are suggestions only; no records merged or changed. No records imported.";
      $("grid3PreviewRows").innerHTML=rows.map((x,i)=>'<tr><td>'+esc(x.public_name)+'</td><td>'+esc([x.local_government_area,x.ward].filter(Boolean).join(" / "))+'</td><td>'+esc([x.ownership,x.facility_level].filter(Boolean).join(" / "))+'</td><td>'+esc((x.latitude??"—")+", "+(x.longitude??"—"))+'</td><td>'+esc(x.nhfr_uid||x.nhfr_facility_code||x.source_record_id)+'</td><td>'+ (duplicateReasons.has(i)?'<strong>Review candidate</strong><br><small>'+esc(duplicateReasons.get(i))+'</small>':'No match found in this preview')+'</td></tr>').join("")||'<tr><td colspan="6">No facilities returned.</td></tr>';
     }
    }catch(e){
     message.textContent=e.message||"GRID3 operation failed. Check administrator access and try again.";
     if(action!=="stage_for_review")$("grid3PreviewRows").innerHTML='<tr><td colspan="5">No preview results.</td></tr>';
    }finally{
     if(previewButton)previewButton.disabled=false;if(stageButton)stageButton.disabled=false;
    }
   };
   $("grid3PreviewButton").addEventListener("click",e=>runGrid3("preview",e.currentTarget));
   $("grid3EnableSourceButton").addEventListener("click",async e=>{
    const button=e.currentTarget;
    if(!confirm("Enable the approved GRID3 Nigeria Health Facilities v2.0 source for controlled ingestion into restricted manual review? This does not verify hospitals or publish public listings. You can stop future ingestion by disabling the source in Platform Directory Admin."))return;
    button.disabled=true;
    try{
     const result=await call("POST",{action:"enable_source",source_id:"8476094d-07bd-47d0-8987-2aa41661f1a1"});
     say(result.message||"GRID3 v2.0 source enabled for restricted staging.");
     alert("GRID3 v2.0 source enabled. Facilities remain unverified and restricted to manual review.");
    }catch(error){say(error.message||"Could not enable GRID3 source.",true);alert(error.message||"Could not enable GRID3 source.");}
    finally{button.disabled=false;}
   });
   $("grid3PermissionReviewButton").addEventListener("click",async e=>{
    const button=e.currentTarget;
    const approved=confirm("Review the exact GRID3 Nigeria Health Facilities v2.0 ArcGIS metadata: CC BY 4.0 permits reuse with attribution. Dataset records are non-exhaustive and not fully validated. Do you approve this exact v2.0 dataset for controlled ingestion into restricted manual review only? This does not verify hospitals or publish listings.");
    if(!approved)return;
    button.disabled=true;
    try{
     const notes="Reviewed exact GRID3 NGA Health Facilities v2.0 ArcGIS item metadata (DOI 10.7916/kv1n-0743). CC BY 4.0 permits reuse with clear attribution. Approval is limited to v2.0 controlled ingestion into restricted manual review; records remain provisional and unverified. Does not cover v3.0 or authorise public publication.";
     const result=await call("POST",{action:"review_source_permission",source_id:"8476094d-07bd-47d0-8987-2aa41661f1a1",decision:"approved",permission_evidence_url:"https://www.arcgis.com/home/item.html?id=081506afb7f14af1a3f64130343a6a6a",permission_review_notes:notes});
     say(result.message||"GRID3 v2.0 permission review recorded. Source remains disabled.");
     alert("Permission review recorded. The source is still disabled. A separate enable action is required before any staging.");
    }catch(error){say(error.message||"Permission review failed.",true);alert(error.message||"Permission review failed.");}
    finally{button.disabled=false;}
   });

   $("grid3ReconcileButton").addEventListener("click",async e=>{
    const button=e.currentTarget,message=$("grid3ReconcileMessage"),rows=$("grid3ReconcileRows");
    button.disabled=true;message.textContent="Reading all restricted GRID3 staging records and comparing directory totals…";
    rows.innerHTML='<tr><td colspan="5">Reconciling…</td></tr>';
    try{
     const {data,error}=await client.functions.invoke("healthos-grid3-hospital-collector",{body:{action:"reconciliation_summary"}});
     if(error)throw error;if(data?.error)throw Error(data.error+(data.details?": "+data.details:""));
     rows.innerHTML=(data.by_state||[]).map(x=>'<tr><td>'+esc(x.state)+'</td><td>'+Number(x.staged_records||0)+'</td><td>'+Number(x.review_required||0)+'</td><td>'+Number(x.needs_correction||0)+'</td><td>'+Number(x.with_coordinates||0)+'</td></tr>').join("")||'<tr><td colspan="5">No staged records.</td></tr>';
     message.textContent="Reconciliation complete: "+Number(data.staged_record_count||0).toLocaleString()+" restricted staged records; "+Number(data.current_directory_record_count||0).toLocaleString()+" current directory records; "+Number(data.exact_uid_duplicate_groups_within_staging||0)+" repeated NHFR UID groups ("+Number(data.records_in_repeated_uid_groups||0)+" records flagged); "+Number(data.missing_coordinate_count||0)+" missing coordinates; "+Number(data.missing_name_count||0)+" missing names. "+data.notice;
    }catch(error){
     rows.innerHTML='<tr><td colspan="5">Reconciliation failed.</td></tr>';
     message.textContent=error.message||"Could not complete reconciliation.";
    }finally{button.disabled=false;}
   });
   $("grid3CoverageButton").addEventListener("click",async e=>{
    const button=e.currentTarget,message=$("grid3CoverageMessage"),rows=$("grid3CoverageRows");
    button.disabled=true;message.textContent="Requesting read-only nationwide GRID3 coverage summary…";
    rows.innerHTML='<tr><td colspan="2">Loading coverage report…</td></tr>';
    try{
     const {data,error}=await client.functions.invoke("healthos-grid3-hospital-collector",{body:{action:"coverage_summary"}});
     if(error)throw error;if(data?.error)throw Error(data.error+(data.details?": "+data.details:""));
     const states=["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
     const normalize=v=>String(v||"").toUpperCase().replace(/FEDERAL CAPITAL TERRITORY|ABUJA/g,"FCT").trim();
     const counts=new Map((data.state_counts||[]).map(x=>[normalize(x.state),Number(x.facility_count||0)]));
     rows.innerHTML=states.map(state=>{const count=counts.get(normalize(state))||0;return '<tr><td>'+esc(state)+'</td><td>'+count+'</td></tr>';}).join("");
     const observed=states.filter(state=>(counts.get(normalize(state))||0)>0).length;
     const missing=states.filter(state=>(counts.get(normalize(state))||0)===0);
     message.textContent="Coverage report complete: "+observed+" of 37 state/FCT areas have records; "+(37-observed)+" have zero records in this dataset. "+Number(data.total_facility_records||0).toLocaleString()+" total records reported. Missing: "+(missing.join(", ")||"None")+". Aggregate report only; no records downloaded, staged or published.";
    }catch(error){
     rows.innerHTML='<tr><td colspan="2">Coverage report failed.</td></tr>';
     message.textContent=error.message||"Could not retrieve the coverage report.";
    }finally{button.disabled=false;}
   });

   const stageButton=$("grid3StageButton");
   const syncGrid3StageAvailability=()=>{
    const selected=$("grid3StateSelect")?.value||"";
    const allowed=Boolean(selected);
    stageButton.disabled=!allowed;
    stageButton.title=allowed?"Stage only the selected state into restricted manual review. Existing source identifiers are deduplicated.":"Select a state before staging.";
    stageButton.textContent=allowed?"Stage "+selected+" records for review":"Select a state to stage";
   };
   $("grid3StateSelect").addEventListener("change",syncGrid3StageAvailability);
   syncGrid3StageAvailability();
   if(stageButton){
    stageButton.addEventListener("click",e=>{
     e.preventDefault();
     e.stopPropagation();
     runGrid3("stage_for_review",stageButton);
    });
   }
   $("osmDryRunButton").addEventListener("click",async()=>{
    const button=$("osmDryRunButton"),area=$("osmCollectionArea").value,selectedState=$("osmStateSelect")?.value||"",isOgun=area==="ogun_state"&&!selectedState;
    if(!isOgun||osmRunState.area!==area)osmRunState={...freshOsmRun(),area};
    if(isOgun&&osmRunState.area==="ogun_state")persistOsmRun();
    // If a previous run exhausted its two retry passes, a new manual run starts fresh retries.
    if(isOgun&&osmRunState.totalTiles!==null&&osmRunState.nextTile>=osmRunState.totalTiles&&osmRunState.failedTiles.size&&osmRunState.retryRound>=2){
      osmRunState.retryRound=0;osmRunState.retryQueue=[];osmRunState.retryCursor=0;
    }
    button.disabled=true;
    const renderRows=()=>{const rows=Array.from(osmRunState.candidates.values());$("osmDryRunRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.public_name)+'</td><td>'+esc(x.raw_tags?.amenity||x.raw_tags?.healthcare||"Unclassified")+'</td><td>'+esc(x.local_government_area||"Unassigned")+'</td><td>'+esc(Number(x.latitude).toFixed(5)+", "+Number(x.longitude).toFixed(5))+'</td><td>'+esc(x.osm_type+"/"+x.osm_id)+'</td></tr>').join("")||'<tr><td colspan="5">No named candidates returned yet.</td></tr>';renderOgunLgaCoverage();};
    const invokeOsmTile=async body=>{
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError)throw Error("Could not retrieve the signed-in session: "+sessionError.message);
      if(!session?.access_token)throw Error("Your administrator session has expired. Sign in again.");
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
      try{
        const response=await fetch(URL+"/functions/v1/healthos-osm-hospital-collector",{
          method:"POST",
          headers:{Authorization:"Bearer "+session.access_token,apikey:KEY,"Content-Type":"application/json"},
          body:JSON.stringify(body),signal:controller.signal
        });
        const data=await response.json().catch(()=>({error:"The Edge Function returned a non-JSON response."}));
        if(!response.ok)throw Error((data.error||"Hospital collector request failed")+" (HTTP "+response.status+")"+(data.detail?" — "+data.detail:""));
        if(data?.error)throw Error(data.error+(data.detail?" — "+data.detail:""));
        return data;
      }catch(error){
        if(error?.name==="AbortError")throw Error("Request timed out after 45 seconds. This tile remains pending and can be retried.");
        throw error;
      }finally{clearTimeout(timer);}
    };
    const errorText=async error=>{let message=error?.message||"Request failed.";if(error?.context instanceof Response){try{const p=await error.context.clone().json();message=p.error||message;if(p.detail)message+=" — "+p.detail;if(p.tile_error)message+=" — "+p.tile_error;}catch(_){}}return message;};
    try{
     if(!isOgun){
      $("osmDryRunMessage").textContent="Searching OpenStreetMap for "+(selectedState||area)+"…";$("osmDryRunRows").innerHTML='<tr><td colspan="5">Searching…</td></tr>';
      const requestBody=selectedState?{state:selectedState,dry_run:true}:{area,dry_run:true};
      const {data,error}=await client.functions.invoke("healthos-osm-hospital-collector",{body:requestBody});
      if(error)throw Error(await errorText(error));if(data?.error)throw Error(data.error);
      const rows=data.candidates||[];osmRunState.candidates=new Map(rows.map(x=>[x.osm_type+"/"+x.osm_id,x]));osmRunState.rawCount=data.raw_map_candidates??data.found??0;osmRunState.insideCount=data.inside_boundary_candidates??osmRunState.rawCount;renderRows();
      $("osmDryRunMessage").textContent="Dry run complete for "+(selectedState||area)+": "+osmRunState.rawCount+" map elements; "+(data.valid_named_candidates??rows.length)+" named candidates. Nothing was imported.";
     }else{
      $("osmDryRunRows").innerHTML='<tr><td colspan="5">Preparing state-wide search…</td></tr>';
      // Faster resumable collection: establish the tile plan once, then process
      // three independent tiles concurrently. Progress is persisted after each batch.
      const processTile=async(tileIndex,endpointAttempt=0)=>{
       try{
        const data=await invokeOsmTile({area,dry_run:true,tile_index:tileIndex,endpoint_attempt:endpointAttempt});
        if(!Number.isInteger(data.tile_summary?.tile_count)||data.tile_summary.tile_count<1){
         return {tileIndex,ok:false,detail:"Collector response did not include a valid tile count.",endpoint:"Supabase Edge Function",status:"invalid_response",discovering:false};
        }
        if(data.tile_summary.tile_index!==tileIndex){
         return {tileIndex,ok:false,detail:"Collector returned a response for a different tile index.",endpoint:data.upstream_endpoint||"Supabase Edge Function",status:"tile_mismatch",discovering:false};
        }
        if(data.tile_failed){
         return {tileIndex,ok:false,detail:data.tile_error||"Upstream request failed",endpoint:data.upstream_endpoint||"Unknown endpoint",status:data.upstream_status??0,discovering:false};
        }
        return {tileIndex,ok:true,data};
       }catch(callError){
        return {tileIndex,ok:false,detail:callError.message||"Request failed",endpoint:"Browser → Supabase Edge Function",status:"request_error",discovering:false};
       }
      };
      const applyTileResult=result=>{
       if(!result.ok){
        osmRunState.failedTiles.set(result.tileIndex,{detail:result.detail,endpoint:result.endpoint,status:result.status});
        return;
       }
       const data=result.data;
       osmRunState.failedTiles.delete(result.tileIndex);
       osmRunState.successTiles.add(result.tileIndex);
       osmRunState.rawCount+=data.raw_map_candidates||0;
       osmRunState.insideCount+=data.inside_boundary_candidates||0;
       (data.candidates||[]).forEach(x=>osmRunState.candidates.set(x.osm_type+"/"+x.osm_id,x));
      };
      // Tile 0 establishes the validated state boundary and total tile count.
      if(osmRunState.totalTiles===null){
       $("osmDryRunMessage").textContent="Ogun discovery: preparing validated tile plan…";
       const first=await processTile(0,0);
       if(!first.ok){
        osmRunState.failedTiles.set(0,{detail:first.detail,endpoint:first.endpoint,status:first.status});
        osmRunState.nextTile=0;
       }else{
        osmRunState.totalTiles=first.data.tile_summary.tile_count;
        applyTileResult(first);
        osmRunState.nextTile=1;
       }
       renderRows();persistOsmRun();
      }
      // Three concurrent requests reduce repeated browser/Edge round trips while
      // keeping public Overpass traffic bounded.
      const BATCH_SIZE=3;
      while(osmRunState.totalTiles!==null){
       let batch=[];
       while(batch.length<BATCH_SIZE&&osmRunState.nextTile<osmRunState.totalTiles){
        batch.push({tileIndex:osmRunState.nextTile++,endpointAttempt:0});
       }
       if(batch.length===0&&osmRunState.failedTiles.size&&osmRunState.retryRound<2){
        osmRunState.retryRound++;
        osmRunState.retryQueue=Array.from(osmRunState.failedTiles.keys());
        osmRunState.retryCursor=0;
        while(batch.length<BATCH_SIZE&&osmRunState.retryCursor<osmRunState.retryQueue.length){
         batch.push({tileIndex:osmRunState.retryQueue[osmRunState.retryCursor++],endpointAttempt:osmRunState.retryRound});
        }
       }
       if(batch.length===0)break;
       $("osmDryRunMessage").textContent="Ogun discovery: processing "+batch.length+" tiles together · "+osmRunState.successTiles.size+" / "+osmRunState.totalTiles+" successful · "+osmRunState.candidates.size+" unique candidates. Please keep this page open.";
       const results=await Promise.all(batch.map(item=>processTile(item.tileIndex,item.endpointAttempt)));
       results.forEach(applyTileResult);
       renderRows();persistOsmRun();
       $("osmDryRunMessage").textContent="Ogun discovery: "+osmRunState.successTiles.size+" / "+osmRunState.totalTiles+" tiles successful · "+osmRunState.failedTiles.size+" pending/failed · "+osmRunState.candidates.size+" unique candidates. No records imported.";
       await new Promise(resolve=>setTimeout(resolve,100));
      }
      const failures=Array.from(osmRunState.failedTiles.entries()).slice(0,4).map(([index,item])=>"tile "+(index+1)+": "+item.status+" — "+item.endpoint+" — "+item.detail).join(" | ");
      $("osmDryRunMessage").textContent=osmRunState.totalTiles===null
       ?"Ogun preview paused: the collector did not return its tile plan. No tile was skipped. Tap Run dry search to retry tile 1. Details: "+(failures||"No response received.")+" No records imported."
       :"Ogun preview "+(osmRunState.failedTiles.size?"partially complete":"complete")+": "+osmRunState.successTiles.size+"/"+osmRunState.totalTiles+" tiles succeeded; "+osmRunState.candidates.size+" unique named candidates from "+osmRunState.insideCount+" in-boundary map elements; "+osmRunState.failedTiles.size+" tiles pending/failed. "+(failures?"First errors: "+failures+". ":"")+(osmRunState.failedTiles.size?"Tap Run dry search to retry remaining tiles. ":"")+"No records imported.";
     }
    }catch(error){renderRows();if(isOgun)persistOsmRun();$("osmDryRunMessage").textContent=(error.message||"Dry run failed.")+(isOgun?" Progress retained on this device. Tap Run dry search to resume.":"");}
    finally{button.disabled=false;}
   });$("directoryImportButton").addEventListener("click",async()=>{try{const records=JSON.parse($("directoryImportJson").value);if(!Array.isArray(records)||!records.length||records.length>500)throw Error("Provide a JSON array containing 1–500 records.");const source_id=$("directoryImportSource").value;if(!source_id)throw Error("No enabled source selected.");const r=await call("POST",{action:"import_batch",source_id,records});say("Imported for review only: "+JSON.stringify(r.result));$("directoryImportJson").value="";await load();}catch(x){say(x.message,true);}});
  client.auth.getSession().then(({data})=>{if(data.session){$("openDirectoryAdminButton").hidden=false;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=false;load();}});
 });
})();