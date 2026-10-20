document.documentElement.classList.add("js");

const content = window.LETTER_CONTENT;

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value ?? "";
}

function setLines(selector, lines) {
  const element = document.querySelector(selector);
  if (!element) return;

  element.replaceChildren();
  (lines ?? []).forEach((line, index) => {
    if (index > 0) element.append(document.createElement("br"));
    element.append(document.createTextNode(line));
  });
}

function setTime(selector, text, dateTime) {
  const element = document.querySelector(selector);
  if (!element) return;

  element.textContent = text ?? "";
  if (dateTime) element.dateTime = dateTime;
}

function renderLetter(letterContent) {
  document.title = letterContent.page.title;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = letterContent.page.description;

  setText("#cover-recipient", letterContent.cover.recipient);
  setTime("#cover-date", letterContent.date.display, letterContent.date.iso);
  setText("#cover-note", letterContent.cover.note);
  setLines("#cover-title", letterContent.cover.titleLines);
  setLines("#cover-subtitle", letterContent.cover.subtitleLines);
  setText("#cover-caption", letterContent.cover.photoCaption);
  setText("#introduction-context", letterContent.introduction.context);
  setLines("#interlude-title", letterContent.introduction.lines);
  setText("#introduction-closing", letterContent.introduction.closing);
  setText("#detail-caption", letterContent.introduction.photoCaption);
  setText("#letter-heading-date", letterContent.letter.headingDate);
  setText("#letter-heading", letterContent.letter.salutation);
  setText("#letter-signoff", letterContent.letter.signoff);
  setText("#letter-signature", letterContent.letter.signature);
  setTime("#letter-date", letterContent.date.display, letterContent.date.iso);

  const coverPhoto = document.querySelector("#cover-photo");
  const detailPhoto = document.querySelector("#detail-photo");
  const finalPhoto = document.querySelector("#final-photo");
  if (coverPhoto) coverPhoto.alt = letterContent.cover.photoAlt ?? "";
  if (detailPhoto) detailPhoto.alt = letterContent.introduction.photoAlt ?? "";
  if (finalPhoto) finalPhoto.alt = letterContent.letter.finalPhoto?.alt ?? "";

  const finalPhotoNote = document.querySelector("#final-photo-note");
  if (finalPhotoNote) {
    const note = letterContent.letter.finalPhoto?.note ?? "";
    finalPhotoNote.textContent = note;
    finalPhotoNote.hidden = note.trim().length === 0;
  }

  const letterBody = document.querySelector("#letter-body");
  if (letterBody) {
    const paragraphs = (letterContent.letter.paragraphs ?? []).map((paragraph) => {
      const element = document.createElement("p");
      element.textContent = paragraph;
      return element;
    });
    letterBody.replaceChildren(...paragraphs);
  }
}

if (content) {
  renderLetter(content);
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
