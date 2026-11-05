/* HealthOS AI — Google Maps-style hospital discovery using Leaflet + CARTO/OSM. */
(function () {
  "use strict";
  let map = null;
  let markers = [];
  let userMarker = null;
  let accuracyCircle = null;
  let watchId = null;
  let lastHospitals = [];
  const defaultCenter = [6.6018, 3.3515]; // Ikeja, Lagos
  function el(id) { return document.getElementById(id); }
  function escapeText(value) { return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function setStatus(message) { const node=el("hospitalMapStatus"); if(node) node.textContent=message; }
  function directionsUrl(h) {
    const destination = h.latitude != null && h.longitude != null ? h.latitude + "," + h.longitude :
      [h.hospital_name,h.address,h.city,h.state,h.country_code].filter(Boolean).join(", ");
    // Google Maps Directions URLs work without a Maps API key or billing account.
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination) + "&travelmode=driving";
  }
  function selectHospital(hospitalId) {
    const h=lastHospitals.find(x=>String(x.hospital_id)===String(hospitalId));
    if(!h) return;
    if(map && h.latitude!=null && h.longitude!=null) map.flyTo([Number(h.latitude),Number(h.longitude)],16,{duration:0.8});
    markers.forEach(item=>{ if(String(item.hospitalId)===String(hospitalId)) item.marker.openPopup(); else item.marker.closePopup(); });
    document.querySelectorAll("[data-hospital-card]").forEach(card=>card.classList.toggle("hospital-card-selected",card.dataset.hospitalCard===String(hospitalId)));
  }
  function renderCards(hospitals) {
    const target=el("patientHospitalResults"); if(!target) return;
    target.replaceChildren();
    if(!hospitals.length) {
      const empty=document.createElement("div"); empty.className="hospital-map-empty";
      empty.innerHTML="<strong>No hospitals found in this search area</strong><p>Try a wider search area or another location.</p>";
      target.appendChild(empty); return;
    }
    [{key:"network",title:"HealthOS AI Network Hospitals"},{key:"other",title:"Other Hospitals Near You"}].forEach(group=>{
      const items=hospitals.filter(h=>(h.listing_group||"network")===group.key); if(!items.length) return;
      const section=document.createElement("section"); section.className="hospital-discovery-group";
      const heading=document.createElement("h2"); heading.textContent=group.title; section.appendChild(heading);
      items.forEach(h=>{
        const card=document.createElement("article"); card.className="hospital-discovery-card"; card.dataset.hospitalCard=h.hospital_id;
        const title=document.createElement("h3"); title.textContent=h.hospital_name||"Hospital";
        const badge=document.createElement("span"); badge.className="hospital-verified-badge"; badge.textContent=group.key==="network"?"HealthOS AI member":"Nearby hospital";
        const address=document.createElement("p"); address.textContent=[h.address,h.local_government_area,h.city,h.state,h.country_code].filter(Boolean).join(", ")||"Address not provided";
        const distance=document.createElement("p"); distance.className="hospital-distance"; distance.textContent=h.distance_km==null?"Distance unavailable":Number(h.distance_km).toFixed(1)+" km away";
        const specialty=document.createElement("p"); specialty.textContent="Specialties: "+((h.specialties||[]).join(", ")||"Not listed");
        const services=document.createElement("p"); services.textContent="Services: "+((h.public_services||[]).join(", ")||"Contact hospital for details");
        const rating=document.createElement("p"); rating.className="hospital-review-summary";
        const reviewCount=Number(h.review_count||0), average=Number(h.average_rating||0);
        rating.textContent=reviewCount>0 ? "Patient rating: "+average.toFixed(1)+" / 5 ("+reviewCount+" published review"+(reviewCount===1?"":"s")+")" : "No published patient reviews yet";
        const actions=document.createElement("div"); actions.className="hospital-card-actions";
        const show=document.createElement("button"); show.type="button"; show.className="secondary-button"; show.textContent="Show on map"; show.addEventListener("click",()=>selectHospital(h.hospital_id));
        const directions=document.createElement("a"); directions.className="primary-button"; directions.href=directionsUrl(h); directions.target="_blank"; directions.rel="noopener noreferrer"; directions.textContent="Open in Google Maps";
        actions.append(show,directions);
        // Public contact links are shown only when the hospital has supplied them.
        const contactLinks=[];
        const phone=String(h.public_phone||"").trim();
        const emergencyPhone=String(h.emergency_phone||"").trim();
        const email=String(h.public_email||"").trim();
        const website=String(h.website_url||"").trim();
        const safePhone=value=>value.replace(/[^+0-9*#,;]/g,"");
        if(phone && safePhone(phone)){
          const call=document.createElement("a"); call.className="secondary-button"; call.href="tel:"+safePhone(phone); call.textContent="Call hospital"; contactLinks.push(call);
        }
        if(emergencyPhone && safePhone(emergencyPhone)){
          const emergency=document.createElement("a"); emergency.className="secondary-button"; emergency.href="tel:"+safePhone(emergencyPhone); emergency.textContent="Call emergency line"; contactLinks.push(emergency);
        }
        if(email && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){
          const mail=document.createElement("a"); mail.className="secondary-button"; mail.href="mailto:"+email; mail.textContent="Email hospital"; contactLinks.push(mail);
        }
        if(website){
          try{
            const siteUrl=new URL(website);
            if(siteUrl.protocol==="https:"||siteUrl.protocol==="http:"){
              const site=document.createElement("a"); site.className="secondary-button"; site.href=siteUrl.href; site.target="_blank"; site.rel="noopener noreferrer"; site.textContent="Hospital website"; contactLinks.push(site);
            }
          }catch(_){}
        }
        contactLinks.forEach(link=>actions.appendChild(link));
        if(h.connection_available){const connect=document.createElement("button");connect.type="button";connect.className="secondary-button";connect.textContent="Request connection";connect.addEventListener("click",()=>{if(typeof window.requestHospitalConnection==="function")window.requestHospitalConnection(h.hospital_id,connect);});actions.appendChild(connect);}
        if(group.key==="network"){
          const reviewToggle=document.createElement("button"); reviewToggle.type="button"; reviewToggle.className="secondary-button"; reviewToggle.textContent="Write a patient review";
          const reviewForm=document.createElement("form"); reviewForm.className="hospital-patient-review-form"; reviewForm.hidden=true;
          const encounterLabel=document.createElement("label"); encounterLabel.textContent="Select your completed visit";
          const encounter=document.createElement("select"); encounter.required=true;
          const initialVisit=document.createElement("option"); initialVisit.value=""; initialVisit.textContent="Loading your completed visits…"; encounter.appendChild(initialVisit); encounterLabel.appendChild(encounter);
          let visitsLoaded=false;
          const loadVisits=async()=>{if(visitsLoaded)return;encounter.replaceChildren();const loading=document.createElement("option");loading.value="";loading.textContent="Loading your completed visits…";encounter.appendChild(loading);try{if(typeof window.loadReviewableHospitalVisits!=="function")throw new Error("Visit lookup is not available. Reload the page.");const visits=await window.loadReviewableHospitalVisits(h.hospital_id);encounter.replaceChildren();const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent=visits.length?"Choose a completed visit":"No eligible completed visits found";encounter.appendChild(placeholder);visits.forEach(visit=>{const option=document.createElement("option");option.value=visit.encounter_id;const date=visit.completed_at?new Date(visit.completed_at).toLocaleDateString():"Date unavailable";option.textContent=(visit.encounter_number||visit.encounter_type||"Completed visit")+" — "+date;encounter.appendChild(option);});visitsLoaded=true;}catch(error){encounter.replaceChildren();const failed=document.createElement("option");failed.value="";failed.textContent=error.message||"Could not load visits";encounter.appendChild(failed);feedback.textContent=failed.textContent;}};
          const ratingLabel=document.createElement("label"); ratingLabel.textContent="Your rating";
          const ratingInput=document.createElement("select"); ratingInput.required=true;
          ["5","4","3","2","1"].forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=value+" — "+({5:"Excellent",4:"Good",3:"Average",2:"Poor",1:"Very poor"}[value]);ratingInput.appendChild(option);}); ratingLabel.appendChild(ratingInput);
          const reviewLabel=document.createElement("label"); reviewLabel.textContent="Your experience";
          const reviewText=document.createElement("textarea"); reviewText.required=true; reviewText.minLength=10; reviewText.maxLength=2000; reviewText.rows=3; reviewText.placeholder="Describe your experience (10–2,000 characters)"; reviewLabel.appendChild(reviewText);
          const submit=document.createElement("button"); submit.type="submit"; submit.className="primary-button"; submit.textContent="Submit for moderation";
          const feedback=document.createElement("p"); feedback.setAttribute("role","status"); feedback.className="muted";
          reviewForm.append(encounterLabel,ratingLabel,reviewLabel,submit,feedback);
          reviewToggle.addEventListener("click",()=>{reviewForm.hidden=!reviewForm.hidden;if(!reviewForm.hidden)loadVisits();});
          reviewForm.addEventListener("submit",async event=>{event.preventDefault();submit.disabled=true;feedback.textContent="Submitting securely…";try{if(typeof window.submitHospitalReview!=="function")throw new Error("Review submission is not available. Please reload.");await window.submitHospitalReview(h.hospital_id,encounter.value.trim(),Number(ratingInput.value),reviewText.value.trim());feedback.textContent="Review submitted. It will appear publicly after moderation.";reviewForm.reset();}catch(error){feedback.textContent=error.message||"Review could not be submitted."; }finally{submit.disabled=false;}});
          actions.appendChild(reviewToggle); card.appendChild(reviewForm);
        }
        card.append(title,badge,address,distance,specialty,services,rating,actions); section.appendChild(card);
      });
      target.appendChild(section);
    });
  }
  function initMap() {
    const node=el("hospitalDiscoveryMap");
    if(!node || !window.L || map) return;
    map=L.map(node,{zoomControl:false,scrollWheelZoom:true,preferCanvas:true}).setView(defaultCenter,12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    L.control.zoom({position:"topright"}).addTo(map);
    drawMarkers(lastHospitals);
  }
  function drawMarkers(hospitals) {
    if(!map||!window.L) return;
    markers.forEach(x=>x.marker.remove()); markers=[];
    const bounds=[];
    hospitals.forEach(h=>{
      if(h.latitude==null||h.longitude==null) return;
      const lat=Number(h.latitude),lng=Number(h.longitude); if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;
      const marker=L.marker([lat,lng]).addTo(map);
      marker.bindPopup("<strong>"+escapeText(h.hospital_name)+"</strong><br>"+escapeText([h.city,h.state].filter(Boolean).join(", "))+(h.distance_km==null?"":"<br>"+Number(h.distance_km).toFixed(1)+" km away"));
      marker.on("click",()=>selectHospital(h.hospital_id)); markers.push({marker,hospitalId:h.hospital_id}); bounds.push([lat,lng]);
    });
    if(bounds.length) map.fitBounds(bounds,{padding:[35,35],maxZoom:14});
  }
  function showUserLocation(lat,lng,accuracy) {
    if(!map||!window.L) return;
    const point=[lat,lng];
    const icon=L.divIcon({className:"healthos-user-location-icon",html:'<span class="healthos-user-location-dot"></span>',iconSize:[24,24],iconAnchor:[12,12]});
    if(!userMarker) userMarker=L.marker(point,{icon,zIndexOffset:1000,interactive:false}).addTo(map); else userMarker.setLatLng(point);
    if(accuracyCircle) accuracyCircle.remove();
    accuracyCircle=L.circle(point,{radius:Math.max(accuracy||30,20),color:"#4285f4",weight:1,fillColor:"#4285f4",fillOpacity:0.12,interactive:false}).addTo(map);
  }
  async function focusSearchLocation(lat,lng,label) {
    if(!map) initMap(); if(!map) return;
    if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))) {
      const point=[Number(lat),Number(lng)]; map.flyTo(point,15,{duration:0.8});
      setStatus("Map centred on your current location. Searching verified hospitals.");
      return;
    }
    const query=[label,el("hospitalSearchLga")?.value,el("hospitalSearchCity")?.value,el("hospitalSearchState")?.value,"Nigeria"].filter(Boolean).join(", ");
    try {
      const response=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q="+encodeURIComponent(query),{headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error("Location lookup unavailable");
      const results=await response.json();
      if(results.length) { map.flyTo([Number(results[0].lat),Number(results[0].lon)],13,{duration:0.8}); setStatus("Map centred on "+(label||query)+"."); }
      else { map.flyTo(defaultCenter,11,{duration:0.8}); setStatus("Showing Lagos map. No exact map location was returned for this search."); }
    } catch(e) { map.flyTo(defaultCenter,11,{duration:0.8}); setStatus("Showing Lagos map. Location lookup could not complete; you can still move and zoom the map."); }
  }
  function locateUser() {
    if (!navigator.geolocation) {
      setStatus("GPS is not available in this browser. Enter a city, state or LGA to search.");
      return;
    }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    setStatus("Requesting your location. Please allow location access when prompted…");
    const locateButton = el("hospitalMapLocateButton");
    if (locateButton) locateButton.disabled = true;
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude, accuracy } = position.coords;
      showUserLocation(latitude, longitude, accuracy);
      if (!map) initMap();
      if (map) map.flyTo([latitude, longitude], 15, { duration: 0.7 });
      const latInput = el("hospitalSearchLatitude");
      const lngInput = el("hospitalSearchLongitude");
      if (latInput) latInput.value = latitude.toFixed(6);
      if (lngInput) lngInput.value = longitude.toFixed(6);
      setStatus("Your location is shown by the blue dot. GPS accuracy: about " + Math.round(accuracy) + " metres. Now tap Search hospitals.");
      if (locateButton) locateButton.disabled = false;
    }, error => {
      const reason = error && error.code === 1
        ? "Location permission was denied. Allow location access in your browser settings."
        : error && error.code === 3
          ? "GPS timed out. Check that Location is turned on, or search by city, state or LGA."
          : "GPS could not get your position. You can still search by city, state or LGA.";
      setStatus(reason);
      if (locateButton) locateButton.disabled = false;
    }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 });
  }
  function render(hospitals) {
    lastHospitals=Array.isArray(hospitals)?hospitals:[];
    renderCards(lastHospitals); if(!map) initMap(); if(map) drawMarkers(lastHospitals);
    if(lastHospitals.length) setStatus(lastHospitals.length+" verified hospital(s) found. Select a card or map pin to explore.");
    else setStatus("No verified hospitals match this search yet. The map is ready for approved hospital listings.");
  }
  function refresh() { if(!el("hospitalDiscoveryMap")) return; if(!map) initMap(); if(map){map.invalidateSize();drawMarkers(lastHospitals);} }
  window.HealthOSHospitalDiscovery={render,selectHospital,refresh,focusSearchLocation,locateUser};
  document.addEventListener("DOMContentLoaded",()=>{
    const status=el("hospitalMapStatus");
    if(window.L){initMap();if(status)status.textContent="Map ready. Search an area or use GPS to show your location.";}
    else if(status)status.textContent="Map library could not load. Check your internet connection and reload.";
    el("hospitalMapLocateButton")?.addEventListener("click",locateUser);
  });
})();