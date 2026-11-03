/* HealthOS AI Advanced OCR Intelligence — browser-local receipt extraction.
 * OCR text is processed in the user's browser. No OCR text or image is sent to an AI/OCR API.
 * Extracted values are suggestions only; staff must verify every field before submission.
 */
(function () {
  "use strict";
  const form = document.getElementById("posReceiptUploadForm");
  const fileInput = document.getElementById("posReceiptFile");
  if (!form || !fileInput) return;

  const fieldIds = {
    provider: "posReceiptProvider",
    reference: "posReceiptReference",
    amount: "posReceiptAmount",
    date: "posReceiptDate"
  };
  let workerPromise = null;
  let lastProcessedFile = null;

  function message(text, kind) {
    let node = document.getElementById("healthOSReceiptOcrMessage");
    if (!node) {
      node = document.createElement("p");
      node.id = "healthOSReceiptOcrMessage";
      node.className = "message";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      fileInput.insertAdjacentElement("afterend", node);
    }
    node.textContent = text;
    node.className = "message" + (kind ? " " + kind : "");
  }

  function setIfEmpty(id, value) {
    const input = document.getElementById(id);
    if (input && value && !String(input.value || "").trim()) input.value = value;
  }

  function parseReceipt(text) {
    const clean = String(text || "").replace(/\r/g, "\n");
    const lines = clean.split("\n").map(x => x.trim()).filter(Boolean);
    const joined = lines.join(" ");
    const result = { provider: "", reference: "", amount: "", date: "", detected: [] };

    const providerLine = lines.find(line => /\b(mon(i|ie)point|opay|palmpay|paystack|flutterwave|interswitch|gtbank|guaranty trust|access bank|zenith bank|uba|first bank|stanbic|fidelity bank|kuda|sterling bank)\b/i.test(line));
    if (providerLine) result.provider = providerLine.slice(0, 100);

    const refMatch = joined.match(/(?:transaction|trans\.?|session|rrn|retrieval|reference|ref\.?|stan)\s*(?:id|no\.?|number|#|:)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/-]{5,})/i);
    if (refMatch) result.reference = refMatch[1].slice(0, 150);

    const amountMatches = [...joined.matchAll(/(?:₦|NGN|N)\s?([0-9][0-9,]*(?:\.\d{2})?)/gi)];
    const labelledAmount = joined.match(/(?:amount|total|paid|debit|credit)\s*(?:paid)?\s*[:=-]?\s*(?:₦|NGN|N)?\s?([0-9][0-9,]*(?:\.\d{2})?)/i);
    const amountRaw = labelledAmount ? labelledAmount[1] : (amountMatches.length ? amountMatches[amountMatches.length - 1][1] : "");
    if (amountRaw) {
      const n = Number(amountRaw.replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0 && n < 100000000000) result.amount = n.toFixed(2);
    }

    const dateMatch = joined.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?))?/i);
    if (dateMatch) {
      const parts = dateMatch[1].split(/[\/-]/);
      let day = Number(parts[0]), month = Number(parts[1]), year = Number(parts[2]);
      if (year < 100) year += year < 50 ? 2000 : 1900;
      // Receipt formats vary; assume DD/MM/YYYY only when unambiguous.
      if (day > 12 && month <= 12) {
        const d = new Date(year, month - 1, day);
        if (!Number.isNaN(d.getTime())) result.date = dateMatch[1] + (dateMatch[2] ? " " + dateMatch[2] : "");
      }
    }
    if (result.provider) result.detected.push("provider");
    if (result.reference) result.detected.push("reference");
    if (result.amount) result.detected.push("amount");
    if (result.date) result.detected.push("date");
    return result;
  }

  async function getWorker() {
    if (workerPromise) return workerPromise;
    workerPromise = new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve(window.Tesseract);
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.async = true;
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR library did not initialise."));
      script.onerror = () => reject(new Error("Could not load the browser OCR engine. Check internet access and try again."));
      document.head.appendChild(script);
    });
    return workerPromise;
  }

  async function runOcr(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      message("Automatic OCR currently supports JPG, PNG and WebP images. PDF evidence remains attached for manual review.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message("This image exceeds the 10 MB evidence limit.", "error");
      return;
    }
    if (lastProcessedFile === file) return;
    lastProcessedFile = file;
    message("Reading receipt locally in this browser. Do not close this page…");
    try {
      const Tesseract = await getWorker();
      const worker = await Tesseract.createWorker("eng");
      try {
        const result = await worker.recognize(file);
        const extractedText = result && result.data ? result.data.text : "";
        const parsed = parseReceipt(extractedText);
        setIfEmpty(fieldIds.provider, parsed.provider);
        setIfEmpty(fieldIds.reference, parsed.reference);
        setIfEmpty(fieldIds.amount, parsed.amount);
        // Dates are intentionally not auto-filled because receipt date formats are ambiguous.
        let preview = document.getElementById("healthOSReceiptOcrPreview");
        if (!preview) {
          preview = document.createElement("details");
          preview.id = "healthOSReceiptOcrPreview";
          preview.innerHTML = "<summary>Review OCR text</summary><pre></pre>";
          const note = document.getElementById("healthOSReceiptOcrMessage");
          note.insertAdjacentElement("afterend", preview);
        }
        preview.querySelector("pre").textContent = extractedText.slice(0, 12000) || "No readable text found.";
        const found = parsed.detected.length ? parsed.detected.join(", ") : "no reliable fields";
        message("OCR completed. Suggested fields: " + found + ". Verify the original receipt and correct every field before recording. OCR does not confirm payment or bank settlement.", "success");
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      lastProcessedFile = null;
      console.error("HealthOS receipt OCR failed:", error);
      message(error.message || "OCR failed. You can still enter the receipt details manually.", "error");
    }
  }

  fileInput.addEventListener("change", () => {
    lastProcessedFile = null;
    const file = fileInput.files && fileInput.files[0];
    if (file) void runOcr(file);
  });
  console.log("HealthOS browser-local receipt OCR module initialised.");
})();
