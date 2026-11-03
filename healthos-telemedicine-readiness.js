(function(){
 "use strict";
 const checks=Array.from(document.querySelectorAll("#telemedicineDashboard .telemedicine-readiness-check"));
 const status=document.getElementById("telemedicineReadinessStatus");
 if(!checks.length||!status)return;
 const update=()=>{
  const done=checks.filter(item=>item.checked).length;
  status.textContent=done+" of "+checks.length+" readiness checks completed. "+(done===checks.length?"Readiness checklist complete; clinician must still verify the actual consent and encounter record.":"Complete the remaining checks before proceeding.");
  status.className="message "+(done===checks.length?"success":"");
 };
 checks.forEach(item=>item.addEventListener("change",update));
 update();
})();