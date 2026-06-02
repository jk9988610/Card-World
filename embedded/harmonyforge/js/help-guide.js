/**
 * Help center — tabbed content from locales/*.json (help.panels)
 */
const HelpGuide = (() => {
  function getPanels() {
    const panels = window.HFI18n?.getMessages?.()?.help?.panels;
    return Array.isArray(panels) && panels.length ? panels : [];
  }

  function init() {
    if (init._done) return;
    init._done = true;
    const dialog = document.getElementById("helpDialog");
    if (!dialog) return;

    const nav = dialog.querySelector(".help-tabs");
    const body = dialog.querySelector(".help-tab-panels");
    if (!nav || !body) return;

    const PANELS = getPanels();
    nav.innerHTML = "";
    body.innerHTML = "";

    PANELS.forEach((panel, i) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "help-tab" + (i === 0 ? " active" : "");
      tab.dataset.helpTab = panel.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", i === 0 ? "true" : "false");
      tab.textContent = panel.label;
      nav.appendChild(tab);

      const article = document.createElement("article");
      article.className = "help-panel";
      article.dataset.panel = panel.id;
      article.setAttribute("role", "tabpanel");
      article.hidden = i !== 0;
      article.innerHTML = panel.html;
      body.appendChild(article);
    });

    nav.addEventListener("click", (e) => {
      const tab = e.target.closest(".help-tab");
      if (!tab) return;
      const id = tab.dataset.helpTab;
      nav.querySelectorAll(".help-tab").forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      body.querySelectorAll(".help-panel").forEach((p) => {
        p.hidden = p.dataset.panel !== id;
      });
    });
  }

  return { init, getPanels };
})();
