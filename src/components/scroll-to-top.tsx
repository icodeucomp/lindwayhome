"use client";

import * as React from "react";

import { FaChevronUp } from "react-icons/fa";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = React.useState<boolean>(false);

  React.useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-4 right-4 z-50 
        w-12 h-12 
        bg-gray
        hover:bg-darker-gray
        text-light 
        rounded-full 
        shadow-lg hover:shadow-xl 
        transition-all duration-300 ease-in-out
        flex items-center justify-center
        transform hover:-translate-y-1 hover:scale-110
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <FaChevronUp size={20} className="stroke-2" />
    </button>
  );
};
