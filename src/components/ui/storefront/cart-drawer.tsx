"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";

import { Img } from "@/components";

import { useCartDrawer, useCartStore, useLocaleHref } from "@/hooks";

import { brandByKey } from "@/static/taxonomy";

import { formatIDR } from "@/utils";

import { PiMinus, PiPlus, PiTrash, PiX } from "react-icons/pi";

import { IMAGE_FALLBACK, StoreButton } from "./ui";

/**
 * Slide-over bag (reference/Cart Details - Available.png, Cart Details - Empty.png).
 *
 * A preview only: CHECKOUT hands off to `/cart`, which owns the address form, the
 * shipping calculation and the signed checkout token. None of that moves here — the
 * pricing path is the frozen zone (D8).
 *
 * Mounted once by the public layout, so any "add to bag" anywhere can open it.
 */
export const CartDrawer = () => {
  const { isOpen, close } = useCartDrawer();
  const { cart, updateQuantity, removeFromCart, getCartTotal, getCartItemCount } = useCartStore();

  const router = useRouter();
  const localeHref = useLocaleHref();

  // Close on Escape, and stop the page behind from scrolling while the panel is open.
  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  const goToCheckout = () => {
    close();
    router.push(localeHref("/cart"));
  };

  const startShopping = () => {
    close();
    router.push(localeHref("/new-arrivals"));
  };

  const itemCount = getCartItemCount();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-60 bg-body/50"
            aria-hidden
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            className="fixed inset-y-0 right-0 z-70 flex w-full max-w-lg flex-col bg-light"
          >
            <div className="flex items-center justify-between gap-4 px-6 pt-8 pb-4">
              <h2 className="text-2xl uppercase font-heading text-primary">
                Your Cart <span className="text-body">({itemCount} items)</span>
              </h2>
              <button type="button" onClick={close} aria-label="Close cart" className="transition-colors text-primary hover:text-body">
                <PiX className="size-6" />
              </button>
            </div>
            <div className="mx-6 border-b border-primary" />

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 text-center">
                <p className="text-2xl uppercase font-heading text-primary">Your cart is empty</p>
                <p className="text-2xl leading-snug font-heading text-body">
                  Looks like your
                  <br />
                  bag needs a little style
                </p>
                <StoreButton variant="outline" onClick={startShopping}>
                  Start Shopping
                </StoreButton>
              </div>
            ) : (
              <>
                <div className="flex-1 px-6 overflow-y-auto divide-y divide-border">
                  {cart.map((item) => {
                    const brand = brandByKey(item.brand);

                    return (
                      <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4 py-5">
                        <Img src={item.images?.[0]?.url ?? IMAGE_FALLBACK} alt={item.name} className="w-24 shrink-0 aspect-3/4 bg-footer/30" cover />

                        <div className="flex-1 space-y-1.5">
                          <p className="text-sm uppercase font-heading text-body tracking-[0.04em]">{item.name}</p>
                          <p className="text-xs text-body/70">
                            {brand?.label ?? item.brand} &middot; {item.selectedSize}
                          </p>
                          <p className="text-sm text-body">{formatIDR(item.discountedPrice)}</p>

                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center border border-border">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                                aria-label="Decrease quantity"
                                className="grid size-8 place-items-center text-body hover:text-primary"
                              >
                                <PiMinus className="size-3" />
                              </button>
                              <span className="w-8 text-sm text-center text-body">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                                aria-label="Increase quantity"
                                className="grid size-8 place-items-center text-body hover:text-primary"
                              >
                                <PiPlus className="size-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id, item.selectedSize)}
                              aria-label={`Remove ${item.name}`}
                              className="transition-colors text-body/60 hover:text-primary"
                            >
                              <PiTrash className="size-4" />
                            </button>
                          </div>

                          <p className="pt-1 text-sm font-heading text-body">{formatIDR(item.discountedPrice * item.quantity)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 py-6 space-y-4 border-t border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-heading text-body">Subtotal</p>
                      <p className="max-w-56 text-xs text-body/70">Taxes included. Shipping calculated at checkout.</p>
                    </div>
                    <p className="text-2xl font-heading text-body">{formatIDR(getCartTotal())}</p>
                  </div>

                  <StoreButton onClick={goToCheckout} className="w-full py-4 text-sm">
                    Checkout
                  </StoreButton>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
