document.documentElement.classList.add("js");

const content = window.LETTER_CONTENT;

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value ?? "";
}

function setLines(selector, lines, inlineEffect) {
  const element = document.querySelector(selector);
  if (!element) return;

  element.replaceChildren();
  let effectApplied = false;
  (lines ?? []).forEach((line, index) => {
    if (index > 0) element.append(document.createElement("br"));

    const effectText = inlineEffect?.text;
    const effectStart = !effectApplied && effectText ? line.indexOf(effectText) : -1;
    if (effectStart === -1) {
      element.append(document.createTextNode(line));
      return;
    }

    element.append(document.createTextNode(line.slice(0, effectStart)));
    const trigger = document.createElement("span");
    trigger.className = "rabbit-celebration-trigger";
    trigger.dataset.emoji = inlineEffect.emoji ?? "🐇";
    trigger.textContent = effectText;
    element.append(trigger, document.createTextNode(line.slice(effectStart + effectText.length)));
    effectApplied = true;
  });
}

function setTime(selector, text, dateTime) {
  const element = document.querySelector(selector);
  if (!element) return;

  element.textContent = text ?? "";
  if (dateTime) element.dateTime = dateTime;
}

function appendTextWithMemories(element, text, memories, celebration) {
  const matches = [];

  memories.forEach((memory, memoryIndex) => {
    if (!memory?.text || !memory?.image) return;

    let searchFrom = 0;
    while (searchFrom < text.length) {
      const start = text.indexOf(memory.text, searchFrom);
      if (start === -1) break;
      matches.push({ start, end: start + memory.text.length, type: "memory", memoryIndex });
      searchFrom = start + memory.text.length;
    }
  });

  if (celebration?.text) {
    const start = text.indexOf(celebration.text);
    if (start !== -1) {
      matches.push({ start, end: start + celebration.text.length, type: "celebration" });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  let cursor = 0;
  matches.forEach((match) => {
    if (match.start < cursor) return;

    element.append(document.createTextNode(text.slice(cursor, match.start)));

    const trigger = document.createElement(match.type === "memory" ? "button" : "span");
    if (match.type === "memory") {
      trigger.type = "button";
      trigger.className = "memory-trigger";
      trigger.dataset.memoryIndex = String(match.memoryIndex);
      trigger.setAttribute("aria-controls", "memory-preview");
      trigger.setAttribute("aria-expanded", "false");
    } else {
      trigger.className = "celebration-trigger";
    }
    trigger.textContent = text.slice(match.start, match.end);
    element.append(trigger);

    cursor = match.end;
  });

  element.append(document.createTextNode(text.slice(cursor)));
}

function setupMemoryPreview(memories) {
  const triggers = [...document.querySelectorAll(".memory-trigger")];
  if (!triggers.length) return;

  const preview = document.createElement("figure");
  preview.id = "memory-preview";
  preview.className = "memory-preview";
  preview.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.decoding = "async";
  preview.append(image);
  document.body.append(preview);

  const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");
  let activeTrigger = null;
  let interactionMode = null;
  let imageRequestId = 0;
  let positionFrame = 0;

  function positionPreview() {
    if (!activeTrigger) return;

    const triggerRect = activeTrigger.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    const contentRect = activeTrigger.closest(".letter")?.getBoundingClientRect() ?? triggerRect;
    const viewportPadding = 16;
    const gap = 14;
    const roomAbove = triggerRect.top - gap - viewportPadding;
    const roomBelow = window.innerHeight - triggerRect.bottom - gap - viewportPadding;
    const roomLeft = contentRect.left - gap - viewportPadding;
    const roomRight = window.innerWidth - contentRect.right - gap - viewportPadding;

    let top;
    let left;

    if (window.innerWidth >= 900 && Math.max(roomLeft, roomRight) >= previewRect.width) {
      left = roomRight >= roomLeft
        ? contentRect.right + gap
        : contentRect.left - previewRect.width - gap;
      top = triggerRect.top + triggerRect.height / 2 - previewRect.height / 2;
    } else {
      if (roomAbove >= previewRect.height || roomAbove > roomBelow) {
        top = triggerRect.top - previewRect.height - gap;
      } else {
        top = triggerRect.bottom + gap;
      }

      left = triggerRect.left + triggerRect.width / 2 - previewRect.width / 2;
    }

    left = Math.min(
      Math.max(left, viewportPadding),
      window.innerWidth - previewRect.width - viewportPadding
    );

    preview.style.left = `${Math.round(left)}px`;
    preview.style.top = `${Math.round(
      Math.min(Math.max(top, viewportPadding), window.innerHeight - previewRect.height - viewportPadding)
    )}px`;
  }

  function schedulePosition() {
    if (!activeTrigger || positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;
      positionPreview();
    });
  }

  function closePreview() {
    imageRequestId += 1;
    preview.classList.remove("is-visible");
    preview.setAttribute("aria-hidden", "true");

    if (activeTrigger) {
      activeTrigger.classList.remove("is-active");
      activeTrigger.setAttribute("aria-expanded", "false");
    }

    activeTrigger = null;
    interactionMode = null;
  }

  function showPreview(trigger, mode) {
    const memory = memories[Number(trigger.dataset.memoryIndex)];
    if (!memory?.image) return;

    if (activeTrigger && activeTrigger !== trigger) {
      activeTrigger.classList.remove("is-active");
      activeTrigger.setAttribute("aria-expanded", "false");
    }

    activeTrigger = trigger;
    interactionMode = mode;
    trigger.classList.add("is-active");
    trigger.setAttribute("aria-expanded", "true");
    preview.classList.remove("is-visible");
    preview.setAttribute("aria-hidden", "false");

    const requestId = ++imageRequestId;
    const source = new URL(memory.image, document.baseURI).href;
    image.alt = memory.alt ?? "";

    const reveal = () => {
      if (requestId !== imageRequestId || activeTrigger !== trigger) return;
      positionPreview();
      requestAnimationFrame(() => {
        if (requestId === imageRequestId && activeTrigger === trigger) {
          preview.classList.add("is-visible");
        }
      });
    };

    const handleError = () => {
      if (requestId === imageRequestId) closePreview();
    };

    if (image.src !== source) image.src = memory.image;

    if (image.complete && image.naturalWidth > 0) {
      reveal();
    } else {
      image.addEventListener("load", reveal, { once: true });
      image.addEventListener("error", handleError, { once: true });
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" || hoverCapable.matches) {
        showPreview(trigger, "hover");
      }
    });

    trigger.addEventListener("pointerleave", () => {
      if (activeTrigger === trigger && interactionMode === "hover") closePreview();
    });

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      if (activeTrigger === trigger && interactionMode === "locked") {
        closePreview();
      } else {
        showPreview(trigger, "locked");
      }
    });
  });

  document.addEventListener("click", (event) => {
    const clickedTrigger = event.target instanceof Element
      ? event.target.closest(".memory-trigger")
      : null;
    if (activeTrigger && !clickedTrigger) closePreview();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeTrigger) closePreview();
  });

  window.addEventListener("scroll", schedulePosition, { passive: true });
  window.addEventListener("resize", schedulePosition);
}

function setupSignatureSecret() {
  const wrapper = document.querySelector("#letter-signature-wrap");
  const trigger = document.querySelector("#letter-signature");
  const secret = document.querySelector("#signature-secret");
  if (!wrapper || !trigger || !secret || !wrapper.classList.contains("has-secret")) return;

  const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");
  let lockedOpen = false;

  function openSecret() {
    wrapper.classList.add("is-secret-visible");
    trigger.setAttribute("aria-expanded", "true");
    secret.setAttribute("aria-hidden", "false");
  }

  function closeSecret() {
    lockedOpen = false;
    wrapper.classList.remove("is-secret-visible");
    trigger.setAttribute("aria-expanded", "false");
    secret.setAttribute("aria-hidden", "true");
  }

  trigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse" || hoverCapable.matches) openSecret();
  });

  trigger.addEventListener("pointerleave", () => {
    if (!lockedOpen) closeSecret();
  });

  trigger.addEventListener("focus", openSecret);
  trigger.addEventListener("blur", () => {
    if (!lockedOpen) closeSecret();
  });

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (lockedOpen) {
      closeSecret();
    } else {
      lockedOpen = true;
      openSecret();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      trigger.click();
    } else if (event.key === "Escape") {
      closeSecret();
    }
  });

  document.addEventListener("click", (event) => {
    if (lockedOpen && !wrapper.contains(event.target)) closeSecret();
  });
}

function setupFinalPhotoSecret() {
  const wrapper = document.querySelector("#final-photo-note");
  const trigger = document.querySelector("#final-photo-note-text");
  const secret = document.querySelector("#final-photo-secret");
  if (!wrapper || !trigger || !secret || !wrapper.classList.contains("has-secret")) return;

  const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");
  let lockedOpen = false;

  function openSecret() {
    wrapper.classList.add("is-secret-visible");
    trigger.setAttribute("aria-expanded", "true");
    secret.setAttribute("aria-hidden", "false");
  }

  function closeSecret() {
    lockedOpen = false;
    wrapper.classList.remove("is-secret-visible");
    trigger.setAttribute("aria-expanded", "false");
    secret.setAttribute("aria-hidden", "true");
  }

  trigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse" || hoverCapable.matches) openSecret();
  });

  trigger.addEventListener("pointerleave", () => {
    if (!lockedOpen) closeSecret();
  });

  trigger.addEventListener("focus", openSecret);
  trigger.addEventListener("blur", () => {
    if (!lockedOpen) closeSecret();
  });

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (lockedOpen) {
      closeSecret();
    } else {
      lockedOpen = true;
      openSecret();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      trigger.click();
    } else if (event.key === "Escape") {
      closeSecret();
    }
  });

  document.addEventListener("click", (event) => {
    if (lockedOpen && !wrapper.contains(event.target)) closeSecret();
  });
}

function setupCelebration() {
  const trigger = document.querySelector(".celebration-trigger");
  if (!trigger) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  trigger.setAttribute("role", "button");
  trigger.tabIndex = 0;

  const stage = document.createElement("div");
  stage.className = "celebration-stage";
  stage.setAttribute("aria-hidden", "true");
  trigger.append(stage);

  const colors = ["#e2a8c2", "#c6b1dc", "#74547f", "#9b79a7"];
  let cleanupTimer = 0;
  let hasCelebrated = false;

  function celebrate() {
    hasCelebrated = true;
    window.clearTimeout(cleanupTimer);
    stage.replaceChildren();

    const rect = trigger.getBoundingClientRect();
    const originX = Math.min(Math.max(rect.left + rect.width / 2, 48), window.innerWidth - 48);
    const originY = Math.min(Math.max(rect.top + rect.height / 2, 70), window.innerHeight - 70);
    const particleCount = window.innerWidth < 480 ? 18 : 24;

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + ((index % 3) - 1) * 0.08;
      const distance = 58 + (index % 5) * 11;
      const targetX = Math.min(Math.max(originX + Math.cos(angle) * distance, 12), window.innerWidth - 12);
      const targetY = Math.min(Math.max(originY + Math.sin(angle) * distance + 18, 12), window.innerHeight - 12);
      const particle = document.createElement("i");
      const isRibbon = index % 3 === 0;

      particle.className = `celebration-particle celebration-particle--${isRibbon ? "ribbon" : "spark"}`;
      particle.style.setProperty("--particle-x", `${targetX - originX}px`);
      particle.style.setProperty("--particle-y", `${targetY - originY}px`);
      particle.style.setProperty("--particle-turn", `${120 + (index % 6) * 48}deg`);
      particle.style.setProperty("--particle-delay", `${(index % 4) * 18}ms`);
      particle.style.backgroundColor = colors[index % colors.length];
      stage.append(particle);
    }

    trigger.classList.remove("is-celebrating");
    void trigger.offsetWidth;
    trigger.classList.add("is-celebrating");

    cleanupTimer = window.setTimeout(() => {
      stage.replaceChildren();
      trigger.classList.remove("is-celebrating");
    }, 1000);
  }

  trigger.addEventListener("click", celebrate);
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      celebrate();
    }
  });

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    window.setTimeout(() => {
      if (!hasCelebrated) celebrate();
    }, 220);
    observer.disconnect();
  }, { threshold: 0.9 });

  observer.observe(trigger);
}

function setupCoverPhotoFlip() {
  const flipArea = document.querySelector("#cover-photo-flip");
  const front = document.querySelector(".cover__photo-face--front");
  const back = document.querySelector(".cover__photo-face--back");
  if (!flipArea || !front || !back || !flipArea.classList.contains("has-back")) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  flipArea.setAttribute("role", "button");
  flipArea.tabIndex = 0;
  flipArea.setAttribute("aria-pressed", "false");
  flipArea.setAttribute("aria-label", "翻看照片背面");

  function setFlipped(flipped) {
    flipArea.classList.toggle("is-flipped", flipped);
    flipArea.setAttribute("aria-pressed", String(flipped));
    flipArea.setAttribute("aria-label", flipped ? "翻回照片正面" : "翻看照片背面");
    back.setAttribute("aria-hidden", String(!flipped));
    front.classList.toggle("is-reduced-hidden", flipped && reducedMotion.matches);
    back.classList.toggle("is-reduced-visible", flipped && reducedMotion.matches);
  }

  function toggleFlip() {
    setFlipped(!flipArea.classList.contains("is-flipped"));
  }

  flipArea.addEventListener("click", toggleFlip);
  flipArea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFlip();
    } else if (event.key === "Escape") {
      setFlipped(false);
    }
  });

  reducedMotion.addEventListener("change", () => {
    setFlipped(flipArea.classList.contains("is-flipped"));
  });
}

function setupRabbitCelebration() {
  const trigger = document.querySelector(".rabbit-celebration-trigger");
  if (!trigger) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  trigger.setAttribute("role", "button");
  trigger.tabIndex = 0;
  trigger.setAttribute("aria-label", `${trigger.textContent}，播放小兔动画`);

  const stage = document.createElement("span");
  stage.className = "rabbit-celebration-stage";
  stage.setAttribute("aria-hidden", "true");
  trigger.append(stage);

  // Each rabbit follows its own small hop instead of radiating from one point.
  // [startX, startY, apexX, apexY, endX, endY, delay, scale]
  const paths = [
    [-16, 8, -58, -82, -82, -22, 0, 0.72],
    [-8, 12, -28, -110, -50, -38, 42, 0.9],
    [4, 8, 14, -90, 30, -18, 84, 0.68],
    [12, 10, 58, -106, 82, -28, 22, 0.8],
    [20, 6, 84, -60, 104, 2, 126, 0.65],
    [-20, 4, -92, -55, -110, 18, 72, 0.75],
    [-4, 14, -14, -72, -22, 30, 154, 0.6],
    [14, 14, 42, -64, 64, 26, 182, 0.72],
    [-12, 6, -46, -96, -70, -60, 112, 0.58],
    [8, 8, 28, -120, 52, -70, 196, 0.65],
    [-18, 12, -72, -48, -92, 40, 218, 0.55],
    [18, 10, 72, -44, 94, 36, 242, 0.62],
    [0, 14, -4, -92, 8, 48, 258, 0.5],
    [6, 12, 50, -84, 76, -4, 166, 0.56]
  ];
  let cleanupTimer = 0;
  let hasCelebrated = false;

  function celebrateRabbits() {
    hasCelebrated = true;
    window.clearTimeout(cleanupTimer);
    stage.replaceChildren();

    const rect = trigger.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const distanceScale = window.innerWidth < 480 ? 0.72 : 1;

    const clampX = (value) => Math.min(Math.max(originX + value * distanceScale, 16), window.innerWidth - 16) - originX;
    const clampY = (value) => Math.min(Math.max(originY + value * distanceScale, 16), window.innerHeight - 16) - originY;

    paths.forEach(([startX, startY, apexX, apexY, endX, endY, delay, scale], index) => {
      const rabbit = document.createElement("span");
      const turn = (index % 2 === 0 ? -1 : 1) * (5 + (index % 5) * 3);
      rabbit.className = "rabbit-celebration-particle";
      rabbit.textContent = trigger.dataset.emoji || "🐇";
      rabbit.style.setProperty("--rabbit-start-x", `${clampX(startX)}px`);
      rabbit.style.setProperty("--rabbit-start-y", `${clampY(startY)}px`);
      rabbit.style.setProperty("--rabbit-apex-x", `${clampX(apexX)}px`);
      rabbit.style.setProperty("--rabbit-apex-y", `${clampY(apexY)}px`);
      rabbit.style.setProperty("--rabbit-end-x", `${clampX(endX)}px`);
      rabbit.style.setProperty("--rabbit-end-y", `${clampY(endY)}px`);
      rabbit.style.setProperty("--rabbit-apex-turn", `${turn * -0.35}deg`);
      rabbit.style.setProperty("--rabbit-turn", `${turn}deg`);
      rabbit.style.setProperty("--rabbit-scale", String(scale));
      rabbit.style.setProperty("--rabbit-end-scale", String(scale * 0.82));
      rabbit.style.setProperty("--rabbit-delay", `${delay}ms`);
      stage.append(rabbit);
    });

    trigger.classList.remove("is-rabbit-celebrating");
    void trigger.offsetWidth;
    trigger.classList.add("is-rabbit-celebrating");

    cleanupTimer = window.setTimeout(() => {
      stage.replaceChildren();
      trigger.classList.remove("is-rabbit-celebrating");
    }, 1300);
  }

  trigger.addEventListener("click", celebrateRabbits);
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      celebrateRabbits();
    }
  });

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    window.setTimeout(() => {
      if (!hasCelebrated) celebrateRabbits();
    }, 1050);
    observer.disconnect();
  }, { threshold: 0.8 });

  observer.observe(trigger);
}

function renderLetter(letterContent) {
  document.title = letterContent.page.title;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = letterContent.page.description;

  setText("#cover-recipient", letterContent.cover.recipient);
  setTime("#cover-date", letterContent.date.display, letterContent.date.iso);
  setText("#cover-note", letterContent.cover.note);
  setLines("#cover-title", letterContent.cover.titleLines, letterContent.cover.rabbitBurst);
  setLines("#cover-subtitle", letterContent.cover.subtitleLines);
  setText("#cover-caption", letterContent.cover.photoCaption);
  setText("#cover-photo-back-text", letterContent.cover.photoBackText);
  setText("#introduction-context", letterContent.introduction.context);
  setLines("#interlude-title", letterContent.introduction.lines);
  setText("#introduction-closing", letterContent.introduction.closing);
  setText("#detail-caption", letterContent.introduction.photoCaption);
  setText("#letter-heading-date", letterContent.letter.headingDate);
  setText("#letter-heading", letterContent.letter.salutation);
  setText("#letter-signoff", letterContent.letter.signoff);
  setText("#letter-signature", letterContent.letter.signature);
  setTime("#letter-date", letterContent.date.display, letterContent.date.iso);

  const signatureWrap = document.querySelector("#letter-signature-wrap");
  const signatureSecret = document.querySelector("#signature-secret");
  if (signatureWrap && signatureSecret) {
    const secretText = letterContent.letter.signatureSecret ?? "";
    signatureSecret.textContent = secretText;
    signatureWrap.classList.toggle("has-secret", secretText.trim().length > 0);
  }

  const coverPhoto = document.querySelector("#cover-photo");
  const coverPhotoFlip = document.querySelector("#cover-photo-flip");
  const detailPhoto = document.querySelector("#detail-photo");
  const finalPhoto = document.querySelector("#final-photo");
  const openingPhoto = document.querySelector("#opening-photo");
  const openingPhotoFigure = document.querySelector("#letter-opening-photo");
  if (coverPhoto) coverPhoto.alt = letterContent.cover.photoAlt ?? "";
  if (coverPhotoFlip) {
    const backText = letterContent.cover.photoBackText ?? "";
    coverPhotoFlip.classList.toggle("has-back", backText.trim().length > 0);
  }
  if (detailPhoto) detailPhoto.alt = letterContent.introduction.photoAlt ?? "";
  if (finalPhoto) finalPhoto.alt = letterContent.letter.finalPhoto?.alt ?? "";
  if (openingPhoto && openingPhotoFigure && letterContent.letter.openingPhoto?.image) {
    openingPhoto.src = letterContent.letter.openingPhoto.image;
    openingPhoto.alt = letterContent.letter.openingPhoto.alt ?? "";
    openingPhotoFigure.hidden = false;
  }

  const finalPhotoNote = document.querySelector("#final-photo-note");
  const finalPhotoNoteText = document.querySelector("#final-photo-note-text");
  const finalPhotoSecret = document.querySelector("#final-photo-secret");
  if (finalPhotoNote && finalPhotoNoteText && finalPhotoSecret) {
    const note = letterContent.letter.finalPhoto?.note ?? "";
    const secret = letterContent.letter.finalPhoto?.secret ?? "";
    finalPhotoNoteText.textContent = note;
    finalPhotoSecret.textContent = secret;
    finalPhotoNote.classList.toggle("has-secret", secret.trim().length > 0);
    finalPhotoNote.hidden = note.trim().length === 0;
  }

  const letterBody = document.querySelector("#letter-body");
  if (letterBody) {
    const memories = letterContent.letter.memories ?? [];
    const celebration = letterContent.letter.celebration;
    const paragraphs = (letterContent.letter.paragraphs ?? []).map((paragraph) => {
      const element = document.createElement("p");
      appendTextWithMemories(element, paragraph, memories, celebration);
      return element;
    });
    letterBody.replaceChildren(...paragraphs);
    setupMemoryPreview(memories);
  }
}

if (content) {
  renderLetter(content);
  setupSignatureSecret();
  setupFinalPhotoSecret();
  setupCelebration();
  setupCoverPhotoFlip();
  setupRabbitCelebration();
} else {
  console.error("未找到 LETTER_CONTENT，请确认 letter.js 已正确加载。");
}

const saveButton = document.querySelector("#save-letter");
const saveStatus = document.querySelector("#save-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!reducedMotion.matches) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach((element) => {
    revealObserver.observe(element);
  });
} else {
  document.querySelectorAll(".reveal").forEach((element) => {
    element.classList.add("is-visible");
  });
}

saveButton?.addEventListener("click", () => {
  saveStatus.textContent = "正在打开打印窗口，请选择“另存为 PDF”。";
  window.print();
});

window.addEventListener("afterprint", () => {
  saveStatus.textContent = "打印窗口已关闭。";
});
