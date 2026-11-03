/* HealthOS AI — patient medical document OCR preview.
 * Local-only extraction. Does not persist OCR text, update clinical records, or call an AI service.
 */
(function () {
 "use strict";
 const input=document.getElementById("patientFileInput");
 const button=document.getElementById("patientDocumentOcrButton");
 const status=document.getElementById("patientDocumentOcrStatus");
 const result=document.getElementById("patientDocumentOcrResult");
 const output=document.getElementById("patientDocumentOcrText");
 if(!input||!button||!status||!result||!output)return;
 let file=null;
 let libs={tesseract:null,pdfjs:null};
 function say(t,error){status.textContent=t;status.className="message"+(error?" error":" success");}
 function loadScript(src,test){return new Promise((resolve,reject)=>{if(test())return resolve();const s=document.createElement("script");s.src=src;s.async=true;s.onload=()=>test()?resolve():reject(new Error("Document reader did not initialise."));s.onerror=()=>reject(new Error("Could not load document reader. Check internet access."));document.head.appendChild(s);});}
 async function getTesseract(){if(!libs.tesseract)libs.tesseract=loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",()=>!!window.Tesseract).then(()=>window.Tesseract);return libs.tesseract;}
 async function getPdfJs(){if(!libs.pdfjs)libs.pdfjs=loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",()=>!!window.pdfjsLib).then(()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";return window.pdfjsLib;});return libs.pdfjs;}
 async function recogniseImage(worker,source){const r=await worker.recognize(source);return r&&r.data?r.data.text||"":"";}
 input.addEventListener("change",()=>{file=input.files&&input.files[0]||null;button.disabled=!file;result.hidden=true;output.textContent="";if(file)say("Selected: "+file.name+". Choose Read selected document to preview text.");});
 button.addEventListener("click",async()=>{
  if(!file)return;
  if(file.size>15*1024*1024){say("For this preview, select a document under 15 MB. The secure upload limit may differ.",true);return;}
  button.disabled=true;result.hidden=true;output.textContent="";
  let worker=null;
  try{
   const T=await getTesseract();worker=await T.createWorker("eng");
   let text="";
   if(file.type==="application/pdf"){
    const pdfjs=await getPdfJs();const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
    const pageCount=Math.min(pdf.numPages,5);
    for(let n=1;n<=pageCount;n++){
     say("Reading PDF page "+n+" of "+pageCount+" locally…");
     const page=await pdf.getPage(n);const viewport=page.getViewport({scale:1.7});
     const canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
     text+="\n\n--- Page "+n+" ---\n"+await recogniseImage(worker,canvas);
     canvas.width=canvas.height=1;
    }
    if(pdf.numPages>5)text+="\n\n[Preview limited to first 5 pages. Review the remaining pages in the original PDF.]";
   }else if(["image/jpeg","image/png","image/webp"].includes(file.type)){
    say("Reading image locally…");text=await recogniseImage(worker,file);
   }else if(file.type==="text/plain"){
    text=await file.text();
   }else{
    throw new Error("Preview supports PDF, JPG, PNG, WebP and plain-text files. Other file types can still be uploaded for manual review.");
   }
   output.textContent=text.slice(0,30000)||"No readable text detected. Review the original document.";
   result.hidden=false;
   say("Local preview ready. Verify every detail against the original. Nothing has been added to the medical record.",false);
  }catch(e){console.error("Patient document OCR preview:",e);say(e.message||"Could not read this document. You can still upload it for manual review.",true);}
  finally{if(worker)await worker.terminate();button.disabled=!file;}
 });
 console.log("HealthOS patient document OCR preview initialised.");
})();