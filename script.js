const header = document.querySelector(".site-header");
const counters = document.querySelectorAll(".counter");
const caseCounters = document.querySelectorAll(".case-counter");
const contactForm = document.querySelector("[data-contact-form]");

// UTM-метки сохраняются в браузере, чтобы позже передавать источник заявки в форму, CRM или аналитику.
const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const currentParams = new URLSearchParams(window.location.search);
const capturedUtm = utmParams.reduce((acc, key) => {
  const value = currentParams.get(key);
  if (value) acc[key] = value;
  return acc;
}, {});

if (Object.keys(capturedUtm).length) {
  sessionStorage.setItem("levonwb_utm", JSON.stringify(capturedUtm));
}

const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const formatCounter = (value, format, decimals = 0) => {
  if (format === "dot") {
    return new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })
      .format(value)
      .replace(/\s/g, ".");
  }

  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
};

const runCounter = (counter) => {
  const target = Number(counter.dataset.target || counter.dataset.value);
  const format = counter.dataset.format;
  const decimals = Number(counter.dataset.decimals || 0);
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canAnimate = typeof performance !== "undefined" && typeof requestAnimationFrame === "function";

  if (reduceMotion || !canAnimate) {
    counter.textContent = formatCounter(target, format, decimals);
    return;
  }

  const duration = 1300;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.abs(target * eased) < 0.005 ? 0 : target * eased;

    counter.textContent = formatCounter(value, format, decimals);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

if (counters.length) {
  const statsPanel = document.querySelector(".stats-panel");

  if (!statsPanel) {
    counters.forEach(runCounter);
  } else if (typeof window.IntersectionObserver === "function") {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.querySelectorAll(".counter").forEach(runCounter);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35 },
    );

    observer.observe(statsPanel);
  } else {
    statsPanel.querySelectorAll(".counter").forEach(runCounter);
  }
}

const initCaseSlider = (slider) => {
  const track = slider.querySelector("[data-case-track]");
  const slides = Array.from(slider.querySelectorAll("[data-case-slide]"));
  const dots = Array.from(slider.querySelectorAll("[data-case-dot]"));
  let activeIndex = 0;

  const setActive = (index) => {
    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeIndex);
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });

    slides[activeIndex].querySelectorAll(".case-counter").forEach(runCounter);

    track.style.transform = `translateX(-${activeIndex * 100}%)`;
  };

  slider.addEventListener("click", (event) => {
    const prev = event.target.closest("[data-case-prev]");
    const next = event.target.closest("[data-case-next]");
    const dot = event.target.closest("[data-case-dot]");

    if (prev) {
      setActive(activeIndex - 1);
      return;
    }

    if (next) {
      setActive(activeIndex + 1);
      return;
    }

    if (dot) {
      setActive(dots.indexOf(dot));
    }
  });

  setActive(0);
};

document.querySelectorAll("[data-slider]").forEach(initCaseSlider);

if (!document.querySelector("[data-slider]") && caseCounters.length) {
  caseCounters.forEach(runCounter);
}

if (contactForm) {
  const submitButton = contactForm.querySelector("[data-form-submit]");
  const status = contactForm.querySelector("[data-form-status]");
  const defaultButtonText = submitButton?.textContent || "Оставить заявку";

  const setFormStatus = (message, type) => {
    if (!status) return;

    status.textContent = message;
    status.dataset.status = type;
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      page: window.location.href,
    };

    try {
      payload.utm = JSON.parse(sessionStorage.getItem("levonwb_utm") || "{}");
    } catch {
      payload.utm = {};
    }

    if (!payload.name || !payload.contact || !payload.message) {
      setFormStatus("Заполните имя, контакт и короткое описание проекта.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Отправляю...";
    setFormStatus("", "");

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setFormStatus("Спасибо! Заявка отправлена, я скоро свяжусь с вами.", "success");
      contactForm.reset();

      if (typeof window.ym === "function") {
        window.ym(109329838, "reachGoal", "form_submit");
      }
    } catch {
      setFormStatus("Не удалось отправить заявку. Напишите мне напрямую в Telegram.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = defaultButtonText;
    }
  });
}

const lightbox = document.querySelector("[data-lightbox]");

if (lightbox) {
  const lightboxImage = lightbox.querySelector("[data-lightbox-image]");
  const lightboxMonth = lightbox.querySelector("[data-lightbox-month]");
  const lightboxMetric = lightbox.querySelector("[data-lightbox-metric]");
  const closeButton = lightbox.querySelector("[data-lightbox-close]");
  const prevButton = lightbox.querySelector("[data-lightbox-prev]");
  const nextButton = lightbox.querySelector("[data-lightbox-next]");
  let currentItems = [];
  let currentIndex = 0;

  const getShotData = (shot) => {
    const image = shot.querySelector("img");
    const month = shot.querySelector(".month-label");
    const metric = shot.querySelector(".metric-mark");

    return {
      src: image?.getAttribute("src") || "",
      alt: image?.getAttribute("alt") || "",
      month: month?.textContent?.trim() || "",
      metric: metric?.textContent?.trim() || "",
    };
  };

  const renderLightbox = () => {
    const item = currentItems[currentIndex];
    if (!item) return;

    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
    lightboxMonth.textContent = item.month;
    lightboxMetric.textContent = item.metric;
  };

  const openLightbox = (shot) => {
    const slide = shot.closest("[data-case-slide]");
    currentItems = Array.from(slide?.querySelectorAll(".evidence-shot") || []).map(getShotData);
    currentIndex = Math.max(0, Array.from(slide?.querySelectorAll(".evidence-shot") || []).indexOf(shot));

    renderLightbox();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    closeButton?.focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
  };

  const moveLightbox = (direction) => {
    if (!currentItems.length) return;

    currentIndex = (currentIndex + direction + currentItems.length) % currentItems.length;
    renderLightbox();
  };

  document.querySelectorAll(".evidence-shot").forEach((shot) => {
    const month = shot.querySelector(".month-label")?.textContent?.trim();
    const metric = shot.querySelector(".metric-mark")?.textContent?.trim();

    shot.tabIndex = 0;
    shot.setAttribute("role", "button");
    shot.setAttribute("aria-label", `Открыть скрин: ${month}, ${metric}`);
  });

  document.addEventListener("click", (event) => {
    const shot = event.target.closest(".evidence-shot");

    if (shot) {
      openLightbox(shot);
      return;
    }

    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    const shot = event.target.closest?.(".evidence-shot");

    if (shot && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openLightbox(shot);
      return;
    }

    if (!lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    } else if (event.key === "ArrowRight") {
      moveLightbox(1);
    }
  });

  closeButton?.addEventListener("click", closeLightbox);
  prevButton?.addEventListener("click", () => moveLightbox(-1));
  nextButton?.addEventListener("click", () => moveLightbox(1));
}
