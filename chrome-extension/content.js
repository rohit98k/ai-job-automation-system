// Content script injected on LinkedIn job pages.
// Responsible only for scraping job data from the DOM.

function getFirstText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }
  return "";
}

function getJobDescription() {
  const candidates = [
    'div[data-test="job-description"]',
    "div.jobs-description-content__text",
    "div.show-more-less-html__markup",
    "section.jobs-description",
  ];

  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.innerText && el.innerText.trim()) {
      return el.innerText.trim();
    }
  }

  // Fallback: try a large main content container
  const main = document.querySelector("main") || document.body;
  return main.innerText ? main.innerText.trim() : "";
}

function extractJobData() {
  const url = window.location.href;
  let title = "";
  let company = "";
  let jobDescription = "";

  if (url.includes("linkedin.com")) {
    title = getFirstText(['h1[data-test-job-title="true"]', "h1.top-card-layout__title", "h1.jobs-unified-top-card__job-title", "h1"]);
    company = getFirstText(['a[data-test="topcard-org-name-link"]', "a.topcard__org-name-link", "a.jobs-unified-top-card__company-name", "div.jobs-unified-top-card__subtitle-primary-group a"]);
    jobDescription = getJobDescription();
  } else if (url.includes("naukri.com")) {
    title = getFirstText(["h1.jd-header-title", "h1"]);
    company = getFirstText(["div.jd-header-comp-name a", "a.jd-header-comp-name"]);
    jobDescription = getFirstText(["div.job-desc", "section.job-desc", "div.styles_JDC__Text__0H15v"]);
  } else if (url.includes("indeed.com")) {
    title = getFirstText(["h1.jobsearch-JobInfoHeader-title", "h2.jobsearch-JobInfoHeader-title", "h1"]);
    company = getFirstText(["div[data-company-name='true']", "div.jobsearch-CompanyInfoContainer a"]);
    jobDescription = getFirstText(["div#jobDescriptionText", "div.jobsearch-jobDescriptionText"]);
  } else if (url.includes("glassdoor.com")) {
    title = getFirstText(["div[data-test='job-title']", "h1"]);
    company = getFirstText(["div[data-test='employer-name']", "h4"]);
    jobDescription = getFirstText(["div#JobDescriptionContainer", "div.JobDetails_jobDescriptionWrapper__ls_J7"]);
  }

  // Fallbacks if logic above fails
  if (!title) title = getFirstText(["h1"]);
  if (!jobDescription) jobDescription = getJobDescription() || document.body.innerText.trim();

  return { title, company, jobDescription, url };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "EXTRACT_JOB_DATA") {
    try {
      const job = extractJobData();
      sendResponse({ ok: true, job });
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || "Failed to extract job data" });
    }
  } else if (message && message.type === "AUTO_APPLY") {
    try {
      const candidates = [
        'button[aria-label*="Easy Apply"]',
        'button:has(span:contains("Easy Apply"))',
      ];
      let clicked = false;
      for (const sel of candidates) {
        const btn = document.querySelector(sel);
        if (btn) {
          btn.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        sendResponse({ ok: false, error: "Easy Apply button nahi mila." });
      } else {
        sendResponse({ ok: true });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || "Auto apply click fail ho gaya." });
    }
  }
  // Indicate we may send an async response (even though we respond sync).
  return true;
});

// Magic Apply UI Injection
if (window.location.href.includes("linkedin.com/jobs/search")) {
  // Give the DOM a second to load before injecting
  setTimeout(injectMagicButton, 2000);
}

function injectMagicButton() {
  if (document.getElementById("magic-apply-btn")) return;
  const btn = document.createElement("button");
  btn.id = "magic-apply-btn";
  btn.innerText = "✨ Magic Apply All";
  btn.style.cssText = "position: fixed; bottom: 30px; right: 30px; z-index: 99999; padding: 15px 30px; background: linear-gradient(to right, #7c3aed, #4f46e5); color: white; border-radius: 50px; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4); font-size: 16px; transition: transform 0.2s; font-family: -apple-system, system-ui, sans-serif;";
  
  btn.onmouseover = () => btn.style.transform = "scale(1.05)";
  btn.onmouseout = () => btn.style.transform = "scale(1)";

  btn.onclick = async () => {
    btn.innerText = "⏳ Applying...";
    btn.style.background = "#64748b";
    
    // Find all job cards on the left side
    const cards = document.querySelectorAll("li.jobs-search-results__list-item");
    if (cards.length === 0) {
      alert("No job cards found. Make sure you are on a LinkedIn jobs search page.");
      btn.innerText = "✨ Magic Apply All";
      btn.style.background = "linear-gradient(to right, #7c3aed, #4f46e5)";
      return;
    }

    let appliedCount = 0;

    for (let i = 0; i < cards.length; i++) {
        cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
        cards[i].click();
        
        // Wait for the right pane to load the job details
        await new Promise(r => setTimeout(r, 2000)); 
        
        // Try to easy apply
        let applyBtn = document.querySelector('button[aria-label*="Easy Apply"], button.jobs-apply-button');
        if (applyBtn && applyBtn.innerText.includes("Easy Apply")) {
            applyBtn.click();
            await new Promise(r => setTimeout(r, 1500)); 
            
            // Try to click "Next" or "Submit" up to 3 times for multi-step modals
            for(let step=0; step<4; step++){
               let submitBtn = document.querySelector('button[aria-label="Submit application"]');
               if(submitBtn) { 
                 submitBtn.click(); 
                 appliedCount++;
                 await new Promise(r => setTimeout(r, 2000)); 
                 break; 
               }
               
               let nextBtn = document.querySelector('button[aria-label="Continue to next step"]');
               if(nextBtn) { 
                 nextBtn.click(); 
                 await new Promise(r => setTimeout(r, 1000)); 
               } else {
                 break; // No next or submit, might be external link or complex form
               }
            }
            
            // Dismiss modal if stuck or finished success dialog
            let dismissBtn = document.querySelector('button[aria-label="Dismiss"]');
            if(dismissBtn) {
              dismissBtn.click();
              await new Promise(r => setTimeout(r, 500));
              let discardBtn = document.querySelector('button[data-control-name="discard_application_confirm_btn"]');
              if (discardBtn) discardBtn.click(); // discard if it was stuck
            }
        }
    }
    
    btn.innerText = `✨ Applied to ${appliedCount}!`;
    btn.style.background = "#10b981"; // Success Green
    setTimeout(() => {
      btn.innerText = "✨ Magic Apply All";
      btn.style.background = "linear-gradient(to right, #7c3aed, #4f46e5)";
    }, 5000);
  };
  
  document.body.appendChild(btn);
}

