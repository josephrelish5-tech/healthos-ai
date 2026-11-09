/* Stage 5D Part 2X: effectiveness reviews, recurrence prompts and management oversight. */
(function initInvestigationEffectiveness() {
 const refresh=document.getElementById("refreshInvestigationEffectiveness"),message=document.getElementById("investigationEffectivenessMessage"),clustersHost=document.getElementById("investigationRecurrenceClusters"),findingsHost=document.getElementById("investigationEffectivenessFindings");
 if(!refresh||!message||!clustersHost||!findingsHost||refresh.dataset.bound==="1")return;
 refresh.dataset.bound="1";
 const setMessage=(v,e=false)=>{message.textContent=v;message.className=e?"message error":"message";};
 const el=(tag,v,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=v==null?"—":String(v);return n;};
 const authorised=()=>Boolean(managementVerified&&currentClinic?.id&&["owner","admin"].includes(String(currentManagementRole||"").toLowerCase()));
 async function load(){
  if(!authorised()){setMessage("Verified hospital owner or administrator access is required.",true);clustersHost.replaceChildren();findingsHost.replaceChildren();return;}
  refresh.disabled=true;setMessage("Loading action effectiveness, recurrence and management oversight…");
  try{
   const {data,error}=await supabaseClient.rpc("get_hospital_investigation_effectiveness_register",{p_clinic_id:currentClinic.id});
   if(error)throw error;
   if(!data||data.read_only!==true||data.clinic_id!==currentClinic.id||!Array.isArray(data.findings)||!Array.isArray(data.potential_recurrence_clusters))throw new Error("Effectiveness register failed hospital-scope verification.");
   clustersHost.replaceChildren();clustersHost.appendChild(el("h4","Potential recurrence clusters — human review required ("+data.potential_recurrence_clusters.length+")"));
   if(!data.potential_recurrence_clusters.length)clustersHost.appendChild(el("p","No repeated root-cause category and department combinations met the 365-day review threshold.","muted"));
   data.potential_recurrence_clusters.forEach(c=>{
    const box=document.createElement("article");box.className="panel";box.style.margin="8px 0";
    box.appendChild(el("p",c.root_cause_category.replaceAll("_"," ")+" · Department: "+c.accountable_department));
    box.appendChild(el("p",c.finding_count+" independently accepted findings · First: "+new Date(c.first_recorded_at).toLocaleDateString()+" · Latest: "+new Date(c.latest_recorded_at).toLocaleDateString()));
    box.appendChild(el("p",c.review_prompt,"muted"));clustersHost.appendChild(box);
   });
   findingsHost.replaceChildren();findingsHost.appendChild(el("h4","Action effectiveness and management oversight ("+data.findings.length+" findings)"));
   if(!data.findings.length)findingsHost.appendChild(el("p","No findings are currently available for effectiveness monitoring.","muted"));
   data.findings.forEach(f=>{
    const card=document.createElement("article");card.className="panel";card.style.margin="10px 0";
    card.appendChild(el("h4",f.finding_summary));card.appendChild(el("p","Root cause: "+f.root_cause_category.replaceAll("_"," ")+" · Department: "+f.accountable_department));
    (f.actions||[]).forEach(a=>{
     const action=document.createElement("div");action.className="panel";action.style.margin="8px 0";
     action.appendChild(el("p",a.action_description));action.appendChild(el("p","Assigned to: "+(a.assignee_name||"Staff profile")+" · Due: "+(a.due_date||"Not set")+" · Status: "+a.status));
     (a.effectiveness_reviews||[]).forEach(rv=>{
      action.appendChild(el("p","Effectiveness: "+rv.outcome.replaceAll("_"," ")+" · Recurrence: "+rv.recurrence_status.replaceAll("_"," ")+" · Reviewed: "+new Date(rv.reviewed_at).toLocaleString()+" · Reviewer: "+(rv.reviewer_name||"Administrator")));
      action.appendChild(el("p",rv.assessment_note));action.appendChild(el("p","Evidence reviewed: "+rv.evidence_review_note));
      if(rv.next_review_date)action.appendChild(el("p","Next review: "+rv.next_review_date));
     });
     if(a.status==="completed"){
      const assess=document.createElement("button");assess.type="button";assess.className="btn btn-secondary";assess.textContent="Record effectiveness review";
      assess.addEventListener("click",async()=>{
       const outcomes=["effective","partially_effective","ineffective","not_yet_verifiable"];
       const outcome=String(window.prompt("Effectiveness outcome:\n"+outcomes.join(", "),"partially_effective")||"").trim();if(!outcomes.includes(outcome))return;
       const recurrence=["none_observed","recurrence_observed","insufficient_observation"];
       const recurrenceStatus=String(window.prompt("Recurrence assessment:\n"+recurrence.join(", "),"insufficient_observation")||"").trim();if(!recurrence.includes(recurrenceStatus))return;
       const note=window.prompt("Assessment rationale (20–4,000 characters):");if(!note||note.trim().length<20)return;
       const evidence=window.prompt("Evidence reviewed to assess effectiveness (10–3,000 characters):");if(!evidence||evidence.trim().length<10)return;
       const next=window.prompt("Optional next review date YYYY-MM-DD (blank for none):","");if(next&&!/^\d{4}-\d{2}-\d{2}$/.test(next)){setMessage("Use YYYY-MM-DD for the next review date.",true);return;}
       assess.disabled=true;try{
        const result=await supabaseClient.rpc("record_hospital_investigation_action_effectiveness_review",{p_clinic_id:currentClinic.id,p_action_id:a.action_id,p_outcome:outcome,p_recurrence_status:recurrenceStatus,p_assessment_note:note.trim(),p_evidence_review_note:evidence.trim(),p_next_review_date:next||null});
        if(result.error)throw result.error;if(!result.data?.success||!result.data.review_id)throw new Error("Effectiveness review was not confirmed.");
        setMessage("Effectiveness assessment recorded in the append-only review history.");await load();
       }catch(err){setMessage(err?.message||"Effectiveness review failed.",true);assess.disabled=false;}
      });action.appendChild(assess);
     }else action.appendChild(el("p","Effectiveness review becomes available after independent completion verification.","muted"));
     card.appendChild(action);
    });
    (f.oversight_events||[]).forEach(ev=>{
     card.appendChild(el("p","Management decision: "+ev.decision.replaceAll("_"," ")+" · "+(ev.manager_name||"Administrator")+" · "+new Date(ev.recorded_at).toLocaleString()));
     card.appendChild(el("p",ev.management_note));if(ev.next_review_date)card.appendChild(el("p","Next management review: "+ev.next_review_date));
    });
    const oversight=document.createElement("button");oversight.type="button";oversight.className="btn btn-secondary";oversight.textContent="Record management oversight";
    oversight.addEventListener("click",async()=>{
     const decisions=["continue_monitoring","allocate_additional_resources","revise_preventive_plan","reopen_investigation","escalate_governance","close_monitoring"];
     const decision=String(window.prompt("Management decision:\n"+decisions.join(", "),"continue_monitoring")||"").trim();if(!decisions.includes(decision))return;
     const note=window.prompt("Management rationale and direction (20–4,000 characters):");if(!note||note.trim().length<20)return;
     const next=window.prompt("Optional next review date YYYY-MM-DD (blank for none):","");if(next&&!/^\d{4}-\d{2}-\d{2}$/.test(next)){setMessage("Use YYYY-MM-DD for the next review date.",true);return;}
     oversight.disabled=true;try{
      const result=await supabaseClient.rpc("record_hospital_investigation_management_oversight",{p_clinic_id:currentClinic.id,p_finding_id:f.finding_id,p_decision:decision,p_management_note:note.trim(),p_next_review_date:next||null});
      if(result.error)throw result.error;if(!result.data?.success||!result.data.oversight_event_id)throw new Error("Management oversight record was not confirmed.");
      setMessage("Management oversight decision recorded and preserved.");await load();
     }catch(err){setMessage(err?.message||"Management oversight record failed.",true);oversight.disabled=false;}
    });card.appendChild(oversight);findingsHost.appendChild(card);
   });
   setMessage("Loaded "+data.findings.length+" finding(s) and "+data.potential_recurrence_clusters.length+" potential recurrence cluster(s). Clusters require human verification.");
  }catch(err){console.error("Investigation effectiveness register failed",err);setMessage(err?.message||"Effectiveness register could not be loaded.",true);}finally{refresh.disabled=false;}
 }
 refresh.addEventListener("click",()=>void load());window.loadInvestigationEffectivenessRegister=load;
})();
