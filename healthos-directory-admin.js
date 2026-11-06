// Restricted HealthOS platform hospital-directory administration.
(() => {
 const URL="https://berfmuhqfuwcgpnqxrtm.supabase.co";
 const KEY="sb_publishable_UIhbdxfxl8jsU9KnIE93pg_HTEsU39C";
 const ENDPOINT=URL+"/functions/v1/healthos-hospital-directory-admin";
 let client, sources=[];
  let osmRunState={area:null,nextTile:0,totalTiles:null,candidates:new Map(),failedTiles:new Map(),rawCount:0,insideCount:0,retryRound:0,retryQueue:[],retryCursor:0,successTiles:new Set()};
 const $=id=>document.getElementById(id);
 const say=(s,bad=false)=>{const e=$("directoryAdminMessage");e.textContent=s;e.className="message "+(bad?"error":"success");};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function call(method="GET",body){
  const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token)throw Error("Sign in with the authorised platform administrator account.");
  const r=await fetch(ENDPOINT,{method,headers:{Authorization:"Bearer "+session.access_token,apikey:KEY,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>({error:"Invalid response"}));if(!r.ok){const err=new Error(d.error||"Request failed");err.code=d.code||("HTTP_"+r.status);throw err;}return d;
 }
 async function load(){
  try{
   const d=await call();sources=(d.sources||[]);$("platformDirectoryAdmin").hidden=false;$("openDirectoryAdminButton").hidden=false;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=false;
   $("directorySourceRows").innerHTML=sources.map(s=>'<tr><td>'+esc(s.source_name)+'</td><td>'+esc(s.source_type)+'</td><td>'+esc(s.data_license)+'<br><small>'+esc(s.permission_basis)+'</small></td><td>'+(s.is_enabled?"Enabled":"Disabled")+'</td><td>'+(s.is_enabled?"—":'<button class="logout-button" data-enable="'+esc(s.id)+'">Enable</button>')+'</td></tr>').join("")||'<tr><td colspan="5">No sources registered.</td></tr>';
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
  $("openDirectoryAdminButton").addEventListener("click",()=>{$("platformDirectoryAdmin").hidden=false;$("platformDirectoryAdmin").scrollIntoView({behavior:"smooth"});load();});
  const directoryNav=$("platformDirectoryAdminNav");if(directoryNav)directoryNav.addEventListener("click",e=>{e.preventDefault();$("openDirectoryAdminButton").click();});
  $("directoryAdminClose").addEventListener("click",()=>{$("platformDirectoryAdmin").hidden=true;});
  client.auth.onAuthStateChange((event,session)=>{if(session){$("openDirectoryAdminButton").hidden=false;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=false;load();}else{$("openDirectoryAdminButton").hidden=true;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=true;$("platformDirectoryAdmin").hidden=true;}});
  $("directorySourceForm").addEventListener("submit",async e=>{e.preventDefault();try{await call("POST",{action:"register_source",source_name:$("directorySourceName").value,source_type:$("directorySourceType").value,source_website:$("directorySourceWebsite").value,data_license:$("directorySourceLicense").value,permission_basis:$("directorySourcePermission").value,country_code:"NG"});e.target.reset();say("Source registered disabled. Verify its permission before enabling.");await load();}catch(x){say(x.message,true);}});
  $("platformDirectoryAdmin").addEventListener("click",async e=>{try{
   const en=e.target.closest("[data-enable]"),rv=e.target.closest("[data-review]");
   if(en){if(!confirm("Have you verified the licence and legal permission for public use?"))return;await call("POST",{action:"enable_source",source_id:en.dataset.enable});say("Source enabled.");await load();}
   if(rv){const reason=prompt("Enter the reason for this review decision:");if(!reason?.trim())return;await call("POST",{action:"review_listing",listing_id:rv.dataset.review,decision:rv.dataset.decision,reason});say("Decision recorded.");await load();}
  }catch(x){say(x.message,true);}});
  const runGrid3=async(action,button)=>{
    button.disabled=true;
    const previewButton=$("grid3PreviewButton"),stageButton=$("grid3StageButton");
    if(previewButton)previewButton.disabled=true;if(stageButton)stageButton.disabled=true;
    const message=$("grid3PreviewMessage");
    message.textContent=action==="stage_for_review"?"Retrieving Ogun records and staging them in the restricted manual-review queue…":"Querying GRID3 facilities across Ogun State…";
    if(action!=="stage_for_review")$("grid3PreviewRows").innerHTML='<tr><td colspan="5">Loading preview…</td></tr>';
    try{
     const {data,error}=await client.functions.invoke("healthos-grid3-hospital-collector",{body:{action}});
     if(error)throw error;if(data?.error)throw Error(data.error+(data.details?": "+data.details:""));
     if(action==="stage_for_review"){
      message.textContent="Staging complete: "+data.newly_staged_count+" new records added to restricted manual review. "+data.unique_record_count+" unique records retrieved; "+data.coordinate_valid_count+" have coordinates. Nothing was published.";
     }else{
      const rows=data.records||[];
      const lgas=[...new Set(rows.map(x=>String(x.local_government_area||"").trim()).filter(Boolean))].sort();
      message.textContent="Preview complete: "+(data.matching_record_count??rows.length)+" matching records; showing "+rows.length+". "+lgas.length+" distinct LGAs represented. "+data.coordinate_valid_count+" records have valid coordinates. No records imported.";
      $("grid3PreviewRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.public_name)+'</td><td>'+esc([x.local_government_area,x.ward].filter(Boolean).join(" / "))+'</td><td>'+esc([x.ownership,x.facility_level].filter(Boolean).join(" / "))+'</td><td>'+esc((x.latitude??"—")+", "+(x.longitude??"—"))+'</td><td>'+esc(x.nhfr_uid||x.nhfr_facility_code||x.source_record_id)+'</td></tr>').join("")||'<tr><td colspan="5">No facilities returned.</td></tr>';
     }
    }catch(e){
     message.textContent=e.message||"GRID3 operation failed. Check administrator access and try again.";
     if(action!=="stage_for_review")$("grid3PreviewRows").innerHTML='<tr><td colspan="5">No preview results.</td></tr>';
    }finally{
     if(previewButton)previewButton.disabled=false;if(stageButton)stageButton.disabled=false;
    }
   };
   $("grid3PreviewButton").addEventListener("click",e=>runGrid3("preview",e.currentTarget));
   const stageButton=$("grid3StageButton");
   if(stageButton){
    stageButton.addEventListener("click",e=>{
     e.preventDefault();
     e.stopPropagation();
     runGrid3("stage_for_review",stageButton);
    });
   }
   $("osmDryRunButton").addEventListener("click",async()=>{
    const button=$("osmDryRunButton"),area=$("osmCollectionArea").value,isOgun=area==="ogun_state";
    if(!isOgun||osmRunState.area!==area)osmRunState={area,nextTile:0,totalTiles:null,candidates:new Map(),failedTiles:new Map(),rawCount:0,insideCount:0,retryRound:0,retryQueue:[],retryCursor:0,successTiles:new Set()};
    // If a previous run exhausted its two retry passes, a new manual run starts fresh retries.
    if(isOgun&&osmRunState.totalTiles!==null&&osmRunState.nextTile>=osmRunState.totalTiles&&osmRunState.failedTiles.size&&osmRunState.retryRound>=2){
      osmRunState.retryRound=0;osmRunState.retryQueue=[];osmRunState.retryCursor=0;
    }
    button.disabled=true;
    const renderRows=()=>{const rows=Array.from(osmRunState.candidates.values());$("osmDryRunRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.public_name)+'</td><td>'+esc(x.raw_tags?.amenity||x.raw_tags?.healthcare||"Unclassified")+'</td><td>'+esc(Number(x.latitude).toFixed(5)+", "+Number(x.longitude).toFixed(5))+'</td><td>'+esc(x.osm_type+"/"+x.osm_id)+'</td></tr>').join("")||'<tr><td colspan="4">No named candidates returned yet.</td></tr>';};
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
      $("osmDryRunMessage").textContent="Searching OpenStreetMap…";$("osmDryRunRows").innerHTML='<tr><td colspan="4">Searching…</td></tr>';
      const {data,error}=await client.functions.invoke("healthos-osm-hospital-collector",{body:{area,dry_run:true}});
      if(error)throw Error(await errorText(error));if(data?.error)throw Error(data.error);
      const rows=data.candidates||[];osmRunState.candidates=new Map(rows.map(x=>[x.osm_type+"/"+x.osm_id,x]));osmRunState.rawCount=data.raw_map_candidates??data.found??0;osmRunState.insideCount=data.inside_boundary_candidates??osmRunState.rawCount;renderRows();
      $("osmDryRunMessage").textContent="Dry run complete: "+osmRunState.rawCount+" map elements; "+(data.valid_named_candidates??rows.length)+" named candidates. Nothing was imported.";
     }else{
      $("osmDryRunRows").innerHTML='<tr><td colspan="4">Preparing state-wide search…</td></tr>';
      while(true){
       let tileIndex,endpointAttempt=0,discoveringTileCount=osmRunState.totalTiles===null;
       if(discoveringTileCount){
        // Until the first valid collector response gives us the tile count, only request tile 0.
        tileIndex=0;osmRunState.nextTile=1;
       }else if(osmRunState.nextTile<osmRunState.totalTiles){
        tileIndex=osmRunState.nextTile++;
       }else if(osmRunState.failedTiles.size&&osmRunState.retryRound<2){
        if(osmRunState.retryCursor>=osmRunState.retryQueue.length){
         osmRunState.retryRound++;osmRunState.retryQueue=Array.from(osmRunState.failedTiles.keys());osmRunState.retryCursor=0;
        }
        if(osmRunState.retryRound>2||osmRunState.retryCursor>=osmRunState.retryQueue.length)break;
        tileIndex=osmRunState.retryQueue[osmRunState.retryCursor++];endpointAttempt=osmRunState.retryRound;
       }else break;
       $("osmDryRunMessage").textContent="Ogun discovery: tile "+(tileIndex+1)+" / "+(osmRunState.totalTiles??"establishing tile plan")+(endpointAttempt?" · retry "+endpointAttempt+"/2":"")+" · "+osmRunState.candidates.size+" unique candidates. Please keep this page open.";
       let data;
       try{
        data=await invokeOsmTile({area,dry_run:true,tile_index:tileIndex,endpoint_attempt:endpointAttempt});
       }catch(callError){
        osmRunState.failedTiles.set(tileIndex,{detail:callError.message||"Request failed",endpoint:"Browser → Supabase Edge Function",status:"request_error"});
        if(discoveringTileCount)osmRunState.nextTile=0;
        renderRows();
        if(discoveringTileCount)break;
        continue;
       }
       if(!Number.isInteger(data.tile_summary?.tile_count)||data.tile_summary.tile_count<1){
        osmRunState.failedTiles.set(tileIndex,{detail:"Collector response did not include a valid tile count.",endpoint:"Supabase Edge Function",status:"invalid_response"});
        if(discoveringTileCount)osmRunState.nextTile=0;
        renderRows();
        if(discoveringTileCount)break;
        continue;
       }
       if(osmRunState.totalTiles===null)osmRunState.totalTiles=data.tile_summary.tile_count;
       if(data.tile_summary.tile_index!==tileIndex){
        osmRunState.failedTiles.set(tileIndex,{detail:"Collector returned a response for a different tile index.",endpoint:data.upstream_endpoint||"Supabase Edge Function",status:"tile_mismatch"});
       }else if(data.tile_failed){
        osmRunState.failedTiles.set(tileIndex,{detail:data.tile_error||"Upstream request failed",endpoint:data.upstream_endpoint||"Unknown endpoint",status:data.upstream_status??0});
       }else{
        osmRunState.failedTiles.delete(tileIndex);osmRunState.successTiles.add(tileIndex);
        osmRunState.rawCount+=data.raw_map_candidates||0;osmRunState.insideCount+=data.inside_boundary_candidates||0;
        (data.candidates||[]).forEach(x=>osmRunState.candidates.set(x.osm_type+"/"+x.osm_id,x));
       }
       renderRows();
       $("osmDryRunMessage").textContent="Ogun discovery: "+osmRunState.successTiles.size+" / "+osmRunState.totalTiles+" tiles successful · "+osmRunState.failedTiles.size+" pending/failed · "+osmRunState.candidates.size+" unique candidates"+(endpointAttempt?" · retry pass "+endpointAttempt+"/2":"")+". No records imported.";
       await new Promise(resolve=>setTimeout(resolve,180));
      }
      const failures=Array.from(osmRunState.failedTiles.entries()).slice(0,4).map(([index,item])=>"tile "+(index+1)+": "+item.status+" — "+item.endpoint+" — "+item.detail).join(" | ");
      $("osmDryRunMessage").textContent=osmRunState.totalTiles===null
       ?"Ogun preview paused: the collector did not return its tile plan. No tile was skipped. Tap Run dry search to retry tile 1. Details: "+(failures||"No response received.")+" No records imported."
       :"Ogun preview "+(osmRunState.failedTiles.size?"partially complete":"complete")+": "+osmRunState.successTiles.size+"/"+osmRunState.totalTiles+" tiles succeeded; "+osmRunState.candidates.size+" unique named candidates from "+osmRunState.insideCount+" in-boundary map elements; "+osmRunState.failedTiles.size+" tiles pending/failed. "+(failures?"First errors: "+failures+". ":"")+(osmRunState.failedTiles.size?"Tap Run dry search to retry remaining tiles. ":"")+"No records imported.";
     }
    }catch(error){renderRows();$("osmDryRunMessage").textContent=(error.message||"Dry run failed.")+(isOgun?" Progress retained. Tap Run dry search to resume.":"");}
    finally{button.disabled=false;}
   });$("directoryImportButton").addEventListener("click",async()=>{try{const records=JSON.parse($("directoryImportJson").value);if(!Array.isArray(records)||!records.length||records.length>500)throw Error("Provide a JSON array containing 1–500 records.");const source_id=$("directoryImportSource").value;if(!source_id)throw Error("No enabled source selected.");const r=await call("POST",{action:"import_batch",source_id,records});say("Imported for review only: "+JSON.stringify(r.result));$("directoryImportJson").value="";await load();}catch(x){say(x.message,true);}});
  client.auth.getSession().then(({data})=>{if(data.session){$("openDirectoryAdminButton").hidden=false;const nav=$("platformDirectoryAdminNav");if(nav)nav.hidden=false;load();}});
 });
})();