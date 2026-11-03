/* HealthOS AI — read-only patient record intelligence. No diagnosis, writes, or exports. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),button=$("loadPatientRecordIntelligence"),output=$("patientRecordIntelligenceOutput"),message=$("patientRecordIntelligenceMessage");
 if(!button||!output||!message)return;
 const say=(s,bad=false)=>{message.textContent=s;message.className="message"+(bad?" error":" success");};
 const card=(title,items)=>{const box=document.createElement("section");box.className="stat-card";const h=document.createElement("h4");h.textContent=title;box.appendChild(h);if(!items.length){const p=document.createElement("p");p.className="muted";p.textContent="No records available.";box.appendChild(p);}items.forEach(item=>{const p=document.createElement("p");p.textContent=item;box.appendChild(p);});return box;};
 const fmt=v=>v?new Date(v).toLocaleString():"—";
 button.addEventListener("click",async()=>{
  const patientId=$("patientSharePatient")?.value;
  if(!patientId){say("Select a patient first.",true);return;}
  if(!window.supabaseClient||!window.currentClinic){say("An authenticated clinic session is required.",true);return;}
  button.disabled=true;output.replaceChildren();say("Loading clinic-authorised records…");
  try{
   const db=window.supabaseClient,clinicId=window.currentClinic.id;
   const [pr,er,ar]=await Promise.all([
    db.from("patients").select("id,patient_number,first_name,last_name,date_of_birth,sex").eq("clinic_id",clinicId).eq("id",patientId).maybeSingle(),
    db.from("clinical_encounters").select("id,encounter_number,encounter_type,status,chief_complaint,started_at").eq("clinic_id",clinicId).eq("patient_id",patientId).order("started_at",{ascending:false}).limit(50),
    db.from("patient_allergies").select("allergen,reaction,severity,status,created_at").eq("clinic_id",clinicId).eq("patient_id",patientId).order("created_at",{ascending:false}).limit(100)
   ]);
   for(const r of [pr,er,ar])if(r.error)throw r.error;if(!pr.data)throw new Error("Patient record not found in this clinic.");
   const ids=(er.data||[]).map(e=>e.id);let notes=[],vitals=[];
   if(ids.length){const [nr,vr]=await Promise.all([
    db.from("clinical_notes").select("encounter_id,note_type,note_text,status,signed_at,created_at").eq("clinic_id",clinicId).in("encounter_id",ids).eq("status","signed").order("created_at",{ascending:false}).limit(100),
    db.from("patient_vitals").select("encounter_id,temperature_c,systolic_bp,diastolic_bp,pulse_bpm,respiratory_rate,oxygen_saturation,weight_kg,height_cm,pain_score,recorded_at").eq("clinic_id",clinicId).eq("patient_id",patientId).in("encounter_id",ids).order("recorded_at",{ascending:false}).limit(50)
   ]);for(const r of [nr,vr])if(r.error)throw r.error;notes=nr.data||[];vitals=vr.data||[];}
   const p=pr.data;
   output.appendChild(card("Patient identity",[[p.patient_number,p.first_name,p.last_name].filter(Boolean).join(" — "),"Date of birth: "+(p.date_of_birth||"Not recorded"),"Sex: "+(p.sex||"Not recorded")]));
   output.appendChild(card("Encounter history",(er.data||[]).map(e=>[e.encounter_number,e.encounter_type,e.status,e.chief_complaint,fmt(e.started_at)].filter(Boolean).join(" · "))));
   output.appendChild(card("Signed clinical notes",notes.map(n=>fmt(n.signed_at||n.created_at)+" · "+n.note_type+" · "+n.note_text.slice(0,700))));
   output.appendChild(card("Recorded observations",vitals.map(v=>[fmt(v.recorded_at),v.temperature_c!=null?"Temp "+v.temperature_c+" °C":null,v.systolic_bp!=null?"BP "+v.systolic_bp+"/"+v.diastolic_bp:null,v.pulse_bpm!=null?"Pulse "+v.pulse_bpm:null,v.respiratory_rate!=null?"Resp. "+v.respiratory_rate:null,v.oxygen_saturation!=null?"SpO₂ "+v.oxygen_saturation+"%":null,v.weight_kg!=null?"Weight "+v.weight_kg+" kg":null,v.height_cm!=null?"Height "+v.height_cm+" cm":null,v.pain_score!=null?"Pain "+v.pain_score+"/10":null].filter(Boolean).join(" · "))));
   output.appendChild(card("Allergy register",(ar.data||[]).map(a=>[a.allergen,a.reaction,a.severity,a.status].filter(Boolean).join(" · "))));
   say("Overview loaded. Only signed notes are shown. Confirm all information in the source clinical record before care decisions.");
  }catch(e){console.error("Patient record intelligence:",e);say("Could not load overview: "+(e.message||"Check permissions and record availability."),true);}
  finally{button.disabled=false;}
 });
 console.log("HealthOS patient record intelligence initialised.");
})();