(function () {
  function createCompanion() {
    var existing = document.querySelector("[data-kunki-companion]");
    if (existing) return existing;

    var companion = document.createElement("div");
    companion.className = "kunki-companion";
    companion.setAttribute("data-kunki-companion", "");
    companion.setAttribute("aria-live", "polite");
    companion.innerHTML = [
      '<div class="kunki-companion__bubble" data-kunki-bubble>点我一下，我可以带你逛这个站。</div>',
      '<button class="kunki-companion__person" data-kunki-person type="button" aria-label="和 Kunki 小助手说话">',
      '  <span class="kunki-companion__shadow" aria-hidden="true"></span>',
      '  <span class="kunki-companion__figure" aria-hidden="true">',
      '    <span class="kunki-companion__head">',
      '      <span class="kunki-companion__hair"></span>',
      '      <span class="kunki-companion__face"><span></span><span></span></span>',
      '    </span>',
      '    <span class="kunki-companion__body"><span class="kunki-companion__strap"></span></span>',
      '    <span class="kunki-companion__arm kunki-companion__arm--left"></span>',
      '    <span class="kunki-companion__arm kunki-companion__arm--right"></span>',
      '    <span class="kunki-companion__leg kunki-companion__leg--left"></span>',
      '    <span class="kunki-companion__leg kunki-companion__leg--right"></span>',
      '  </span>',
      '</button>'
    ].join("");
    document.body.appendChild(companion);
    return companion;
  }

  function initKunkiCompanion() {
    var companion = createCompanion();
    var person = companion.querySelector("[data-kunki-person]");
    var bubble = companion.querySelector("[data-kunki-bubble]");
    if (!companion || !person || !bubble || companion.dataset.bound === "1") return;
    companion.dataset.bound = "1";

    var messages = [
      "我在这儿。先看首饰系列，再看批发合作路径。",
      "如果你是在找个人站，左下角 K 可以进隐藏首页。",
      "这页是品牌展示页，我会陪你把产品、产地、合规路径走完。",
      "看到喜欢的款式，可以先点 Add to Inquiry，把询盘线索收起来。",
      "想交流个人项目和 AI 方法论，隐藏首页会更像我的工作台。",
      "我会在右下角待命。移动鼠标时，我会跟着你慢慢走。"
    ];
    var messageIndex = 0;
    var talkTimer = null;
    var isMobile = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var currentX = 0;
    var currentY = 0;
    var targetX = 0;
    var targetY = 0;
    var lastX = 0;
    var followPaused = false;
    var resumeTimer = null;
    var idleTimer = null;
    var idleDelay = 6200;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function setPosition(x, y) {
      currentX = x;
      currentY = y;
      targetX = x;
      targetY = y;
      companion.style.setProperty("--kunki-x", x.toFixed(2) + "px");
      companion.style.setProperty("--kunki-y", y.toFixed(2) + "px");
    }

    function placeAtRest() {
      isMobile = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
      var x = clamp(window.innerWidth - 132, 18, Math.max(window.innerWidth - 94, 18));
      var y = clamp(window.innerHeight - 178, 86, Math.max(window.innerHeight - 132, 86));
      setPosition(x, y);
    }

    function showMessage(text) {
      bubble.textContent = text;
      companion.classList.add("is-talking");
      window.clearTimeout(talkTimer);
      talkTimer = window.setTimeout(function () {
        companion.classList.remove("is-talking");
      }, 5200);
    }

    function wakeUp() {
      companion.classList.remove("is-sitting");
      window.clearTimeout(idleTimer);
    }

    function scheduleSit() {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(function () {
        if (followPaused) return;
        companion.classList.remove("is-walking");
        companion.classList.add("is-sitting");
      }, idleDelay);
    }

    function updateTarget(event) {
      if (isMobile || prefersReduced) return;
      wakeUp();
      var isNearPerson = event.clientX >= currentX - 18 &&
        event.clientX <= currentX + 108 &&
        event.clientY >= currentY - 30 &&
        event.clientY <= currentY + 138;

      if (followPaused || isNearPerson) {
        companion.classList.remove("is-walking");
        scheduleSit();
        return;
      }

      var nextX = clamp(event.clientX - 44, 18, window.innerWidth - 94);
      var nextY = clamp(event.clientY + 32, 86, window.innerHeight - 132);
      targetX = nextX;
      targetY = nextY;
      companion.dataset.direction = nextX < lastX ? "left" : "right";
      lastX = nextX;
      companion.classList.add("is-walking");
      scheduleSit();
    }

    function animate() {
      if (!isMobile && !prefersReduced) {
        var dx = targetX - currentX;
        var dy = targetY - currentY;
        currentX += dx * 0.052;
        currentY += dy * 0.052;
        companion.style.setProperty("--kunki-x", currentX.toFixed(2) + "px");
        companion.style.setProperty("--kunki-y", currentY.toFixed(2) + "px");

        if (Math.abs(dx) + Math.abs(dy) < 1.2) {
          companion.classList.remove("is-walking");
        }
      }
      window.requestAnimationFrame(animate);
    }

    person.addEventListener("click", function () {
      wakeUp();
      showMessage(messages[messageIndex]);
      messageIndex = (messageIndex + 1) % messages.length;
      scheduleSit();
    });
    person.addEventListener("pointerenter", function () {
      wakeUp();
      followPaused = true;
      companion.classList.remove("is-walking");
      window.clearTimeout(resumeTimer);
    });
    person.addEventListener("pointerleave", function () {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(function () {
        followPaused = false;
        scheduleSit();
      }, 360);
    });
    window.addEventListener("mousemove", updateTarget, { passive: true });
    window.addEventListener("resize", placeAtRest);

    placeAtRest();
    window.requestAnimationFrame(function () {
      companion.classList.add("is-ready");
      showMessage("我出现啦。点我一下，我可以带你逛这个品牌页。");
      scheduleSit();
      animate();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKunkiCompanion);
  } else {
    initKunkiCompanion();
  }
})();
