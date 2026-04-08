// 全站公共脚本：导航、动效、数据加载兜底、二维码弹窗
(function () {
  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fetchWithFallback(url, fallbackKey) {
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("fetch failed: " + url);
        return res.json();
      })
      .catch(function () {
        var fallback = window.FALLBACK_DATA && window.FALLBACK_DATA[fallbackKey];
        if (!fallback) return [];
        return deepClone(fallback);
      });
  }

  function resolvePath(rawPath, prefix) {
    if (!rawPath) return "#";
    if (/^(https?:)?\/\//.test(rawPath)) return rawPath;
    if (rawPath.startsWith("#")) return rawPath;
    if (rawPath.startsWith("mailto:") || rawPath.startsWith("tel:")) return rawPath;
    if (rawPath.startsWith("../") || rawPath.startsWith("./")) return rawPath;
    return (prefix || "") + rawPath;
  }

  function initNav(config) {
    var options = config || {};
    var currentKey = options.currentKey || "";
    var nav = document.querySelector("[data-nav]");
    var navLinks = document.querySelectorAll("[data-nav-link]");
    var menuBtn = document.querySelector("[data-menu-btn]");
    var menuPanel = document.querySelector("[data-menu-panel]");

    navLinks.forEach(function (link) {
      if (link.getAttribute("data-nav-key") === currentKey) {
        link.classList.add("is-active");
      }
    });

    if (menuBtn && menuPanel && !menuBtn.dataset.bound) {
      menuBtn.dataset.bound = "1";
      menuBtn.addEventListener("click", function () {
        var hidden = menuPanel.classList.contains("hidden");
        menuPanel.classList.toggle("hidden");
        menuBtn.setAttribute("aria-expanded", String(hidden));
      });
      menuPanel.querySelectorAll("a").forEach(function (item) {
        item.addEventListener("click", function () {
          menuPanel.classList.add("hidden");
          menuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    function onScroll() {
      if (!nav) return;
      if (window.scrollY > 8) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
  }

  function initReveal(root) {
    var container = root || document;
    var revealNodes = container.querySelectorAll(".reveal");
    if (!revealNodes.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    revealNodes.forEach(function (node, index) {
      if (node.dataset.revealBound === "1") return;
      node.dataset.revealBound = "1";
      node.style.transitionDelay = Math.min(index * 70, 280) + "ms";
      observer.observe(node);
    });
  }

  function ensureQrModal() {
    var existing = document.getElementById("qr-modal-overlay");
    if (existing) return existing;

    var overlay = document.createElement("div");
    overlay.id = "qr-modal-overlay";
    overlay.className = "qr-overlay";
    overlay.innerHTML = [
      '<div class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">',
      '  <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">',
      '    <h3 id="qr-modal-title" class="text-sm font-bold text-slate-900">平台二维码</h3>',
      '    <button id="qr-close-btn" type="button" class="rounded-md border border-slate-300 px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-100">×</button>',
      "  </div>",
      '  <div class="px-5 py-5">',
      '    <div class="qr-image-wrap">',
      '      <img id="qr-modal-image" alt="二维码" class="hidden">',
      '      <span id="qr-modal-placeholder" class="px-4 text-xs font-semibold text-slate-500"></span>',
      "    </div>",
      '    <p id="qr-modal-hint" class="mt-4 text-center text-xs leading-relaxed text-slate-500"></p>',
      "  </div>",
      "</div>"
    ].join("");

    document.body.appendChild(overlay);
    return overlay;
  }

  function initQrModal(config) {
    var options = config || {};
    var assetPrefix = options.assetPrefix || "";
    var qrMap = (window.FALLBACK_DATA && window.FALLBACK_DATA.qrMap) || {};
    var overlay = ensureQrModal();
    var card = overlay.querySelector(".qr-modal");
    var closeBtn = document.getElementById("qr-close-btn");
    var modalTitle = document.getElementById("qr-modal-title");
    var modalHint = document.getElementById("qr-modal-hint");
    var modalImage = document.getElementById("qr-modal-image");
    var modalPlaceholder = document.getElementById("qr-modal-placeholder");

    function closeModal() {
      overlay.classList.remove("is-open");
      document.body.classList.remove("overflow-hidden");
    }

    function openModal(platformKey) {
      var meta = qrMap[platformKey];
      if (!meta) return;
      modalTitle.textContent = meta.name;
      modalHint.textContent = meta.hint;
      modalPlaceholder.textContent = meta.placeholder;
      modalPlaceholder.classList.remove("hidden");
      modalImage.classList.add("hidden");
      modalImage.removeAttribute("src");

      // 优先加载 photo 目录（便于你本地直接替换），失败再回退到 assets 目录
      var sourcePaths = [meta.liveImagePath, meta.imagePath].filter(Boolean).map(function (rawPath) {
        var resolved = resolvePath(rawPath, assetPrefix);
        var separator = resolved.indexOf("?") === -1 ? "?" : "&";
        // 每次打开弹窗都带时间戳，规避浏览器缓存导致的“图片不更新”
        return resolved + separator + "v=" + Date.now();
      });

      function loadByIndex(index) {
        if (index >= sourcePaths.length) {
          modalImage.classList.add("hidden");
          modalPlaceholder.classList.remove("hidden");
          return;
        }

        modalImage.onload = function () {
          modalImage.classList.remove("hidden");
          modalPlaceholder.classList.add("hidden");
        };
        modalImage.onerror = function () {
          loadByIndex(index + 1);
        };
        modalImage.src = sourcePaths[index];
      }

      loadByIndex(0);

      overlay.classList.add("is-open");
      document.body.classList.add("overflow-hidden");
    }

    if (!overlay.dataset.bound) {
      overlay.dataset.bound = "1";
      closeBtn.addEventListener("click", closeModal);
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) closeModal();
      });
      card.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      window.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModal();
      });
    }

    if (!document.body.dataset.qrBound) {
      document.body.dataset.qrBound = "1";
      document.addEventListener("click", function (event) {
        var trigger = event.target.closest("[data-qr-platform]");
        if (!trigger) return;
        event.preventDefault();
        openModal(trigger.getAttribute("data-qr-platform"));
      });
    }
  }

  function sortByDateDesc(items) {
    return (items || []).slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  }

  function uniqueByTitle(items) {
    var seen = {};
    return (items || []).filter(function (item) {
      var key = String((item && item.title) || "").trim().replace(/\s+/g, " ").toLowerCase();
      if (!key) return true;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function resolvePageOverride(data, pageId) {
    if (!data || !pageId) return null;
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i += 1) {
        if (data[i] && data[i].id === pageId) return data[i];
      }
      return null;
    }
    if (typeof data === "object") {
      return data[pageId] || null;
    }
    return null;
  }

  function renderPageOverride(config) {
    var options = config || {};
    var pageId = options.pageId;
    var containerId = options.containerId || "dynamic-page-content";
    var staticSelector = options.staticSelector || ".site-static";
    var dataPath = options.dataPath || "data/site-pages.json";
    var fallbackKey = options.fallbackKey || "sitePages";
    var container = document.getElementById(containerId);
    if (!pageId || !container) return Promise.resolve();

    return fetchWithFallback(dataPath, fallbackKey).then(function (data) {
      var page = resolvePageOverride(data, pageId);
      if (!page || !page.contentHtml) return;

      if (page.title) {
        document.title = "奇绩怪谈AIQ | " + page.title;
      }

      container.innerHTML = [
        '<article class="reveal rounded-3xl border border-slate-200 bg-white p-6 md:p-10">',
        '  <p class="text-sm font-semibold text-blue-600">页面文案（自动同步）</p>',
        '  <h1 class="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">' + (page.title || "") + '</h1>',
        '  <p class="mt-3 text-sm leading-relaxed text-slate-600">' + (page.description || "") + '</p>',
        '  <div class="article-content mt-8">' + page.contentHtml + "</div>",
        "</article>"
      ].join("");

      var staticNodes = document.querySelectorAll(staticSelector);
      staticNodes.forEach(function (node) {
        node.classList.add("hidden");
      });

      container.classList.remove("hidden");
      initReveal(container);
    });
  }

  window.SiteCommon = {
    fetchWithFallback: fetchWithFallback,
    resolvePath: resolvePath,
    initNav: initNav,
    initReveal: initReveal,
    initQrModal: initQrModal,
    sortByDateDesc: sortByDateDesc,
    uniqueByTitle: uniqueByTitle,
    renderPageOverride: renderPageOverride
  };
})();
