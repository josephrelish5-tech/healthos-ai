/* HealthOS AI — public hospital map and discovery cards. Leaflet + OpenStreetMap. */
(function () {
  "use strict";
  let map = null;
  let markers = [];
  let selectedHospitalId = null;
  let lastHospitals = [];
  function el(id) { return document.getElementById(id); }
  function escapeText(value) { return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function directionsUrl(h) {
    const destination = h.latitude != null && h.longitude != null ? h.latitude + "," + h.longitude :
      [h.hospital_name, h.address, h.city, h.state, h.country_code].filter(Boolean).join(", ");
    return "https://www.openstreetmap.org/directions?to=" + encodeURIComponent(destination);
  }
  function selectHospital(hospitalId) {
    selectedHospitalId = hospitalId;
    const h = lastHospitals.find(x => x.hospital_id === hospitalId);
    if (!h) return;
    if (map && h.latitude != null && h.longitude != null) map.setView([Number(h.latitude), Number(h.longitude)], 15);
    markers.forEach(item => {
      if (item.hospitalId === hospitalId) item.marker.openPopup();
      else item.marker.closePopup();
    });
    document.querySelectorAll("[data-hospital-card]").forEach(card =>
      card.classList.toggle("hospital-card-selected", card.dataset.hospitalCard === hospitalId));
  }
  function renderCards(hospitals) {
    const target = el("patientHospitalResults");
    if (!target) return;
    target.replaceChildren();
    if (!hospitals.length) {
      const empty = document.createElement("div");
      empty.className = "hospital-map-empty";
      empty.innerHTML = "<strong>No hospitals found in this search area</strong><p>Try a wider search area or another location.</p>";
      target.appendChild(empty); return;
    }
    [{key:"network",title:"HealthOS AI Network Hospitals"},{key:"other",title:"Other Hospitals Near You"}].forEach(group => {
      const items = hospitals.filter(h => (h.listing_group || "network") === group.key);
      if (!items.length) return;
      const section = document.createElement("section"); section.className = "hospital-discovery-group";
      const heading = document.createElement("h2"); heading.textContent = group.title; section.appendChild(heading);
      items.forEach(h => {
        const card = document.createElement("article"); card.className = "hospital-discovery-card"; card.dataset.hospitalCard = h.hospital_id;
        const title = document.createElement("h3"); title.textContent = h.hospital_name || "Hospital";
        const badge = document.createElement("span"); badge.className = "hospital-verified-badge";
        badge.textContent = group.key === "network" ? "HealthOS AI member" : "Nearby hospital";
        const address = document.createElement("p"); address.textContent =
          [h.address,h.local_government_area,h.city,h.state,h.country_code].filter(Boolean).join(", ") || "Address not provided";
        const distance = document.createElement("p"); distance.className = "hospital-distance";
        distance.textContent = h.distance_km == null ? "Distance unavailable" : Number(h.distance_km).toFixed(1) + " km away";
        const specialty = document.createElement("p"); specialty.textContent = "Specialties: " + ((h.specialties || []).join(", ") || "Not listed");
        const services = document.createElement("p"); services.textContent = "Services: " + ((h.public_services || []).join(", ") || "Contact hospital for details");
        const actions = document.createElement("div"); actions.className = "hospital-card-actions";
        const show = document.createElement("button"); show.type="button"; show.className="secondary-button"; show.textContent="Show on map";
        show.addEventListener("click", () => selectHospital(h.hospital_id));
        const directions = document.createElement("a"); directions.className="primary-button"; directions.href=directionsUrl(h);
        directions.target="_blank"; directions.rel="noopener noreferrer"; directions.textContent="Get directions";
        actions.append(show,directions);
        if (h.connection_available) {
          const connect=document.createElement("button"); connect.type="button"; connect.className="secondary-button";
          connect.textContent="Request connection";
          connect.addEventListener("click",()=>{ if(typeof window.requestHospitalConnection==="function") window.requestHospitalConnection(h.hospital_id,connect); });
          actions.appendChild(connect);
        }
        card.append(title,badge,address,distance,specialty,services,actions); section.appendChild(card);
      });
      target.appendChild(section);
    });
  }
  function initMap() {
    const node=el("hospitalDiscoveryMap");
    if (!node || !window.L || map) return;
    map=L.map(node,{scrollWheelZoom:false}).setView([6.5244,3.3792],11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);
    drawMarkers(lastHospitals);
  }
  function drawMarkers(hospitals) {
    if (!map || !window.L) return;
    markers.forEach(x=>x.marker.remove()); markers=[];
    const bounds=[];
    hospitals.forEach(h=>{
      if(h.latitude==null || h.longitude==null) return;
      const lat=Number(h.latitude),lng=Number(h.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;
      const marker=L.marker([lat,lng]).addTo(map);
      marker.bindPopup("<strong>"+escapeText(h.hospital_name)+"</strong><br>"+
        escapeText([h.city,h.state].filter(Boolean).join(", "))+
        (h.distance_km==null?"":"<br>"+Number(h.distance_km).toFixed(1)+" km away"));
      marker.on("click",()=>selectHospital(h.hospital_id));
      markers.push({marker,hospitalId:h.hospital_id}); bounds.push([lat,lng]);
    });
    if(bounds.length) map.fitBounds(bounds,{padding:[25,25],maxZoom:14});
  }
  function render(hospitals) {
    lastHospitals=Array.isArray(hospitals)?hospitals:[];
    renderCards(lastHospitals);
    if(!map) initMap();
    if(map) drawMarkers(lastHospitals);
    const status=el("hospitalMapStatus");
    if(status) status.textContent=lastHospitals.length ?
      lastHospitals.length+" verified hospital(s) found. Select a card or map pin to explore." :
      "No verified hospitals match this search yet. The map is ready for approved hospital listings.";
  }
  function refresh() {
    if(!el("hospitalDiscoveryMap")) return;
    if(!map) initMap();
    if(map) { map.invalidateSize(); drawMarkers(lastHospitals); }
  }
  window.HealthOSHospitalDiscovery={render,selectHospital,refresh};
  document.addEventListener("DOMContentLoaded",()=>{
    const status=el("hospitalMapStatus");
    if(window.L) { initMap(); if(status) status.textContent="OpenStreetMap is ready."; }
    else if(status) status.textContent="Map library could not load. Check your internet connection and reload.";
  });
})();