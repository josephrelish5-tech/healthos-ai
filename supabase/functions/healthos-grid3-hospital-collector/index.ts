import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SOURCE_ID = "8476094d-07bd-47d0-8987-2aa41661f1a1";
const OGUN_LGAS = new Set(["abeokuta north","abeokuta south","ado odo/ota","ewekoro","ifo","ijebu east","ijebu north","ijebu north east","ijebu ode","ikenne","imeko afon","ipokia","obafemi owode","odeda","odogbolu","ogun waterside","remo north","sagamu","yewa north","yewa south"]);
const LAYER_URL = "https://services3.arcgis.com/BU6Aadhn6tbBEdyk/arcgis/rest/services/GRID3_NGA_health_facilities_v2_0/FeatureServer/0/query";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" }
  });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Sign-in required" }, 401);
    const userClient = createClient(PROJECT_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } }, auth: { persistSession: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Valid signed-in session required" }, 401);

    const adminClient = createClient(PROJECT_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: admin } = await adminClient.from("healthos_platform_directory_admins")
      .select("user_id").eq("user_id", userData.user.id).eq("is_active", true).maybeSingle();
    if (!admin) return json({ error: "Active platform directory administrator access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "stage_for_review" ? "stage_for_review" : "preview";
    const requestedState = String(body?.state || "").trim().toUpperCase();
    const scope = requestedState ? "state" : (body?.scope === "all_nigeria" ? "all_nigeria" : "ogun");
    const stateNames = ["ABIA","ADAMAWA","AKWA IBOM","ANAMBRA","BAUCHI","BAYELSA","BENUE","BORNO","CROSS RIVER","DELTA","EBONYI","EDO","EKITI","ENUGU","FEDERAL CAPITAL TERRITORY","GOMBE","IMO","JIGAWA","KADUNA","KANO","KATSINA","KEBBI","KOGI","KWARA","LAGOS","NASARAWA","NIGER","OGUN","ONDO","OSUN","OYO","PLATEAU","RIVERS","SOKOTO","TARABA","YOBE","ZAMFARA","FCT"];
    if (scope === "state" && !stateNames.includes(requestedState)) {
      return json({ error: "Unsupported Nigerian state filter", requested_state: requestedState }, 400);
    }
    if (action === "stage_for_review" && scope === "ogun" && requestedState) {
      return json({ error: "Invalid mixed state/scope request." }, 400);
    }
    const { data: source, error: sourceError } = await adminClient.from("healthos_hospital_directory_sources")
      .select("id,is_enabled,permission_review_status,data_license,permission_basis").eq("id", SOURCE_ID).maybeSingle();
    if (sourceError || !source) return json({ error: "GRID3 source registry record not found" }, 500);
    if (action === "stage_for_review") {
      if (source.permission_review_status !== "approved" || source.is_enabled !== true) {
        return json({ error: "Nationwide staging is locked. An authorised administrator must approve this exact dataset licence and enable the source first. No records were written.", permission_review_status: source.permission_review_status, source_enabled: source.is_enabled }, 409);
      }
    } else if (source.is_enabled && body?.action !== "reconciliation_summary" && body?.action !== "coverage_summary") {
      return json({ error: "Preview is paused while this source is enabled for staging." }, 409);
    }
    if (body?.action === "reconciliation_summary") {
      const { data: summary, error: summaryError } = await adminClient
        .rpc("healthos_grid3_reconciliation_summary", { p_source_id: SOURCE_ID });
      if (summaryError) {
        console.error("GRID3_RECONCILIATION_RPC_FAILED", summaryError.message, summaryError.code);
        return json({ error: "Reconciliation database summary failed", details: summaryError.message, code: summaryError.code || null }, 500);
      }
      return json(summary || {
        mode: "read_only_reconciliation_summary",
        source_id: SOURCE_ID,
        staged_record_count: 0,
        current_directory_record_count: 0,
        by_state: [],
        notice: "No summary was returned. No records were changed."
      });
    }


    if (body?.action === "coverage_summary") {
      const summaryUrl = new URL(LAYER_URL);
      summaryUrl.search = new URLSearchParams({
        where: "1=1",
        outFields: "state",
        groupByFieldsForStatistics: "state",
        outStatistics: JSON.stringify([{ statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "facility_count" }]),
        orderByFields: "state",
        returnGeometry: "false",
        f: "json"
      }).toString();
      const summaryResponse = await fetch(summaryUrl, { signal: AbortSignal.timeout(20000) });
      if (!summaryResponse.ok) return json({ error: "GRID3 coverage summary request failed", upstream_status: summaryResponse.status }, 502);
      const summaryData = await summaryResponse.json();
      if (summaryData.error) return json({ error: "GRID3 coverage summary rejected", details: summaryData.error.message }, 502);
      const stateCounts = (Array.isArray(summaryData.features) ? summaryData.features : [])
        .map((feature: any) => ({
          state: String(feature.attributes?.state || "").trim(),
          facility_count: Number(feature.attributes?.facility_count || 0)
        }))
        .filter((row: any) => row.state)
        .sort((a: any, b: any) => a.state.localeCompare(b.state));
      return json({
        mode: "coverage_summary",
        dataset: "GRID3_NGA_health_facilities_v2_0",
        source_id: SOURCE_ID,
        state_count: stateCounts.length,
        total_facility_records: stateCounts.reduce((sum: number, row: any) => sum + row.facility_count, 0),
        state_counts: stateCounts,
        staged: false,
        published: false,
        notice: "Read-only aggregate coverage report. No facility records were downloaded, staged, approved, or published."
      });
    }

    const stateFilter = requestedState === "FCT" ? "FEDERAL CAPITAL TERRITORY" : requestedState;
    const where = scope === "ogun"
      ? "UPPER(state) = 'OGUN'"
      : scope === "state"
        ? "UPPER(state) = '" + stateFilter.replace(/'/g, "''") + "'"
        : "1=1";
    const countUrl = new URL(LAYER_URL);
    countUrl.search = new URLSearchParams({ where, returnCountOnly: "true", f: "json" }).toString();
    const countResponse = await fetch(countUrl, { signal: AbortSignal.timeout(15000) });
    if (!countResponse.ok) return json({ error: "GRID3 count request failed", upstream_status: countResponse.status }, 502);
    const countData = await countResponse.json();
    if (countData.error) return json({ error: "GRID3 count query rejected", details: countData.error.message }, 502);
    const total = Number(countData.count || 0);
    if (!Number.isFinite(total) || total < 0 || total > 100000) return json({ error: "Unexpected result count", matching_record_count: total }, 502);

    const all: any[] = [];
    for (let offset = 0; offset < total; offset += 1000) {
      const params = new URLSearchParams({
        where,
        outFields: "OBJECTID,globalid,nhfr_uid,nhfr_facility_code,country,iso,state,lga,ward,facility_name,ownership,ownership_type,facility_level,latitude,longitude,geocoordinates_source,last_updated",
        returnGeometry: "false", orderByFields: "OBJECTID",
        resultOffset: String(offset), resultRecordCount: "1000", f: "json"
      });
      const response = await fetch(LAYER_URL + "?" + params.toString(), { signal: AbortSignal.timeout(20000) });
      if (!response.ok) return json({ error: "GRID3 page request failed", upstream_status: response.status, offset }, 502);
      const data = await response.json();
      if (data.error) return json({ error: "GRID3 page query rejected", details: data.error.message, offset }, 502);
      const page = Array.isArray(data.features) ? data.features : [];
      all.push(...page);
      if (!page.length) break;
    }

    const seen = new Set<string>();
    const records = all.map((f: any) => {
      const a = f.attributes || {};
      const lat = a.latitude == null ? null : Number(a.latitude);
      const lon = a.longitude == null ? null : Number(a.longitude);
      const name = String(a.facility_name || "").trim();
      const lga = String(a.lga || "").trim();
      const key = String(a.globalid || a.nhfr_uid || (name + "|" + lga + "|" + lat + "|" + lon));
      if (seen.has(key)) return null;
      seen.add(key);
      const lgaValid = scope !== "ogun" || OGUN_LGAS.has(lga.toLowerCase());
      return {
        source_record_id: String(a.globalid || a.OBJECTID),
        lga_validation_status: scope !== "ogun" ? "not_applicable_to_nationwide_preview" : (lgaValid ? "ogun_lga_match" : "lga_not_in_ogun"),
        nhfr_uid: a.nhfr_uid ?? null,
        nhfr_facility_code: a.nhfr_facility_code ?? null,
        public_name: name || "Unnamed facility",
        state: a.state ?? null, local_government_area: lga || null, ward: a.ward ?? null,
        ownership: a.ownership ?? a.ownership_type ?? null, facility_level: a.facility_level ?? null,
        latitude: Number.isFinite(lat) && lat >= 4.0 && lat <= 14.5 ? lat : null,
        longitude: Number.isFinite(lon) && lon >= 2.0 && lon <= 15.5 ? lon : null,
        geocoordinates_source: a.geocoordinates_source ?? null,
        source_last_updated: a.last_updated ?? null,
        source_status: "external_unverified",
        raw_attributes: a
      };
    }).filter(Boolean);
    const coordinateValid = records.filter((r: any) => r.latitude !== null && r.longitude !== null).length;

    if (action === "stage_for_review") {
      // Stage into the restricted review queue only. Never publish to the public directory.
      const stagedRows = records.map((r: any) => ({
        source_id: SOURCE_ID,
        source_record_id: r.source_record_id,
        nhfr_uid: r.nhfr_uid == null ? null : String(r.nhfr_uid),
        nhfr_facility_code: r.nhfr_facility_code == null ? null : String(r.nhfr_facility_code),
        public_name: r.public_name,
        country_code: "NG",
        state: r.state,
        local_government_area: r.local_government_area,
        ward: r.ward,
        ownership: r.ownership,
        facility_level: r.facility_level,
        latitude: r.latitude,
        longitude: r.longitude,
        geocoordinates_source: r.geocoordinates_source,
        source_last_updated: r.source_last_updated || null,
        source_url: "https://services3.arcgis.com/BU6Aadhn6tbBEdyk/arcgis/rest/services/GRID3_NGA_health_facilities_v2_0/FeatureServer/0",
        data_license: "CC BY 4.0",
        attribution_text: "Source: GRID3 NGA Health Facilities v2.0; Center for Integrated Earth System Information (CIESIN), Columbia University, 2024. DOI: 10.7916/kv1n-0743. Licensed under CC BY 4.0.",
        raw_attributes: r.raw_attributes || {},
        review_status: r.latitude !== null && r.longitude !== null && String(r.public_name || "").trim() ? "review_required" : "needs_correction",
        review_notes: r.latitude !== null && r.longitude !== null && String(r.public_name || "").trim() ? null : "AUTOMATED DATA-QUALITY FLAG: facility name or coordinates are missing/outside Nigeria validation bounds. Human correction required before publication."
      }));
      let inserted = 0;
      for (let offset = 0; offset < stagedRows.length; offset += 250) {
        const batch = stagedRows.slice(offset, offset + 250);
        const { data: saved, error: saveError } = await adminClient
          .from("healthos_grid3_hospital_staging")
          .upsert(batch, { onConflict: "source_id,source_record_id", ignoreDuplicates: true })
          .select("id");
        if (saveError) return json({ error: "Staging batch failed", details: saveError.message, inserted_before_error: inserted }, 500);
        inserted += saved?.length || 0;
      }
      return json({
        mode: "staged_for_human_review", staged: true, published: false,
        source_id: SOURCE_ID, dataset: "GRID3_NGA_health_facilities_v2_0",
        matching_record_count: total, retrieved_record_count: all.length,
        unique_record_count: records.length, newly_staged_count: inserted,
        coordinate_valid_count: coordinateValid,
        coordinate_missing_or_out_of_bounds_count: records.length - coordinateValid,
        review_status: "review_required",
        notice: "Records were copied only into the restricted GRID3 staging review table. They are not public, not verified, and not HealthOS AI network members."
      });
    }
    return json({
      mode: "preview_only", staged: false, published: false, source_id: SOURCE_ID,
      dataset: "GRID3_NGA_health_facilities_v2_0", scope, state: scope === "state" ? stateFilter : (scope === "ogun" ? "Ogun" : "ALL_NIGERIA"),
      matching_record_count: total, retrieved_record_count: all.length,
      unique_record_count: records.length, preview_count: records.length, records,
      coordinate_valid_count: coordinateValid,
      coordinate_missing_or_out_of_bounds_count: records.length - coordinateValid,
      notice: "Read-only preview. No database writes. All records remain externally sourced and unverified. Nationwide and state previews do not approve the source or publish facilities."
    });
  } catch (error) {
    return json({ error: "Collector failed", details: String(error) }, 500);
  }
});