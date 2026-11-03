/* HealthOS AI — central offline connectivity and workflow navigation. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 function refresh(){
  const online=navigator.onLine;
  const net=$("offlineSyncNetwork"); if(net)net.textContent=online?"Online — manual review/sync available":"Offline — local queues only";
  const msg=$("offlineSyncMessage"); if(msg)msg.textContent=online?"Connection restored. Open each module, unlock its encrypted queue, inspect records and explicitly submit for authorised review.":"Network unavailable. Existing encrypted local queues remain on this device; live clinical and pharmacy records are unchanged.";
  document.documentElement.dataset.healthosNetwork=online?"online":"offline";
 }
 function go(id){const el=$(id);if(el){el.scrollIntoView({behavior:"smooth",block:"start"});el.style.outline="2px solid #2563eb";setTimeout(()=>el.style.outline="",1800);}}
 $("offlineSyncGoClinical")?.addEventListener("click",()=>go("offlineEhrWorkspace"));
 $("offlineSyncGoPharmacy")?.addEventListener("click",()=>go("pharmacyOfflineWorkspace"));
 $("offlineSyncRefresh")?.addEventListener("click",refresh);
 window.addEventListener("online",refresh);window.addEventListener("offline",refresh);
 window.addEventListener("healthos:signout",refresh);
 refresh();
})();
