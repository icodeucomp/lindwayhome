import { localUploadPath } from "./uploads";

export const CART_TARGET_PROPS = { "data-cart-target": "" } as const;

const FLIGHT_MS = 750;
const WIDTH = 60;
const HEIGHT = 72;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const bump = (target: HTMLElement) => {
  if (typeof target.animate !== "function") return;
  target.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)", offset: 0.4 }, { transform: "scale(1)" }], {
    duration: 420,
    easing: "ease-out",
  });
};

export const flyToCart = (source: Element | null | undefined, imageUrl?: string | null) => {
  if (typeof document === "undefined" || !source) return;

  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  if (!target) return;

  if (prefersReducedMotion() || typeof target.animate !== "function") {
    bump(target);
    return;
  }

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();

  const startX = from.left + from.width / 2 - WIDTH / 2;
  const startY = from.top + from.height / 2 - HEIGHT / 2;
  const dx = to.left + to.width / 2 - WIDTH / 2 - startX;
  const dy = to.top + to.height / 2 - HEIGHT / 2 - startY;

  const outer = document.createElement("div");
  outer.setAttribute("aria-hidden", "true");
  Object.assign(outer.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    zIndex: "9999",
    pointerEvents: "none",
  });

  const inner = document.createElement("div");
  Object.assign(inner.style, {
    width: "100%",
    height: "100%",
    borderRadius: "10px",
    backgroundColor: "#F7F3F0",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    border: "2px solid #BA8164",
    boxShadow: "0 10px 28px rgba(57, 50, 44, 0.35)",
    ...(imageUrl ? { backgroundImage: `url("${localUploadPath(imageUrl)}")` } : {}),
  });

  outer.appendChild(inner);
  document.body.appendChild(outer);

  const options = { duration: FLIGHT_MS, fill: "forwards" as const };
  outer.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], { ...options, easing: "cubic-bezier(0.25, 0.6, 0.35, 1)" });
  inner
    .animate(
      [
        { transform: `translateY(0) scale(1)`, opacity: 1 },
        { transform: `translateY(${dy}px) scale(0.25)`, opacity: 0.6 },
      ],
      { ...options, easing: "cubic-bezier(0.55, 0, 0.9, 0.45)" },
    )
    .finished.then(
      () => {
        outer.remove();
        bump(target);
      },
      () => outer.remove(),
    );
};
