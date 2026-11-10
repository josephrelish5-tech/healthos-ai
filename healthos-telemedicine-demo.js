/* HealthOS — isolated synthetic Daily room demonstration.
 * This path is deliberately separate from real patient consultation workflows.
 * Only an authenticated clinic owner/admin can mint tokens for one fixed room.
 */
(() => {
  "use strict";
  const ROOM_NAME = "xZO3M6Da0UjiqtvDdRqY";
  const $ = (id) => document.getElementById(id);
  const getDb = () => typeof supabaseClient !== "undefined" ? supabaseClient : null;
  const getClinic = () => typeof currentClinic !== "undefined" && currentClinic ? currentClinic : null;
  const getUser = () => typeof currentUser !== "undefined" && currentUser ? currentUser : null;

  function mount() {
    const root = $("telemedicineDashboard");
    if (!root || $("healthosSyntheticDemoPanel")) return;
    const panel = document.createElement("section");
    panel.id = "healthosSyntheticDemoPanel";
    panel.className = "panel";
    panel.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">CONTROLLED DEMONSTRATION</p>
          <h3>Private video-room test</h3>
          <p class="muted">Fictional identities only. This does not create a patient record or activate real consultations.</p>
        </div>
      </div>
      <p class="message" id="healthosSyntheticDemoStatus" role="status">Ready when an authorised clinic administrator is signed in.</p>
      <button type="button" class="primary-button" id="healthosGenerateSyntheticLinks">Generate 15-minute test access</button>
      <div id="healthosSyntheticDemoLinks" class="telemed-card" hidden></div>
      <p class="telemed-muted">The links are room-specific, expire after 15 minutes, and are for the fictional doctor and fictional patient only. Do not send them to real patients.</p>
    `;
    root.append(panel);
    $("healthosGenerateSyntheticLinks").addEventListener("click", generate);
  }

  async function generate() {
    const button = $("healthosGenerateSyntheticLinks");
    const status = $("healthosSyntheticDemoStatus");
    const linksBox = $("healthosSyntheticDemoLinks");
    const db = getDb();
    const clinic = getClinic();
    if (!db || !getUser() || !clinic?.id) {
      status.textContent = "Sign in to the HealthOS clinic administrator account and open the clinic workspace first.";
      status.className = "message error";
      return;
    }
    button.disabled = true;
    linksBox.hidden = true;
    linksBox.replaceChildren();
    status.textContent = "Verifying administrator access and checking the private Daily room…";
    status.className = "message";
    try {
      const { data, error } = await db.functions.invoke("healthos-telemedicine-demo", {
        body: { clinic_id: clinic.id, room_name: ROOM_NAME }
      });
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || "Could not generate demonstration access.");
      const makeLink = (label, url) => {
        const row = document.createElement("p");
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = label;
        a.className = "primary-button";
        row.append(a);
        return row;
      };
      const heading = document.createElement("h4");
      heading.textContent = "Fictional demonstration access";
      const expiry = document.createElement("p");
      expiry.textContent = "Both links expire: " + new Date(data.expires_at).toLocaleString();
      const note = document.createElement("p");
      note.textContent = "Open the doctor link on this device and the patient link on a second device/browser. Both join the same private room.";
      linksBox.append(heading, expiry, note,
        makeLink("Open fictional doctor", data.doctor_join_url),
        makeLink("Open fictional patient", data.patient_join_url));
      linksBox.hidden = false;
      status.textContent = "Two temporary tokens were generated. No real patient data or consultation record was used.";
      status.className = "message success";
    } catch (error) {
      status.textContent = error?.message || "Demonstration access could not be generated.";
      status.className = "message error";
    } finally {
      button.disabled = false;
    }
  }

  function boot() {
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
