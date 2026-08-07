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

  function ensureIcpRecord() {
    var footer = document.querySelector("footer");
    if (!footer) return;
    if (footer.querySelector("[data-icp-record]")) return;

    var icpWrap = document.createElement("div");
    icpWrap.className = "border-t border-slate-200/80";
    icpWrap.innerHTML = [
      '<div class="mx-auto w-full max-w-6xl px-4 py-3 text-center text-xs text-slate-500 sm:px-6 lg:px-8">',
      '  <a data-icp-record href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" class="transition hover:text-blue-600 hover:underline">工信部备案号：粤ICP备2026039646号</a>',
      "</div>"
    ].join("");

    footer.appendChild(icpWrap);
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
        document.title = "我是林kunki | " + page.title;
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

  function initSiteParticles() {
    if (document.body.dataset.siteParticlesBound === "1") return;
    document.body.dataset.siteParticlesBound = "1";

    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    var canvas = document.createElement("canvas");
    canvas.className = "site-particle-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("data-site-particles", "");
    document.body.insertBefore(canvas, document.body.firstChild);

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var particles = [];
    var width = 0;
    var height = 0;
    var dpr = 1;
    var frameId = 0;
    var resizeTimer = 0;
    var pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      strength: 0.22,
      targetStrength: 0.22
    };

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function createParticle(index) {
      var depth = Math.random();
      var baseX = Math.random() * width;
      var baseY = Math.random() * height;
      return {
        baseX: baseX,
        baseY: baseY,
        x: baseX,
        y: baseY,
        size: 0.55 + Math.random() * 1.55,
        alpha: 0.16 + Math.random() * 0.28,
        depth: 0.55 + depth * 0.75,
        phase: Math.random() * Math.PI * 2 + index * 0.05,
        speed: 0.00038 + Math.random() * 0.00064,
        amplitude: 5 + Math.random() * 15,
        hueShift: Math.random()
      };
    }

    function resetParticles() {
      var density = window.innerWidth < 720 ? 12000 : 7600;
      var count = Math.round(clamp((width * height) / density, 56, 165));
      particles = [];
      for (var i = 0; i < count; i += 1) {
        particles.push(createParticle(i));
      }
    }

    function resizeCanvas() {
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pointer.x = pointer.targetX = width * 0.62;
      pointer.y = pointer.targetY = height * 0.38;
      resetParticles();
    }

    function updatePointer(event) {
      pointer.targetX = clamp(event.clientX, 0, width);
      pointer.targetY = clamp(event.clientY, 0, height);
      pointer.targetStrength = 1;
    }

    function fadePointer() {
      pointer.targetStrength = 0.22;
    }

    function drawCursorGlow() {
      if (pointer.strength < 0.04) return;
      var radius = 92 + pointer.strength * 96;
      var gradient = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
      gradient.addColorStop(0, "rgba(59, 130, 246, " + (0.14 * pointer.strength).toFixed(3) + ")");
      gradient.addColorStop(0.45, "rgba(99, 102, 241, " + (0.07 * pointer.strength).toFixed(3) + ")");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawParticle(particle, force) {
      var color = particle.hueShift > 0.78 ? "245, 158, 11" : particle.hueShift > 0.44 ? "99, 102, 241" : "59, 130, 246";
      var alpha = particle.alpha + force * 0.52;
      ctx.fillStyle = "rgba(" + color + ", " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size + force * 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    function render(time) {
      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointer.targetX - pointer.x) * 0.13;
      pointer.y += (pointer.targetY - pointer.y) * 0.13;
      pointer.strength += (pointer.targetStrength - pointer.strength) * 0.08;

      drawCursorGlow();

      var radius = window.innerWidth < 720 ? 145 : 220;
      var activeParticles = [];

      for (var i = 0; i < particles.length; i += 1) {
        var particle = particles[i];
        var ambientX = Math.sin(time * particle.speed + particle.phase) * particle.amplitude;
        var ambientY = Math.cos(time * particle.speed * 0.82 + particle.phase) * particle.amplitude * 0.68;
        var targetX = particle.baseX + ambientX;
        var targetY = particle.baseY + ambientY;
        var dx = targetX - pointer.x;
        var dy = targetY - pointer.y;
        var distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
        var force = Math.pow(Math.max(0, 1 - distance / radius), 2) * pointer.strength;

        if (force > 0) {
          var unitX = dx / distance;
          var unitY = dy / distance;
          var push = 56 * particle.depth * force;
          var swirl = 36 * particle.depth * force;
          targetX += unitX * push + unitY * swirl;
          targetY += unitY * push - unitX * swirl;
        }

        particle.x += (targetX - particle.x) * 0.078;
        particle.y += (targetY - particle.y) * 0.078;

        if (force > 0.05) {
          activeParticles.push({ particle: particle, force: force });
          ctx.strokeStyle = "rgba(59, 130, 246, " + (force * 0.16).toFixed(3) + ")";
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }

        drawParticle(particle, force);
      }

      for (var a = 0; a < activeParticles.length; a += 1) {
        for (var b = a + 1; b < activeParticles.length; b += 1) {
          var first = activeParticles[a].particle;
          var second = activeParticles[b].particle;
          var linkDx = first.x - second.x;
          var linkDy = first.y - second.y;
          var linkDistance = Math.sqrt(linkDx * linkDx + linkDy * linkDy);
          if (linkDistance > 74) continue;
          var linkAlpha = (1 - linkDistance / 74) * Math.min(activeParticles[a].force, activeParticles[b].force) * 0.22;
          ctx.strokeStyle = "rgba(99, 102, 241, " + linkAlpha.toFixed(3) + ")";
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(first.x, first.y);
          ctx.lineTo(second.x, second.y);
          ctx.stroke();
        }
      }

      frameId = window.requestAnimationFrame(render);
    }

    resizeCanvas();
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerleave", fadePointer);
    window.addEventListener("blur", fadePointer);
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeCanvas, 120);
    });

    frameId = window.requestAnimationFrame(render);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        window.cancelAnimationFrame(frameId);
        return;
      }
      frameId = window.requestAnimationFrame(render);
    });
  }

  window.SiteCommon = {
    fetchWithFallback: fetchWithFallback,
    resolvePath: resolvePath,
    initNav: initNav,
    initReveal: initReveal,
    initQrModal: initQrModal,
    initSiteParticles: initSiteParticles,
    sortByDateDesc: sortByDateDesc,
    uniqueByTitle: uniqueByTitle,
    renderPageOverride: renderPageOverride
  };

  function initCommonEffects() {
    ensureIcpRecord();
    initSiteParticles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCommonEffects);
  } else {
    initCommonEffects();
  }
})();
