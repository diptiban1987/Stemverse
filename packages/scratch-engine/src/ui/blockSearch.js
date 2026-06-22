let searchContainer = null;
let searchInput = null;
let suggestionsList = null;
let blockIndex = [];
let activeWorkspace = null;
let currentToolboxDef = null;

function indexBlocks(toolbox, path = []) {
  const results = [];
  if (!toolbox || !toolbox.contents) return results;
  for (const item of toolbox.contents) {
    if (item.kind === "category") {
      const catPath = [...path, item.name];
      if (item.contents) results.push(...indexBlocks(item, catPath));
    } else if (item.kind === "block" && item.type) {
      results.push({ type: item.type, path: [...path] });
    }
  }
  return results;
}

function getBlockDisplayName(type) {
  return type
    .replace(/esp32_/g, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildIndex(toolboxDef) {
  if (toolboxDef) currentToolboxDef = toolboxDef;
  if (!currentToolboxDef) return;
  const blocks = indexBlocks(currentToolboxDef);
  for (const block of blocks) {
    block.displayName = getBlockDisplayName(block.type);
    block.searchText = (
      block.displayName + " " + block.type + " " + block.path.join(" ")
    ).toLowerCase();
  }
  blockIndex = blocks;
}

function filterBlocks(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return blockIndex.filter((b) => b.searchText.includes(q)).slice(0, 12);
}

function showSuggestions(results) {
  suggestionsList.innerHTML = "";
  if (results.length === 0) {
    suggestionsList.style.display = "none";
    return;
  }
  for (const result of results) {
    const itemEl = document.createElement("div");
    itemEl.className = "block-search-suggestion";
    itemEl.innerHTML = `
      <span class="block-search-suggestion-name">${escapeHtml(result.displayName)}</span>
      <span class="block-search-suggestion-path">${escapeHtml(result.path.join(" › "))}</span>
    `;
    itemEl.addEventListener("click", () => {
      addBlockToWorkspace(result.type);
      hideSuggestions();
      searchInput.value = "";
      searchInput.blur();
    });
    suggestionsList.appendChild(itemEl);
  }
  suggestionsList.style.display = "block";
}

function hideSuggestions() {
  suggestionsList.style.display = "none";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addBlockToWorkspace(type) {
  if (!activeWorkspace) return;
  try {
    const block = activeWorkspace.newBlock(type);
    if (!block) return;
    if (block.initSvg) block.initSvg();
    if (block.renderEfficiently) {
      block.renderEfficiently();
    } else if (block.render) {
      block.render();
    }
    const metrics = activeWorkspace.getMetrics();
    if (metrics) {
      const w = block.getWidth ? block.getWidth() : 100;
      const h = block.getHeight ? block.getHeight() : 50;
      const x = metrics.viewWidth / 2 + metrics.viewLeft - w / 2;
      const y = metrics.viewHeight / 2 + metrics.viewTop - h / 2;
      block.moveBy(x, y);
    }
    if (block.select) block.select();
  } catch (err) {
    console.error("Failed to add block:", err);
  }
}

function getToolboxEl() {
  return document.querySelector(".blocklyToolboxDiv, .blocklyToolbox");
}

function injectSearchUI(toolboxEl) {
  if (!toolboxEl || searchContainer) return;

  searchContainer = document.createElement("div");
  searchContainer.className = "block-search-container";

  searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "block-search-input";
  searchInput.placeholder = "Search...";
  searchInput.autocomplete = "off";
  searchInput.spellcheck = false;

  suggestionsList = document.createElement("div");
  suggestionsList.className = "block-search-suggestions";
  suggestionsList.style.display = "none";

  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(suggestionsList);

  // Insert as the first child inside the toolbox div so it naturally
  // reserves space and pushes categories down.
  toolboxEl.insertBefore(searchContainer, toolboxEl.firstChild);

  console.log("[blockSearch] Search UI injected into toolbox.");

  // Input handling
  let debounceTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const results = filterBlocks(searchInput.value);
      showSuggestions(results);
    }, 150);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideSuggestions();
      searchInput.blur();
    }
  });

  // Click outside to close suggestions
  document.addEventListener("click", (e) => {
    if (searchContainer && !searchContainer.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Focus shortcut (Ctrl+K or Cmd+K)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    }
  });
}

function ensureSearchInjected() {
  const toolboxEl = getToolboxEl();
  if (toolboxEl) {
    injectSearchUI(toolboxEl);
    return true;
  }
  return false;
}

// ── Robust toolbox watcher ───────────────────────────
let toolboxObserver = null;

function watchForToolbox() {
  if (toolboxObserver) return;

  toolboxObserver = new MutationObserver(() => {
    if (!searchContainer) {
      const toolboxEl = getToolboxEl();
      if (toolboxEl) {
        injectSearchUI(toolboxEl);
      }
    }
  });

  toolboxObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function initBlockSearch(workspace, toolboxDef) {
  activeWorkspace = workspace;
  buildIndex(toolboxDef);

  if (searchContainer) return;

  if (ensureSearchInjected()) return;

  // If not immediately available, watch for the toolbox mutation and retry periodically
  watchForToolbox();

  let attempts = 0;
  const interval = setInterval(() => {
    if (ensureSearchInjected() || ++attempts > 60) {
      clearInterval(interval);
      if (!searchContainer) {
        console.warn("[blockSearch] Toolbox element not found after polling; search UI may not appear.");
      }
    }
  }, 250);
}

export function refreshBlockSearch(toolboxDef) {
  buildIndex(toolboxDef);
  // Toolbox may have been recreated after a mode switch — re-inject if needed.
  if (searchContainer && !document.contains(searchContainer)) {
    searchContainer = null;
    searchInput = null;
    suggestionsList = null;
  }
  ensureSearchInjected();
}
