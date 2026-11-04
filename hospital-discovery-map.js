/* HealthOS AI — public hospital map and discovery cards.
 * Google Maps browser key must be supplied through a restricted, public Maps key.
 */
(function () {
  "use strict";

  let map = null;
  let markers = [];
  let selectedHospitalId = null;
  let lastHospitals = [];

  function el(id) { return document.getElementById(id); }
  function escapeText(value) { return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  function directionsUrl(h) {
    const destination = h.latitude != null && h.longitude != null
      ? h.latitude + "," + h.longitude
      : [h.hospital_name, h.address, h.city, h.state, h.country_code].filter(Boolean).join(", ");
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination);
  }

  function selectHospital(hospitalId) {
    selectedHospitalId = hospitalId;
    const h = lastHospitals.find(x => x.hospital_id === hospitalId);
    if (!h) return;
    if (map && h.latitude != null && h.longitude != null) {
      const pos = { lat: Number(h.latitude), lng: Number(h.longitude) };
      map.panTo(pos);
      map.setZoom(15);
    }
    markers.forEach(item => {
      if (item.hospitalId === hospitalId) item.marker.setAnimation(
        window.google && google.maps.Animation ? google.maps.Animation.BOUNCE : null
      );
      else item.marker.setAnimation(null);
    });
    document.querySelectorAll("[data-hospital-card]").forEach(card => {
      card.classList.toggle("hospital-card-selected", card.dataset.hospitalCard === hospitalId);
    });
  }

  function renderCards(hospitals) {
    const target = el("patientHospitalResults");
    if (!target) return;
    target.replaceChildren();
    if (!hospitals.length) {
      const empty = document.createElement("div");
      empty.className = "hospital-map-empty";
      empty.innerHTML = "<strong>No verified hospitals found yet</strong><p>Try another city, state or LGA. Only hospitals that have completed verification are shown here.</p>";
      target.appendChild(empty);
      return;
    }
    hospitals.forEach(h => {
      const card = document.createElement("article");
      card.className = "hospital-discovery-card";
      card.dataset.hospitalCard = h.hospital_id;
      const title = document.createElement("h3");
      title.textContent = h.hospital_name || "Hospital";
      const verified = document.createElement("span");
      verified.className = "hospital-verified-badge";
      verified.textContent = "Verified";
      const address = document.createElement("p");
      address.textContent = [h.address, h.local_government_area, h.city, h.state, h.country_code].filter(Boolean).join(", ") || "Address not provided";
      const distance = document.createElement("p");
      distance.className = "hospital-distance";
      distance.textContent = h.distance_km == null ? "Distance unavailable" : Number(h.distance_km).toFixed(1) + " km away";
      const specialty = document.createElement("p");
      specialty.textContent = "Specialties: " + ((h.specialties || []).join(", ") || "Not listed");
      const services = document.createElement("p");
      services.textContent = "Services: " + ((h.public_services || []).join(", ") || "Contact hospital for details");
      const actions = document.createElement("div");
      actions.className = "hospital-card-actions";
      const mapButton = document.createElement("button");
      mapButton.type = "button"; mapButton.className = "secondary-button"; mapButton.textContent = "Show on map";
      mapButton.addEventListener("click", () => selectHospital(h.hospital_id));
      const directions = document.createElement("a");
      directions.className = "primary-button"; directions.href = directionsUrl(h);
      directions.target = "_blank"; directions.rel = "noopener noreferrer";
      directions.textContent = "Get directions";
      const connect = document.createElement("button");
      connect.type = "button"; connect.className = "secondary-button";
      connect.textContent = "Request connection";
      connect.addEventListener("click", () => {
        if (typeof window.requestHospitalConnection === "function") {
          window.requestHospitalConnection(h.hospital_id, connect);
        } else {
          connect.disabled = false;
        }
      });
      actions.append(mapButton, directions, connect);
      card.append(title, verified, address, distance, specialty, services, actions);
      target.appendChild(card);
    });
  }

  function initMap() {
    const mapElement = el("hospitalDiscoveryMap");
    if (!mapElement || !window.google || !google.maps) return;
    map = new google.maps.Map(mapElement, {
      center: { lat: 6.5244, lng: 3.3792 },
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });
    drawMarkers(lastHospitals);
  }

  function drawMarkers(hospitals) {
    if (!map || !window.google || !google.maps) return;
    markers.forEach(x => x.marker.setMap(null));
    markers = [];
    const bounds = new google.maps.LatLngBounds();
    hospitals.forEach(h => {
      if (h.latitude == null || h.longitude == null) return;
      const marker = new google.maps.Marker({
        map,
        position: { lat: Number(h.latitude), lng: Number(h.longitude) },
        title: h.hospital_name
      });
      const info = new google.maps.InfoWindow({
        content: "<strong>" + escapeText(h.hospital_name) + "</strong><br>" +
          escapeText([h.city, h.state].filter(Boolean).join(", ")) +
          (h.distance_km == null ? "" : "<br>" + Number(h.distance_km).toFixed(1) + " km away")
      });
      marker.addListener("click", () => {
        info.open({ anchor: marker, map });
        selectHospital(h.hospital_id);
      });
      markers.push({ marker, hospitalId: h.hospital_id });
      bounds.extend(marker.getPosition());
    });
    if (markers.length) map.fitBounds(bounds);
  }

  function loadGoogleMaps() {
    const key = window.HEALTHOS_GOOGLE_MAPS_API_KEY;
    if (!key) {
      const status = el("hospitalMapStatus");
      if (status) status.textContent = "Map is ready for Google Maps. Add your restricted Google Maps JavaScript API key to activate the interactive map.";
      return;
    }
    if (window.google && google.maps) { initMap(); return; }
    window.__healthosGoogleMapsReady = function () {
      initMap();
      drawMarkers(lastHospitals);
      const status = el("hospitalMapStatus");
      if (status) status.textContent = "Google Maps connected.";
    };
    if (!document.querySelector('script[data-healthos-google-maps]')) {
      const script = document.createElement("script");
      script.dataset.healthosGoogleMaps = "true";
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) + "&callback=__healthosGoogleMapsReady";
      script.async = true;
      script.defer = true;
      script.onerror = function () {
        const status = el("hospitalMapStatus");
        if (status) status.textContent = "Google Maps could not load. Check the API key, billing and website restrictions.";
      };
      document.head.appendChild(script);
    }
  }

  function render(hospitals) {
    lastHospitals = Array.isArray(hospitals) ? hospitals : [];
    renderCards(lastHospitals);
    if (map) drawMarkers(lastHospitals);
    else loadGoogleMaps();
    const status = el("hospitalMapStatus");
    if (status) status.textContent = lastHospitals.length
      ? lastHospitals.length + " verified hospital(s) found. Select a card or map pin to explore."
      : "No verified hospitals match this search yet. The map is ready for approved hospital listings.";
  }

  function refresh() {
    if (!el("hospitalDiscoveryMap")) return;
    if (!map) loadGoogleMaps();
    if (map && window.google && google.maps) {
      google.maps.event.trigger(map, "resize");
      map.setCenter({ lat: 6.5244, lng: 3.3792 });
      drawMarkers(lastHospitals);
    }
  }

  function setPatientLocation() {
    const status = el("hospitalSearchMessage");
    if (!navigator.geolocation) {
      if (status) status.textContent = "Location is not available on this device. Search by city or state instead.";
      return;
    }
    if (status) status.textContent = "Requesting your location permission…";
    navigator.geolocation.getCurrentPosition(position => {
      el("hospitalSearchLatitude").value = position.coords.latitude;
      el("hospitalSearchLongitude").value = position.coords.longitude;
      if (status) status.textContent = "Location captured for this search only.";
      const city = el("hospitalSearchCity");
      if (city && !city.value.trim()) city.value = "Nearby";
      el("searchHospitalsButton").click();
    }, () => {
      if (status) status.textContent = "Location permission was not granted. You can still search by city, state or LGA.";
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 });
  }

  window.HealthOSHospitalDiscovery = { render, selectHospital, refresh };
  document.addEventListener("DOMContentLoaded", function () {
    const locate = el("useMyHospitalLocationButton");
    if (locate) locate.addEventListener("click", setPatientLocation);
    loadGoogleMaps();
  });
})();