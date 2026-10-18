// Personalize these details before sharing the invitation.
const CONFIG = {
  from: "Your Name",
  to: "my favorite person",
  whatsapp: "",
  photos: []
};

const STORAGE_KEY = "little-date-note-v1";
const TOTAL_STEPS = 7;
const state = {
  step: 0,
  place: "",
  date: "",
  time: "18:00",
  foods: [],
  photos: [],
  library: [],
  boothTemplate: "strip"
};

const steps = [...document.querySelectorAll(".flow-step")];
const progress = document.querySelector(".progress-fill");
const progressBar = document.querySelector(".progress-track");
const stepLabel = document.querySelector("#step-label");
const stepCount = document.querySelector("#step-count");
const backButton = document.querySelector("#back-button");
const announcer = document.querySelector("#announcer");
const photoChoices = document.querySelector("#photo-choices");
const uploadNote = document.querySelector("#upload-note");
const dateInput = document.querySelector("#date-input");

document.querySelectorAll('[data-name="to"]').forEach((element) => {
  element.textContent = CONFIG.to || "my favorite person";
});

const labels = ["A LITTLE NOTE", "THE BIG QUESTION", "PICK OUR PLACE", "PICK A DAY", "SOMETHING YUMMY", "ONE LAST DETAIL", "SEALED WITH A KISS"];

document.querySelectorAll(".nav-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const isBooth = button.dataset.view === "booth-view";
    document.querySelector("#invite-view").hidden = isBooth;
    document.querySelector("#booth-view").hidden = !isBooth;
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    if (isBooth) {
      renderPhotoChoices();
      const heading = document.querySelector("#booth-title");
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  });
});

function showStep(step, { focus = true } = {}) {
  state.step = Math.max(0, Math.min(TOTAL_STEPS - 1, step));
  steps.forEach((element, index) => {
    const active = index === state.step;
    element.hidden = !active;
    element.classList.toggle("is-active", active);
  });
  stepLabel.textContent = labels[state.step];
  stepCount.textContent = `${String(state.step + 1).padStart(2, "0")} / ${String(TOTAL_STEPS).padStart(2, "0")}`;
  progress.style.width = `${((state.step + 1) / TOTAL_STEPS) * 100}%`;
  progressBar.setAttribute("aria-valuenow", String(state.step + 1));
  backButton.hidden = state.step === 0 || state.step === TOTAL_STEPS - 1;
  announcer.textContent = `${labels[state.step]}, step ${state.step + 1} of ${TOTAL_STEPS}`;
  if (state.step === TOTAL_STEPS - 1) celebrate();
  if (focus) {
    const heading = steps[state.step].querySelector("h1, h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }
  saveState();
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => showStep(Number(button.dataset.next)));
});

backButton.addEventListener("click", () => showStep(state.step - 1));
document.querySelector(".wordmark").addEventListener("click", (event) => {
  event.preventDefault();
  restart();
});

document.querySelector("#yes-button").addEventListener("click", (event) => {
  heartBurst(event.currentTarget);
  window.setTimeout(() => showStep(2), 260);
});

const noButton = document.querySelector("#no-button");
let noEscapes = 0;
function moveNoButton() {
  if (noEscapes >= 5) return;
  const area = noButton.parentElement;
  const maxLeft = Math.max(0, area.clientWidth - noButton.offsetWidth);
  const maxTop = Math.max(0, area.clientHeight - noButton.offsetHeight);
  noButton.style.position = "absolute";
  noButton.style.left = `${Math.random() * maxLeft}px`;
  noButton.style.top = `${Math.random() * maxTop}px`;
  noEscapes += 1;
  if (noEscapes === 5) {
    noButton.classList.add("is-gone");
    document.querySelector("#no-note").textContent = "and it’s gone! there was only one right answer 💌";
  }
}
noButton.addEventListener("pointerenter", moveNoButton);
noButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  moveNoButton();
});

document.querySelector('[data-choice-group="place"]').addEventListener("click", (event) => {
  const choice = event.target.closest(".choice-card");
  if (!choice) return;
  state.place = choice.dataset.value;
  showStep(3);
});

dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.addEventListener("change", () => {
  state.date = dateInput.value;
  saveState();
});
document.querySelector("#time-input").addEventListener("change", (event) => {
  state.time = event.currentTarget.value;
  saveState();
});
document.querySelector("#date-next").addEventListener("click", () => {
  if (!dateInput.value) {
    document.querySelector("#date-error").textContent = "Pick a day first, and then it’s official!";
    dateInput.focus();
    return;
  }
  state.date = dateInput.value;
  state.time = document.querySelector("#time-input").value || "18:00";
  document.querySelector("#date-error").textContent = "";
  showStep(4);
});

document.querySelector('[data-chip-group="food"]').addEventListener("click", (event) => {
  const chip = event.target.closest(".choice-chip");
  if (!chip) return;
  const selected = chip.getAttribute("aria-pressed") === "true";
  chip.setAttribute("aria-pressed", String(!selected));
  const food = chip.textContent.replace(/^\S+\s*/, "");
  state.foods = selected ? state.foods.filter((item) => item !== food) : [...state.foods, food];
  saveState();
});

function createPhotoOption(photo, className = "photo-option") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-pressed", String(state.photos.some((item) => item.id === photo.id)));
  button.setAttribute("aria-label", `Select ${photo.alt || "photo"}`);
  const image = document.createElement("img");
  image.src = photo.src;
  image.alt = photo.alt || "A favorite photo";
  button.append(image);
  button.addEventListener("click", () => {
    const exists = state.photos.some((item) => item.id === photo.id);
    state.photos = exists ? state.photos.filter((item) => item.id !== photo.id) : [...state.photos, photo];
    invalidateKeepsake();
    renderPhotoChoices();
    renderSummaryPhotos();
    saveState();
  });
  return button;
}

function getAvailablePhotos() {
  const configured = (CONFIG.photos || []).map((file) => {
    const photo = typeof file === "string"
      ? { src: `photos/${file}`, alt: file.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") }
      : file;
    return { ...photo, id: photo.id || `config:${photo.src}` };
  });
  const allPhotos = [...configured, ...state.library];
  return allPhotos.filter((photo, index) => allPhotos.findIndex((item) => item.id === photo.id) === index);
}

function renderPhotoChoices() {
  const photos = getAvailablePhotos();
  photoChoices.replaceChildren(...photos.map((photo) => createPhotoOption(photo)));
  const boothGallery = document.querySelector("#booth-gallery");
  boothGallery.replaceChildren(...photos.map((photo) => createPhotoOption(photo, "booth-photo")));
  const selectedCount = state.photos.length;
  document.querySelector("#booth-photo-count").textContent = `${selectedCount} selected`;
}

function renderSummaryPhotos() {
  const container = document.querySelector("#summary-photos");
  container.replaceChildren(...state.photos.map((photo) => {
    const frame = document.createElement("div");
    frame.className = "summary-photo";
    const image = document.createElement("img");
    image.src = photo.src;
    image.alt = photo.alt || "A selected photo";
    frame.append(image);
    return frame;
  }));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      place: state.place,
      date: state.date,
      time: state.time,
      foods: state.foods,
      library: state.library,
      selectedPhotoIds: state.photos.map((photo) => photo.id),
      boothTemplate: state.boothTemplate,
      boothCaption: document.querySelector("#booth-caption").value
    }));
  } catch {
    uploadNote.textContent = "Your browser is low on storage; the invitation still works for this visit.";
    document.querySelector("#booth-upload-note").textContent = "Browser storage is full; photos are still available until you close this tab.";
  }
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;
    state.place = saved.place || "";
    state.date = saved.date || "";
    state.time = saved.time || "18:00";
    state.foods = Array.isArray(saved.foods) ? saved.foods : [];
    state.library = Array.isArray(saved.library)
      ? saved.library
      : (Array.isArray(saved.photos) ? saved.photos.filter((photo) => photo.uploaded) : []);
    state.library = state.library.map((photo, index) => ({ ...photo, id: photo.id || `upload:${index}:${photo.src.slice(-20)}` }));
    state.boothTemplate = saved.boothTemplate || "strip";
    document.querySelector("#booth-caption").value = saved.boothCaption || "made with love";
    if (state.date) dateInput.value = state.date;
    document.querySelector("#time-input").value = state.time;
    const availablePhotos = getAvailablePhotos();
    const selectedIds = Array.isArray(saved.selectedPhotoIds)
      ? saved.selectedPhotoIds
      : (Array.isArray(saved.photos) ? saved.photos.map((photo) => photo.uploaded
        ? state.library.find((item) => item.src === photo.src)?.id
        : (photo.id || `config:${photo.src}`)).filter(Boolean) : []);
    state.photos = availablePhotos.filter((photo) => selectedIds.includes(photo.id));
    document.querySelectorAll("[data-template]").forEach((button) => {
      const selected = button.dataset.template === state.boothTemplate;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll(".choice-chip").forEach((chip) => {
      const food = chip.textContent.replace(/^\S+\s*/, "");
      chip.setAttribute("aria-pressed", String(state.foods.includes(food)));
    });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve({ id: `upload:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`, src: canvas.toDataURL("image/jpeg", 0.68), alt: file.name.replace(/\.[^.]+$/, ""), uploaded: true });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read ${file.name}`));
    };
    image.src = objectUrl;
  });
}

async function appendUploadedPhotos(files, sourceInput) {
  const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
  const availableSlots = 24 - getAvailablePhotos().length;
  const acceptedFiles = imageFiles.slice(0, availableSlots);
  const statusText = sourceInput.id === "booth-photo-input" ? "#booth-upload-note" : "#upload-note";
  const status = document.querySelector(statusText);
  if (!acceptedFiles.length) {
    status.textContent = availableSlots ? "Choose image files to add to the album." : "Your album has reached 24 photos. Remove a few before adding more.";
    sourceInput.value = "";
    return;
  }
  status.textContent = `Resizing ${acceptedFiles.length} ${acceptedFiles.length === 1 ? "photo" : "photos"}...`;
  try {
    const images = await Promise.all(acceptedFiles.map(resizeImage));
    state.library = [...state.library, ...images];
    state.photos = [...state.photos, ...images];
    invalidateKeepsake();
    renderPhotoChoices();
    status.textContent = imageFiles.length > acceptedFiles.length
      ? `Added ${acceptedFiles.length}; your album is full at 24 photos.`
      : "Added to your little album and selected for the keepsake.";
    saveState();
  } catch (error) {
    status.textContent = error.message || "That photo didn’t load. Try another one.";
  }
  sourceInput.value = "";
}

document.querySelector("#photo-input").addEventListener("change", (event) => appendUploadedPhotos(event.currentTarget.files, event.currentTarget));
document.querySelector("#booth-photo-input").addEventListener("change", (event) => appendUploadedPhotos(event.currentTarget.files, event.currentTarget));

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => {
    state.boothTemplate = button.dataset.template;
    document.querySelectorAll("[data-template]").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    invalidateKeepsake();
    saveState();
  });
});
document.querySelector("#booth-caption").addEventListener("input", () => {
  invalidateKeepsake();
  saveState();
});

function invalidateKeepsake() {
  document.querySelector("#booth-canvas").hidden = true;
  document.querySelector("#canvas-empty").hidden = false;
  document.querySelector("#download-keepsake").disabled = true;
  document.querySelector("#share-keepsake").disabled = true;
}

function loadCanvasImage(photo) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not open ${photo.alt || "one of your photos"}.`));
    image.src = photo.src;
  });
}

function drawCroppedPhoto(context, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (image.naturalWidth - cropWidth) / 2;
  const cropY = (image.naturalHeight - cropHeight) / 2;
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
}

async function generateKeepsake() {
  const status = document.querySelector("#booth-status");
  const generateButton = document.querySelector("#generate-booth");
  if (!state.photos.length) {
    status.textContent = "Add and select at least one photo first.";
    document.querySelector("#booth-photo-input").focus();
    return;
  }

  generateButton.disabled = true;
  status.textContent = "Putting your little memories together...";
  try {
    await document.fonts.ready;
    const images = await Promise.all(state.photos.map(loadCanvasImage));
    const template = state.boothTemplate;
    const layouts = {
      strip: { columns: 1, padding: 38, frameWidth: 500, frameHeight: 305, gap: 22, headerHeight: 144, footerHeight: 105, background: "#f5c8cd" },
      collage: { columns: 2, padding: 42, frameWidth: 490, frameHeight: 350, gap: 22, headerHeight: 144, footerHeight: 105, background: "#f5c8cd" },
      postcard: { columns: 2, padding: 42, frameWidth: 490, frameHeight: 330, gap: 30, headerHeight: 164, footerHeight: 120, background: "#ded1f2" },
      film: { columns: 1, padding: 58, frameWidth: 480, frameHeight: 285, gap: 18, headerHeight: 145, footerHeight: 110, background: "#52263c" },
      polaroid: { columns: 2, padding: 58, frameWidth: 405, frameHeight: 315, gap: 48, headerHeight: 155, footerHeight: 115, background: "#ffe789" },
      heart: { columns: 3, padding: 44, frameWidth: 245, frameHeight: 225, gap: 26, headerHeight: 150, footerHeight: 105, background: "#f5c8cd" },
      scrapbook: { columns: 2, padding: 62, frameWidth: 410, frameHeight: 330, gap: 54, headerHeight: 155, footerHeight: 115, background: "#ded1f2" },
      contact: { columns: 3, padding: 34, frameWidth: 270, frameHeight: 215, gap: 17, headerHeight: 150, footerHeight: 100, background: "#fff4ef" },
      ticket: { columns: 2, padding: 42, frameWidth: 425, frameHeight: 260, gap: 28, headerHeight: 150, footerHeight: 110, background: "#bdd7b2" }
    };
    const layout = layouts[template] || layouts.strip;
    const { columns, padding, frameWidth, frameHeight, gap, headerHeight, footerHeight } = layout;
    const rows = Math.ceil(images.length / columns);
    const canvas = document.querySelector("#booth-canvas");
    canvas.width = padding * 2 + columns * frameWidth + (columns - 1) * gap;
    canvas.height = headerHeight + rows * frameHeight + (rows - 1) * gap + footerHeight;
    const context = canvas.getContext("2d");
    context.fillStyle = layout.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fffdf8";
    context.fillRect(15, 15, canvas.width - 30, canvas.height - 30);
    if (template === "film") {
      context.fillStyle = "#ffe789";
      for (let x = 34; x < canvas.width - 25; x += 26) {
        context.fillRect(x, 21, 15, 8);
        context.fillRect(x, canvas.height - 29, 15, 8);
      }
    } else {
      context.fillStyle = "#ffe789";
      context.fillRect(canvas.width / 2 - 88, 26, 176, 9);
    }
    context.textAlign = "center";
    context.fillStyle = template === "film" ? "#ffe789" : "#a3345a";
    context.font = "700 18px 'DM Sans', sans-serif";
    const templateHeadings = {
      strip: "OUR LITTLE PHOTO BOOTH", collage: "A COLLECTION OF US", postcard: "A POSTCARD FOR TWO",
      film: "ROLLING THROUGH OUR DAYS", polaroid: "PINNED WITH LOVE", heart: "ALL MY HEART EYES",
      scrapbook: "LITTLE THINGS, BIG LOVE", contact: "OUR MINI MOMENTS", ticket: "ADMIT TWO HEARTS"
    };
    context.fillText(templateHeadings[template] || templateHeadings.strip, canvas.width / 2, 67);
    context.fillStyle = template === "film" ? "#fffdf8" : "#52263c";
    context.font = "600 38px Fraunces, Georgia, serif";
    context.fillText(`${CONFIG.from || "You"} & ${CONFIG.to || "Me"}`, canvas.width / 2, 111, canvas.width - 56);

    images.forEach((image, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cellX = padding + column * (frameWidth + gap);
      const cellY = headerHeight + row * (frameHeight + gap);
      const rotateCard = template === "polaroid" || template === "scrapbook";
      context.save();
      if (rotateCard) {
        context.translate(cellX + frameWidth / 2, cellY + frameHeight / 2);
        context.rotate((index % 2 ? 1 : -1) * 0.035);
      }
      const x = rotateCard ? -frameWidth / 2 : cellX;
      const y = rotateCard ? -frameHeight / 2 : cellY;

      if (template === "heart") {
        const centerX = x + frameWidth / 2;
        context.beginPath();
        context.moveTo(centerX, y + frameHeight * 0.94);
        context.bezierCurveTo(x - frameWidth * 0.05, y + frameHeight * 0.62, x, y + frameHeight * 0.18, centerX, y + frameHeight * 0.34);
        context.bezierCurveTo(x + frameWidth, y + frameHeight * 0.02, x + frameWidth, y + frameHeight * 0.62, centerX, y + frameHeight * 0.94);
        context.save();
        context.clip();
        drawCroppedPhoto(context, image, x, y, frameWidth, frameHeight);
        context.restore();
        context.strokeStyle = "#a3345a";
        context.lineWidth = 5;
        context.stroke();
      } else if (template === "film") {
        context.fillStyle = "#7e2446";
        context.fillRect(x, y, frameWidth, frameHeight);
        for (let holeY = y + 8; holeY < y + frameHeight - 8; holeY += 23) {
          context.fillStyle = "#ffe789";
          context.fillRect(x + 5, holeY, 13, 12);
          context.fillRect(x + frameWidth - 18, holeY, 13, 12);
        }
        drawCroppedPhoto(context, image, x + 29, y + 17, frameWidth - 58, frameHeight - 47);
        context.fillStyle = "#fffdf8";
        context.font = "600 12px 'DM Sans', sans-serif";
        context.textAlign = "left";
        context.fillText(`FRAME ${String(index + 1).padStart(2, "0")}`, x + 30, y + frameHeight - 13);
      } else if (template === "ticket") {
        context.fillStyle = "#fffdf8";
        context.fillRect(x, y, frameWidth, frameHeight);
        const stubWidth = 112;
        drawCroppedPhoto(context, image, x + 12, y + 12, frameWidth - stubWidth - 18, frameHeight - 24);
        context.fillStyle = index % 2 ? "#ded1f2" : "#ffe789";
        context.fillRect(x + frameWidth - stubWidth, y, stubWidth, frameHeight);
        context.strokeStyle = "#a3345a";
        context.setLineDash([5, 5]);
        context.beginPath();
        context.moveTo(x + frameWidth - stubWidth, y + 8);
        context.lineTo(x + frameWidth - stubWidth, y + frameHeight - 8);
        context.stroke();
        context.setLineDash([]);
        context.save();
        context.translate(x + frameWidth - stubWidth / 2, y + frameHeight / 2);
        context.rotate(-Math.PI / 2);
        context.fillStyle = "#7e2446";
        context.font = "700 13px 'DM Sans', sans-serif";
        context.textAlign = "center";
        context.fillText("ADMIT TWO  ♥", 0, 5);
        context.restore();
      } else {
        const bottomLabel = template === "polaroid" ? 54 : template === "contact" ? 14 : 38;
        const inset = template === "contact" ? 4 : template === "scrapbook" ? 10 : 0;
        context.fillStyle = template === "scrapbook" ? (index % 2 ? "#ffe789" : "#fffdf8") : "#fff";
        context.fillRect(x - inset, y - inset, frameWidth + inset * 2, frameHeight + bottomLabel + inset);
        if (template === "scrapbook") {
          context.fillStyle = index % 2 ? "#f5c8cd" : "#bdd7b2";
          context.save();
          context.translate(x + frameWidth / 2, y - 13);
          context.rotate(index % 2 ? -0.06 : 0.06);
          context.fillRect(-47, -8, 94, 17);
          context.restore();
        }
        drawCroppedPhoto(context, image, x, y, frameWidth, frameHeight - bottomLabel);
        if (template !== "contact") {
          context.fillStyle = "#7e2446";
          context.font = template === "polaroid" ? "italic 17px Fraunces, Georgia, serif" : "600 14px 'DM Sans', sans-serif";
          context.textAlign = template === "polaroid" ? "center" : "left";
          const label = template === "polaroid" ? "our favorite" : `♥  ${String(index + 1).padStart(2, "0")}`;
          context.fillText(label, template === "polaroid" ? x + frameWidth / 2 : x + 4, y + frameHeight - 12);
        }
      }
      context.restore();
    });

    const caption = document.querySelector("#booth-caption").value.trim() || "made with love";
    context.textAlign = "center";
    context.fillStyle = "#7e2446";
    context.font = "italic 26px Fraunces, Georgia, serif";
    context.fillText(caption, canvas.width / 2, canvas.height - 46);
    context.font = "600 12px 'DM Sans', sans-serif";
    context.fillText("♡  ALWAYS BETTER TOGETHER  ♡", canvas.width / 2, canvas.height - 25);
    document.querySelector("#canvas-empty").hidden = true;
    canvas.hidden = false;
    document.querySelector("#download-keepsake").disabled = false;
    document.querySelector("#share-keepsake").disabled = false;
    status.textContent = `${images.length} ${images.length === 1 ? "photo" : "photos"} made into a keepsake. Cute, right?`;
  } catch (error) {
    status.textContent = error.message || "Couldn’t make that keepsake. Try another photo.";
  } finally {
    generateButton.disabled = false;
  }
}

document.querySelector("#generate-booth").addEventListener("click", generateKeepsake);

function downloadKeepsake() {
  const canvas = document.querySelector("#booth-canvas");
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "our-little-keepsake.png";
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/png");
}

document.querySelector("#download-keepsake").addEventListener("click", downloadKeepsake);
document.querySelector("#share-keepsake").addEventListener("click", async () => {
  const status = document.querySelector("#booth-status");
  const canvas = document.querySelector("#booth-canvas");
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "our-little-keepsake.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Our little keepsake", text: "Made with love ♡" });
      status.textContent = "A little memory, sent with love.";
    } else {
      downloadKeepsake();
      status.textContent = "Sharing isn’t available here, so your keepsake is downloading instead.";
    }
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = "Couldn’t share right now. Try downloading your keepsake.";
  }
});

function formatDate(value) {
  if (!value) return "A day to be decided";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(value) {
  if (!value) return "A time to be decided";
  return new Date(`2000-01-01T${value}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function getMessage() {
  const foods = state.foods.length ? state.foods.join(", ") : "I’m happy to be surprised";
  return `A date with ${CONFIG.from || "me"} & ${CONFIG.to || "you"} 💌\n\n📍 ${state.place || "Our place, to be decided"}\n📅 ${formatDate(state.date)} at ${formatTime(state.time)}\n🍽️ ${foods}\n\nCan’t wait! ♡`;
}

function renderSummary() {
  const foods = state.foods.length ? state.foods.join(", ") : "Surprise me!";
  document.querySelector("#summary-note").innerHTML = `<strong>Our little plan</strong><br>♡ ${escapeHTML(state.place || "A lovely date")}<br>♡ ${escapeHTML(formatDate(state.date))} at ${escapeHTML(formatTime(state.time))}<br>♡ ${escapeHTML(foods)}`;
  renderSummaryPhotos();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

document.querySelector("#photo-next").addEventListener("click", () => {
  renderSummary();
  showStep(6);
});
document.querySelector("#skip-photos").addEventListener("click", () => {
  state.photos = [];
  renderSummary();
  showStep(6);
});

document.querySelector("#send-button").addEventListener("click", async () => {
  const message = getMessage();
  if (navigator.share) {
    try {
      await navigator.share({ title: "It’s a date!", text: message });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  const number = (CONFIG.whatsapp || "").replace(/\D/g, "");
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});

document.querySelector("#copy-button").addEventListener("click", async () => {
  const status = document.querySelector("#copy-status");
  try {
    await navigator.clipboard.writeText(getMessage());
    status.textContent = "Copied! Now go make it official ♡";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = getMessage();
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    status.textContent = copied ? "Copied! Now go make it official ♡" : "Copy didn’t work here. Try the Send button instead.";
  }
});

function heartBurst(button) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const bounds = button.getBoundingClientRect();
  for (let index = 0; index < 9; index += 1) {
    const heart = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 9;
    heart.className = "heart-burst";
    heart.textContent = "♥";
    heart.style.left = `${bounds.left + bounds.width / 2}px`;
    heart.style.top = `${bounds.top + bounds.height / 2}px`;
    heart.style.setProperty("--x", `${Math.cos(angle) * 70}px`);
    heart.style.setProperty("--y", `${Math.sin(angle) * 70}px`);
    document.body.append(heart);
    window.setTimeout(() => heart.remove(), 750);
  }
}

let celebrated = false;
function celebrate() {
  if (celebrated || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  celebrated = true;
  const layer = document.querySelector("#celebration-layer");
  const colors = ["#a3345a", "#ffe789", "#ded1f2", "#f5c8cd", "#bdd7b2"];
  for (let index = 0; index < 48; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 800}ms`;
    piece.style.setProperty("--drift", `${Math.random() * 150 - 75}px`);
    layer.append(piece);
    window.setTimeout(() => piece.remove(), 3600);
  }
}

function restart() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

document.querySelector("#restart-button").addEventListener("click", restart);
restoreState();
renderPhotoChoices();
showStep(0, { focus: false });