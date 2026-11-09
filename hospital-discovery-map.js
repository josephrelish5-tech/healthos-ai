/* HealthOS AI — Google Maps-style hospital discovery using Leaflet + CARTO/OSM. */
(function () {
  "use strict";
  let map = null;
  let markers = [];
  let userMarker = null;
  let currentUserLocation = null;
  let accuracyCircle = null;
  let watchId = null;
  let lastHospitals = [];
  let selectedHospitalId = null;
  let popupCloseTimer = null;
  let placeMarkers = [];
  let placeLookupTimer = null;
  let lastPlaceLookupAt = 0;
  let lastPlaceLookupKey = "";
  let baseTileLayer = null;
  let fallbackTileLayer = null;
  let tertiaryTileLayer = null;
  let activeTileProvider = 0;
  let tileErrorCount = 0;
  let tileLoadTimer = null;
  let tileProviderStartedAt = 0;
  const defaultCenter = [6.82, 3.48]; // Obafemi Owode, Ogun State (regional fallback only)
  function el(id) { return document.getElementById(id); }
  function escapeText(value) { return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function setStatus(message) { const node=el("hospitalMapStatus"); if(node) node.textContent=message; }
  function directionsUrl(h, mode) {
    const destination = h.latitude != null && h.longitude != null ? h.latitude + "," + h.longitude :
      [h.hospital_name,h.address,h.city,h.state,h.country_code].filter(Boolean).join(", ");
    const params = new URLSearchParams({ api: "1", destination, travelmode: mode || "driving" });
    if (currentUserLocation) params.set("origin", currentUserLocation.latitude + "," + currentUserLocation.longitude);
    // Google Maps Directions URLs work without a Maps API key or billing account.
    return "https://www.google.com/maps/dir/?" + params.toString();
  }
  function selectHospital(hospitalId) {
    const h=lastHospitals.find(x=>String(x.hospital_id)===String(hospitalId));
    if(!h) return;
    if(map && h.latitude!=null && h.longitude!=null) map.flyTo([Number(h.latitude),Number(h.longitude)],16,{duration:0.8});
    selectedHospitalId=String(hospitalId);
    markers.forEach(item=>{ if(String(item.hospitalId)===String(hospitalId)) item.marker.openPopup(); else item.marker.closePopup(); });
    document.querySelectorAll("[data-hospital-card]").forEach(card=>{const selected=card.dataset.hospitalCard===String(hospitalId);card.classList.toggle("hospital-card-selected",selected);if(selected)card.scrollIntoView({behavior:"smooth",block:"center"});});
  }
  function renderCards(hospitals) {
    const target=el("patientHospitalResults"); if(!target) return;
    target.replaceChildren();
    if(!hospitals.length) {
      const empty=document.createElement("div"); empty.className="hospital-map-empty";
      empty.innerHTML="<strong>No hospital results were found for this search</strong><p>Try a nearby town or a broader location. External map results depend on OpenStreetMap coverage and are not independently verified.</p>";
      target.appendChild(empty); return;
    }
    [{key:"network",title:"HealthOS AI Verified Network Hospitals"},{key:"other",title:"External Public Hospital Listings"},{key:"provisional_external",title:"Unverified External Hospital Listings"}].forEach(group=>{
      const items=hospitals.filter(h=>(h.listing_group||"network")===group.key); if(!items.length) return;
      const section=document.createElement("section"); section.className="hospital-discovery-group";
      const heading=document.createElement("h2"); heading.textContent=group.title; section.appendChild(heading);
      items.forEach(h=>{
        const card=document.createElement("article"); card.className="hospital-discovery-card"; card.dataset.hospitalCard=h.hospital_id;
        const title=document.createElement("h3"); title.textContent=h.hospital_name||"Hospital";
        const badge=document.createElement("span"); badge.className="hospital-verified-badge"; badge.textContent=group.key==="network"?"✓ HealthOS AI verified member":group.key==="provisional_external"?"Unverified — GRID3 public dataset":h.source_provider==="OpenStreetMap"?"OpenStreetMap result — not independently verified":"External listing — not independently verified";
        const address=document.createElement("p"); address.textContent=[h.address,h.local_government_area,h.city,h.state,h.country_code].filter(Boolean).join(", ")||"Address not provided";
        if(group.key==="provisional_external" && h.public_description){const source=document.createElement("small");source.className="hospital-source-attribution";source.textContent=h.public_description;card.appendChild(source);}
        const distance=document.createElement("p"); distance.className="hospital-distance"; distance.textContent=h.distance_km==null?"Distance unavailable":Number(h.distance_km).toFixed(1)+" km away";
        const specialty=document.createElement("p"); specialty.textContent="Specialties: "+((h.specialties||[]).join(", ")||"Not listed");
        const services=document.createElement("p"); services.textContent="Services: "+((h.public_services||[]).join(", ")||"Contact hospital for details");
        const rating=document.createElement("p"); rating.className="hospital-review-summary";
        const reviewCount=Number(h.review_count||0), average=Number(h.average_rating||0);
        rating.textContent=reviewCount>0 ? "Patient rating: "+average.toFixed(1)+" / 5 ("+reviewCount+" published review"+(reviewCount===1?"":"s")+")" : "No published patient reviews yet";
        const actions=document.createElement("div"); actions.className="hospital-card-actions";
        const show=document.createElement("button"); show.type="button"; show.className="secondary-button"; show.textContent="Show on map"; show.addEventListener("click",()=>selectHospital(h.hospital_id));
        const directions=document.createElement("a"); directions.className="primary-button"; directions.href=directionsUrl(h,"driving"); directions.target="_blank"; directions.rel="noopener noreferrer"; directions.textContent="Driving directions";
        const walking=document.createElement("a"); walking.className="secondary-button"; walking.href=directionsUrl(h,"walking"); walking.target="_blank"; walking.rel="noopener noreferrer"; walking.textContent="Walking route";
        const transit=document.createElement("a"); transit.className="secondary-button"; transit.href=directionsUrl(h,"transit"); transit.target="_blank"; transit.rel="noopener noreferrer"; transit.textContent="Public transport";
        actions.append(show,directions,walking,transit);
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
    // Vector basemap: MapLibre draws the style while Leaflet continues to own
    // the map, controls, hospital markers, clusters, GPS and place markers.
    const osmAttribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const hotAttribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, HOT';
    const esriAttribution='Tiles &copy; Esri — Sources: Esri, HERE, Garmin, OpenStreetMap contributors';
    let vectorBasemapLayer=null;
    let vectorBasemapActive=false;
    function activateRasterFallback(reason){
      if(vectorBasemapLayer && map.hasLayer(vectorBasemapLayer)) map.removeLayer(vectorBasemapLayer);
      vectorBasemapActive=false;
      if(!baseTileLayer){
        baseTileLayer=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
          subdomains:["a","b","c"],maxZoom:19,maxNativeZoom:19,attribution:osmAttribution
        });
      }
      baseTileLayer.addTo(map);
      setStatus(reason || "Vector map style unavailable. Showing the standard street-map backup.");
    }
    if(typeof window.HealthOSMapLibreGL==="function"){
      try{
        vectorBasemapLayer=window.HealthOSMapLibreGL({
          style:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
          interactive:false
        }).addTo(map);
        const vectorMap=vectorBasemapLayer.getMaplibreMap();

        // Fiord/OpenFreeMap geographic label layers (confirmed against its style).
        // State names: white. Capital-city features: pink. Other settlements/regions: peach.
        function styleGeographicLabel(layerId,colorExpression){
          const layer=vectorMap.getStyle()?.layers?.find(item=>item.id===layerId);
          if(!layer||layer.type!=="symbol"||!layer.layout?.["text-field"]) return;
          vectorMap.setPaintProperty(layerId,"text-color",colorExpression);
          vectorMap.setPaintProperty(layerId,"text-halo-color","#FFFFFF");
          vectorMap.setPaintProperty(layerId,"text-halo-width",2);
          vectorMap.setPaintProperty(layerId,"text-halo-blur",0.35);
        }
        function applyHealthOSGeographicLabelPalette(){
          if(!vectorMap.isStyleLoaded()) return;
          styleGeographicLabel("place_state","#526779");
          const capitalOrRegion=[
            "match",["get","capital"],
            [1,2,"yes","primary"],"#D71920",
            "#F2A0C4"
          ];
          ["place_city","place_city_large"].forEach(id=>
            styleGeographicLabel(id,capitalOrRegion)
          );
          ["place_town","place_village","place_suburb","place_other"].forEach(id=>
            styleGeographicLabel(id,"#E8A17B")
          );
        }
        vectorMap.once("load",applyHealthOSGeographicLabelPalette);
        vectorMap.once("load",()=>{
          vectorBasemapActive=true;
          setStatus("Light OpenStreetMap-style map loaded. Search an area or zoom in to explore.");
        });
        vectorMap.on("error",event=>{
          if(!vectorBasemapActive && event && event.error){
            console.warn("HealthOS vector basemap error:",event.error);
          }
        });
        tileLoadTimer=setTimeout(()=>{
          if(!vectorBasemapActive && map && vectorBasemapLayer && map.hasLayer(vectorBasemapLayer)){
            activateRasterFallback("The light vector map did not finish loading. Showing the standard street-map backup; hospital functions remain available.");
          }
        },15000);
      }catch(error){
        console.error("HealthOS vector basemap initialization failed:",error);
        activateRasterFallback("Light vector map could not initialize. Showing the standard street-map backup.");
      }
    }else{
      activateRasterFallback("Vector map library is unavailable. Showing the standard street-map backup.");
    }
    // Make hospital-name labels readable when users zoom in.
    if(!document.getElementById("healthos-hospital-map-label-style")){
      const style=document.createElement("style"); style.id="healthos-hospital-map-label-style";
      style.textContent=".healthos-hospital-name-label{background:#fff;border:1px solid #1d4ed8;border-radius:5px;color:#102a43;font-weight:700;padding:3px 6px;box-shadow:0 1px 5px rgba(0,0,0,.25);white-space:nowrap}.healthos-hospital-name-label:before{display:none}";
      document.head.appendChild(style);
    }
    L.control.zoom({position:"topright"}).addTo(map);
    map.on("zoomend",()=>{drawMarkers(lastHospitals,false);scheduleNearbyPlaces();});
    map.on("moveend",scheduleNearbyPlaces);
    drawMarkers(lastHospitals);
    scheduleNearbyPlaces();
  }
  function drawMarkers(hospitals,fit=true) {
    if(!map||!window.L) return;
    markers.forEach(x=>x.marker.remove()); markers=[];
    const points=[];
    hospitals.forEach(h=>{
      if(h.latitude==null||h.longitude==null) return;
      const lat=Number(h.latitude),lng=Number(h.longitude);
      if(Number.isFinite(lat)&&Number.isFinite(lng))points.push({h,lat,lng,point:map.project([lat,lng],map.getZoom())});
    });
    const bounds=points.map(x=>[x.lat,x.lng]);
    // Lightweight viewport-aware clustering; no paid map API or extra plugin required.
    const zoomLevel=map.getZoom();
    const cellSize=zoomLevel>=15?1:76,groups=new Map();
    points.forEach((item,index)=>{
      // At street-level zoom, never cluster hospitals: every facility gets its own tappable pin and permanent name label.
      const key=zoomLevel>=15?"hospital-"+index:Math.floor(item.point.x/cellSize)+":"+Math.floor(item.point.y/cellSize);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    });
    groups.forEach(group=>{
      const lat=group.reduce((sum,x)=>sum+x.lat,0)/group.length;
      const lng=group.reduce((sum,x)=>sum+x.lng,0)/group.length;
      if(group.length===1){
        const h=group[0].h,marker=L.marker([lat,lng]).addTo(map);
        marker.bindPopup("<strong>"+escapeText(h.hospital_name)+"</strong><br>"+escapeText([h.address,h.local_government_area,h.city,h.state].filter(Boolean).join(", "))+"<br>"+(h.listing_group==="network"?"HealthOS AI verified member":h.listing_group==="provisional_external"?"Unverified — GRID3 public dataset":"External listing — not independently verified")+(h.distance_km==null?"":"<br>"+Number(h.distance_km).toFixed(1)+" km away")+(h.listing_group==="provisional_external"&&h.public_description?"<br><small>"+escapeText(h.public_description)+"</small>":""),{autoClose:false,closeOnClick:false,keepInView:true});
        marker.bindTooltip(escapeText(h.hospital_name||"Hospital"),{permanent:map.getZoom()>=15,direction:"top",offset:[0,-16],className:"healthos-hospital-name-label"});
        marker.on("popupopen",()=>{clearTimeout(popupCloseTimer);popupCloseTimer=setTimeout(()=>marker.closePopup(),60000);});
        marker.on("click",()=>selectHospital(h.hospital_id));
        if(selectedHospitalId!==null && String(h.hospital_id)===selectedHospitalId) marker.openPopup();
        markers.push({marker,hospitalId:h.hospital_id});
      }else{
        const icon=L.divIcon({className:"healthos-hospital-cluster-wrap",html:'<div class="healthos-hospital-cluster">'+group.length+'</div>',iconSize:[48,48],iconAnchor:[24,24]});
        const cluster=L.marker([lat,lng],{icon,zIndexOffset:500}).addTo(map);
        // A cluster tap opens the facilities represented by this number in place.
        // It must not zoom, fly, or pan the map away from the selected cluster.
        const hospitalDetails=group.map(({h})=>{
          const address=[h.address,h.local_government_area,h.city,h.state].filter(Boolean).join(", ");
          const listing=h.listing_group==="network"?"✓ HealthOS AI verified member":h.listing_group==="provisional_external"?"Unverified — GRID3 external dataset":"External listing — not independently verified";
          const distance=h.distance_km==null?"":"<div>"+Number(h.distance_km).toFixed(1)+" km away</div>";
          const specialties=Array.isArray(h.specialties)&&h.specialties.length
            ?"<div>Specialties: "+escapeText(h.specialties.join(", "))+"</div>":"";
          return "<li class='healthos-cluster-hospital-detail'><strong>"+escapeText(h.hospital_name||"Hospital")+
            "</strong><div>"+escapeText(address||"Address not provided")+"</div><div>"+escapeText(listing)+
            "</div>"+distance+specialties+"<button type='button' class='healthos-cluster-open-card' data-hospital-id='"+escapeText(h.hospital_id)+"'>View hospital card</button></li>";
        }).join("");
        cluster.bindPopup(
          "<div class='healthos-cluster-details'><strong>"+group.length+
          " hospitals in this location</strong><ul class='healthos-cluster-list'>"+hospitalDetails+
          "</ul></div>",
          {maxWidth:340,maxHeight:320,autoPan:false,closeButton:true,keepInView:false}
        );
        cluster.on("click",()=>cluster.openPopup());
        // Cluster-card taps are handled by one document-level capture listener.
        // This is reliable on mobile browsers where Leaflet popup scrolling and
        // map gesture handlers can otherwise interfere with nested button clicks.
        cluster.on("popupopen",event=>{
          const popupElement=event.popup.getElement();
          if(popupElement) popupElement.querySelectorAll(".healthos-cluster-open-card").forEach(button=>{
            button.setAttribute("aria-label","View hospital card");
            button.style.pointerEvents="auto";
            button.style.touchAction="manipulation";
          });
        });
        markers.push({marker:cluster,hospitalId:null});
      }
    });
    if(fit&&bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:14});
  }
  function scheduleNearbyPlaces() {
    if(!map || map.getZoom()<14) { clearTimeout(placeLookupTimer); return; }
    clearTimeout(placeLookupTimer);
    placeLookupTimer=setTimeout(loadNearbyPlaces,900);
  }
  async function loadNearbyPlaces() {
    if (!map || map.getZoom() < 14) return;
    const bounds = map.getBounds(), zoom = map.getZoom();
    const south = bounds.getSouth().toFixed(4), west = bounds.getWest().toFixed(4);
    const north = bounds.getNorth().toFixed(4), east = bounds.getEast().toFixed(4);
    const key = [zoom, south, west, north, east].join(":");
    if (key === lastPlaceLookupKey || Date.now() - lastPlaceLookupAt < 15000) return;

    // Request named places AND address-tagged objects. Many OSM buildings have
    // no name but do have a house number/street and are still useful discoveries.
    const query = '[out:json][timeout:20];(' +
      'nwr["name"](' + south + ',' + west + ',' + north + ',' + east + ');' +
      'nwr["healthcare"](' + south + ',' + west + ',' + north + ',' + east + ');' +
      'nwr["healthcare:speciality"](' + south + ',' + west + ',' + north + ',' + east + ');' +
      'nwr["amenity"~"hospital|clinic|doctors|pharmacy|dentist|veterinary|social_facility"](' + south + ',' + west + ',' + north + ',' + east + ');' +
      'nwr["addr:housenumber"](' + south + ',' + west + ',' + north + ',' + east + ');' +
      'nwr["addr:street"](' + south + ',' + west + ',' + north + ',' + east + ');' +
      'nwr["addr:full"](' + south + ',' + west + ',' + north + ',' + east + ');' +
      ');out center tags 300;';
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter"
    ];
    lastPlaceLookupAt = Date.now();
    let data = null, lastError = null;

    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 22000);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Accept": "application/json"
          },
          body: "data=" + encodeURIComponent(query),
          signal: controller.signal
        });
        if (!response.ok) throw new Error("Map data server returned HTTP " + response.status);
        const result = await response.json();
        if (!result || !Array.isArray(result.elements)) throw new Error("Map data response was incomplete");
        data = result;
        break;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!data) {
      // Do not cache a failed viewport. A later pan/zoom can retry it.
      lastPlaceLookupKey = "";
      setStatus("Nearby address data is temporarily unavailable" +
        (lastError && lastError.name === "AbortError" ? " (map server timed out)." : ".") +
        " Hospital listings remain available; try moving or zooming the map again shortly.");
      return;
    }

    // Ignore a response if the user has moved to another area while it loaded.
    const currentBounds = map.getBounds();
    const stillSameArea =
      Math.abs(currentBounds.getSouth() - Number(south)) < 0.002 &&
      Math.abs(currentBounds.getWest() - Number(west)) < 0.002 &&
      Math.abs(currentBounds.getNorth() - Number(north)) < 0.002 &&
      Math.abs(currentBounds.getEast() - Number(east)) < 0.002;
    if (!stillSameArea) {
      lastPlaceLookupKey = "";
      scheduleNearbyPlaces();
      return;
    }

    const nextMarkers = [];
    const seen = new Set();
    (data.elements || []).forEach(place => {
      const tags = place.tags || {};
      const houseNumber = String(tags["addr:housenumber"] || "").trim();
      const streetName = String(tags["addr:street"] || "").trim();
      const fullAddress = String(tags["addr:full"] || "").trim();
      const name = String(tags.name || (houseNumber && streetName ? houseNumber + " " + streetName :
        houseNumber || fullAddress || streetName) || "").trim();
      const lat = Number(place.lat ?? place.center?.lat);
      const lng = Number(place.lon ?? place.center?.lon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const id = String(place.type || "") + ":" + String(place.id || "") ||
        name.toLowerCase() + ":" + lat.toFixed(5) + ":" + lng.toFixed(5);
      if (seen.has(id)) return;
      seen.add(id);

      const healthcareType = String(tags.healthcare || (["hospital","clinic","doctors","pharmacy","dentist","veterinary"].includes(tags.amenity) ? tags.amenity : "") || "").trim();
      const category = healthcareType || tags.amenity || tags.shop ||
        tags.tourism || tags.leisure || tags.office || tags.highway ||
        tags.building || tags.place || "Place";
      const isHealthcare = Boolean(healthcareType || tags["healthcare:speciality"]);
      const street = [houseNumber, streetName].filter(Boolean).join(" ");
      const locality = [
        tags["addr:suburb"], tags["addr:neighbourhood"], tags["addr:village"],
        tags["addr:town"], tags["addr:city"], tags["addr:district"],
        tags["addr:state"], tags["addr:postcode"]
      ].filter(Boolean).join(", ");
      const address = fullAddress || [street, locality].filter(Boolean).join(", ");
      const marker = L.circleMarker([lat, lng], {
        radius: isHealthcare ? 8 : 5,
        color: isHealthcare ? "#075985" : "#8b5e16",
        weight: isHealthcare ? 3 : 2,
        fillColor: isHealthcare ? "#38bdf8" : "#f4d27a",
        fillOpacity: 0.95
      });
      marker.bindTooltip(escapeText(name), {
        permanent: map.getZoom() >= 16,
        direction: "top", offset: [0, -5],
        className: "healthos-hospital-name-label"
      });
      const coordinateText = lat.toFixed(6) + ", " + lng.toFixed(6);
      const directions = "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(coordinateText) + "&travelmode=driving";
      const osmReference = escapeText(String(place.type || "map") + " " + String(place.id || ""));
      marker.bindPopup(
        "<div class='healthos-place-details'>" +
        "<strong>" + escapeText(name) + "</strong>" +
        "<div><strong>Category:</strong> " + escapeText(String(category).replace(/_/g, " ")) + (isHealthcare ? " · Healthcare facility" : "") + "</div>" +
        (tags["healthcare:speciality"] ? "<div><strong>Specialties:</strong> " + escapeText(String(tags["healthcare:speciality"]).replace(/;/g, ", ")) + "</div>" : "") +
        (tags.phone || tags["contact:phone"] ? "<div><strong>Phone:</strong> " + escapeText(tags.phone || tags["contact:phone"]) + "</div>" : "") +
        (tags.opening_hours ? "<div><strong>Opening hours:</strong> " + escapeText(tags.opening_hours) + "</div>" : "") +
        "<div><strong>Address:</strong> " + escapeText(address || "Address not provided in OpenStreetMap data") + "</div>" +
        "<div><strong>Coordinates:</strong> " + escapeText(coordinateText) + "</div>" +
        "<div><strong>Map reference:</strong> " + osmReference + "</div>" +
        "<p><a href='" + directions + "' target='_blank' rel='noopener noreferrer'>Get directions</a></p>" +
        "</div>",
        {maxWidth:300,autoPan:false,closeButton:true}
      );
      nextMarkers.push(marker);
    });

    // Replace the old place layer only after a successful response, so a
    // temporary server failure never makes already-loaded locations disappear.
    placeMarkers.forEach(marker => marker.remove());
    placeMarkers = nextMarkers;
    placeMarkers.forEach(marker => marker.addTo(map));
    lastPlaceLookupKey = key;
    const healthFacilityCount = (data.elements || []).filter(place => {
      const tags = place.tags || {};
      return Boolean(tags.healthcare || tags["healthcare:speciality"] ||
        ["hospital","clinic","doctors","pharmacy","dentist","veterinary"].includes(tags.amenity));
    }).length;
    setStatus("Showing hospital listings, " + healthFacilityCount +
      " mapped healthcare facilities (including pharmacies, clinics and doctors), and " +
      placeMarkers.length + " nearby places. Blue markers identify healthcare facilities. " +
      "Some locations may not have complete address details in OpenStreetMap yet.");
  }
  function showUserLocation(lat,lng,accuracy) {
    currentUserLocation = { latitude: Number(lat), longitude: Number(lng) };
    const point=[lat,lng];
    // Refresh route links so newly available GPS becomes the route origin.
    if (lastHospitals.length) renderCards(lastHospitals);
    if(!map||!window.L) return;
    const icon=L.divIcon({className:"healthos-user-location-icon",html:'<span class="healthos-user-location-dot"></span>',iconSize:[24,24],iconAnchor:[12,12]});
    if(!userMarker) userMarker=L.marker(point,{icon,zIndexOffset:1000,interactive:false}).addTo(map); else userMarker.setLatLng(point);
    if(accuracyCircle) accuracyCircle.remove();
    accuracyCircle=L.circle(point,{radius:Math.max(accuracy||30,20),color:"#4285f4",weight:1,fillColor:"#4285f4",fillOpacity:0.12,interactive:false}).addTo(map);
  }
  async function focusSearchLocation(lat,lng,label) {
    if(!map) initMap(); if(!map) return;
    if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))) {
      const point=[Number(lat),Number(lng)]; map.flyTo(point,17,{duration:0.8});
      setStatus("Map centred on your current location. Searching HealthOS AI hospitals and external public listings.");
      return;
    }
    const queryParts=[label,el("hospitalSearchCity")?.value,el("hospitalSearchState")?.value,"Nigeria"].filter(Boolean);
    const query=[...new Map(queryParts.map(part=>[String(part).trim().toLowerCase(),String(part).trim()])).values()].join(", ");
    try {
      const response=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q="+encodeURIComponent(query),{headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error("Location lookup unavailable");
      const results=await response.json();
      if(results.length) { map.flyTo([Number(results[0].lat),Number(results[0].lon)],13,{duration:0.8}); setStatus("Map centred on "+(label||query)+"."); }
      else { map.flyTo(defaultCenter,11,{duration:0.8}); setStatus("Could not pinpoint that search area. Showing the Obafemi Owode regional map; search results remain based on your entered location."); }
    } catch(e) { map.flyTo(defaultCenter,11,{duration:0.8}); setStatus("Location lookup could not complete. Showing the Obafemi Owode regional map; you can still move and zoom the map."); }
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
      if (map) map.flyTo([latitude, longitude], 17, { duration: 0.7 });
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
  function setResultsView(view) {
    const mapPanel=el("hospitalMapViewPanel"),cardsPanel=el("hospitalCardsViewPanel");
    const mapButton=el("hospitalMapViewButton"),cardsButton=el("hospitalCardsViewButton");
    const showMap=view!=="cards";
    if(mapPanel)mapPanel.hidden=false;
    if(cardsPanel)cardsPanel.hidden=false;
    if(mapButton){mapButton.classList.toggle("is-active",showMap);mapButton.setAttribute("aria-pressed",String(showMap));}
    if(cardsButton){cardsButton.classList.toggle("is-active",!showMap);cardsButton.setAttribute("aria-pressed",String(!showMap));}
    const target=showMap?mapPanel:cardsPanel;
    if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
    if(showMap&&map){setTimeout(()=>map.invalidateSize(),120);}
  }
  function render(hospitals) {
    lastHospitals=Array.isArray(hospitals)?hospitals:[];
    renderCards(lastHospitals); if(!map) initMap(); if(map) drawMarkers(lastHospitals);
    const count=el("hospitalNearbyCount");
    if(count)count.textContent=lastHospitals.length+" hospital"+(lastHospitals.length===1?"":"s")+" found";
    if(lastHospitals.length) setStatus(lastHospitals.length+" hospital listing(s) found. HealthOS AI members and external listings are labelled separately. Select a card or map pin to explore.");
    else setStatus("No approved hospital listings match this search yet. Try another location.");
  }
  async function searchExternalHospitals(locationLabel, nameQuery) {
    const location=String(locationLabel||"").trim();
    if(!location) return [];
    const geocodeQuery=location+", Nigeria";
    const geoResponse=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&addressdetails=1&q="+encodeURIComponent(geocodeQuery),{headers:{Accept:"application/json"}});
    if(!geoResponse.ok) throw new Error("Location lookup returned HTTP "+geoResponse.status);
    const places=await geoResponse.json();
    if(!Array.isArray(places)||!places.length) return [];
    const place=places[0],box=String(place.boundingbox||"").split(",").map(Number);
    if(box.length!==4||!box.every(Number.isFinite)) throw new Error("Location search did not return a valid map area.");
    const south=box[0],north=box[1],west=box[2],east=box[3];
    const name=String(nameQuery||"").trim().replace(/[^a-z0-9\s'-]/gi,"").slice(0,80);
    const nameFilter=name?'[name~"'+name.replace(/"/g,'\\"')+'",i]':'';
    // Search the complete returned state/LGA/city area in bounded tiles. Large
    // state bounding boxes are split rather than silently returning zero results.
    const rows=Math.max(1,Math.ceil((north-south)/0.8));
    const cols=Math.max(1,Math.ceil((east-west)/0.8));
    const tiles=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const tileSouth=south+(north-south)*r/rows;
      const tileNorth=south+(north-south)*(r+1)/rows;
      const tileWest=west+(east-west)*c/cols;
      const tileEast=west+(east-west)*(c+1)/cols;
      tiles.push('('+tileSouth+','+tileWest+','+tileNorth+','+tileEast+')');
    }
    const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.private.coffee/api/interpreter"];
    const elementsById=new Map();
    let lastError=null;
    for(let offset=0;offset<tiles.length;offset+=4){
      const batch=tiles.slice(offset,offset+4);
      const batchResults=await Promise.all(batch.map(async bbox=>{
        const query='[out:json][timeout:25];(nwr["amenity"~"^(hospital|clinic|doctors)$"]'+nameFilter+bbox+';nwr["healthcare"~"^(hospital|clinic|doctor)$"]'+nameFilter+bbox+';);out center tags 150;';
        let error=null;
        for(const endpoint of endpoints){
          const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
          try{
            const response=await fetch(endpoint+"?data="+encodeURIComponent(query),{headers:{Accept:"application/json"},signal:controller.signal});
            if(!response.ok)throw new Error("Overpass HTTP "+response.status);
            const data=await response.json();
            if(!Array.isArray(data.elements))throw new Error("Incomplete OpenStreetMap response");
            return data.elements;
          }catch(e){error=e;}finally{clearTimeout(timer);}
        }
        lastError=error;
        return null;
      }));
      if(batchResults.every(result=>result===null))throw new Error(lastError?.message||"OpenStreetMap hospital search is temporarily unavailable.");
      batchResults.filter(Boolean).flat().forEach(item=>elementsById.set(item.type+"/"+item.id,item));
    }
    const results=[];
    for(const item of elementsById.values()){
      const tags=item.tags||{},lat=Number(item.lat??item.center?.lat),lon=Number(item.lon??item.center?.lon);
      const hospitalName=String(tags.name||tags["name:en"]||tags.official_name||"").trim();
      if(!hospitalName||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
      if(nameQuery&&!hospitalName.toLowerCase().includes(String(nameQuery).trim().toLowerCase()))continue;
      const address=[tags["addr:housenumber"],tags["addr:street"],tags["addr:suburb"],tags["addr:city"]||tags["addr:town"]].filter(Boolean).join(", ");
      results.push({
        hospital_id:"osm:"+item.type+":"+item.id,hospital_name:hospitalName,country_code:"NG",
        state:tags["addr:state"]||place.address?.state||"",city:tags["addr:city"]||tags["addr:town"]||tags["addr:village"]||"",
        local_government_area:tags["addr:district"]||tags["addr:county"]||"",address,
        hospital_category:tags.healthcare||tags.amenity||"Healthcare facility",specialties:[],
        public_services:[],latitude:lat,longitude:lon,distance_km:null,listing_group:"other",
        connection_available:false,source_provider:"OpenStreetMap",source_attribution:"© OpenStreetMap contributors",
        osm_reference:item.type+"/"+item.id
      });
    }
    return results;
  }
  function refresh() { if(!el("hospitalDiscoveryMap")) return; if(!map) initMap(); if(map){map.invalidateSize();drawMarkers(lastHospitals);} }
  window.HealthOSHospitalDiscovery={render,selectHospital,refresh,focusSearchLocation,locateUser,searchExternalHospitals};
  // Capture cluster-card clicks before Leaflet's map/popup gesture handlers.
  // Delegation also survives popup content being recreated during map interactions.
  document.addEventListener("click",event=>{
    const button=event.target && event.target.closest
      ? event.target.closest(".healthos-cluster-open-card[data-hospital-id]") : null;
    if(!button) return;
    event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation==="function") event.stopImmediatePropagation();
    const hospitalId=button.getAttribute("data-hospital-id");
    const popup=button.closest(".leaflet-popup");
    if(popup && map) map.closePopup();
    selectHospital(hospitalId);
  },true);

  document.addEventListener("DOMContentLoaded",()=>{
    const status=el("hospitalMapStatus");
    if(window.L){initMap();if(status)status.textContent="Map ready. Search an area or use GPS to show your location.";}
    else if(status)status.textContent="Map library could not load. Check your internet connection and reload.";
    el("hospitalMapLocateButton")?.addEventListener("click",locateUser);
    el("hospitalMapViewButton")?.addEventListener("click",()=>setResultsView("map"));
    el("hospitalCardsViewButton")?.addEventListener("click",()=>setResultsView("cards"));
    setResultsView("map");
  });
})();