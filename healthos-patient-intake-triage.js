/* HealthOS AI — patient intake and triage support. Staff-facing summary only; no diagnosis or automatic priority. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),button=$("composePatientIntake"),note=$("queueTriageNote"),message=$("patientIntakeSafetyMessage");
 if(!button||!note||!message)return;
 button.addEventListener("click",()=>{
  const reason=($("queueVisitReason")?.value||"").trim();
  if(!reason){message.textContent="Enter the patient's reason for visit first.";message.className="message error";return;}
  const duration=($("intakeSymptomDuration")?.value||"").trim();
  const warnings=[...document.querySelectorAll(".intake-warning:checked")].map(x=>x.value);
  const lines=["INTAKE SUMMARY (staff-prepared; verify with patient):","Reason for visit: "+reason];
  if(duration)lines.push("Symptom duration: "+duration);
  lines.push("Reported warning signs: "+(warnings.length?warnings.join("; "):"None selected — this does not rule out an emergency."));
  lines.push("Disposition: Staff/qualified clinician to assess and determine priority. This tool does not diagnose or assign triage priority.");
  note.value=[note.value.trim(),lines.join("\n")].filter(Boolean).join("\n\n").slice(0,1000);
  if(warnings.length){message.textContent="WARNING SIGN(S) SELECTED: "+warnings.join("; ")+". Alert an onsite clinician immediately and follow hospital emergency protocol. Do not wait for this tool.";message.className="message error";}
  else{message.textContent="Summary prepared for staff review. Absence of selected warning signs does not establish that the patient is safe or routine.";message.className="message success";}
 });
 console.log("HealthOS patient intake and triage support initialised.");
})();