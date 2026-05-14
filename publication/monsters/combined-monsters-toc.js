document.addEventListener("DOMContentLoaded", () => {
  const toc = document.getElementById("TOC");
  if (!toc) {
    return;
  }

  const topItems = toc.querySelectorAll(":scope > ul > li");

  for (const item of topItems) {
    const childList = item.querySelector(":scope > ul");
    const link = item.querySelector(":scope > a");

    if (!childList || !link) {
      continue;
    }

    item.classList.add("toc-section");
    link.setAttribute("aria-expanded", "false");

    link.addEventListener("click", (event) => {
      event.preventDefault();
      const open = item.classList.toggle("open");
      link.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  const hash = window.location.hash;
  if (!hash) {
    return;
  }

  const active = toc.querySelector(`a[href="${hash}"]`);
  if (!active) {
    return;
  }

  const section = active.closest(".toc-section");
  if (!section) {
    return;
  }

  section.classList.add("open");
  const sectionLink = section.querySelector(":scope > a");
  if (sectionLink) {
    sectionLink.setAttribute("aria-expanded", "true");
  }
});
