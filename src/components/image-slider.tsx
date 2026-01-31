"use client";

import * as React from "react";

import { Img } from "./image";

import { FaChevronLeft, FaChevronRight, FaPause, FaPlay } from "react-icons/fa";

interface NavigationArrowProps {
  direction: "left" | "right";
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface PaginationDotsProps {
  images: string[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface PaginationDotProps {
  index: number;
  isActive: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface SlideCounterProps {
  current: number;
  total: number;
}

interface AutoPlayControlProps {
  isAutoPlay: boolean;
  onToggle: () => void;
}

interface SlideProps {
  alt: string;
  image: string;
  isActive: boolean;
}

interface ProgressBarProps {
  current: number;
  total: number;
  isAutoPlay: boolean;
}

interface ImageSliderProps {
  images: string[];
  alt: string;
  className?: string;
  autoPlay?: boolean;
  children?: React.ReactNode;
  showPagination?: boolean;
  showNavigationArrows?: boolean;
  showCounter?: boolean;
  showProgressBar?: boolean;
}

const NavigationArrow: React.FC<NavigationArrowProps> = ({ direction, onClick, onMouseEnter, onMouseLeave }) => {
  const Icon = direction === "left" ? FaChevronLeft : FaChevronRight;
  const position = direction === "left" ? "left-4" : "right-4";

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute ${position} top-1/2 -translate-y-1/2 bg-light/80 hover:bg-light/95 backdrop-blur-md rounded-full p-3 transition-all duration-300 hover:scale-110 shadow-lg opacity-0 group-hover:opacity-100 z-10 focus:outline-none focus:ring-2 focus:ring-gray`}
      aria-label={`${direction === "left" ? "Previous" : "Next"} slide`}
      type="button"
    >
      <Icon className="w-6 h-6 text-gray" />
    </button>
  );
};

const PaginationDots: React.FC<PaginationDotsProps> = ({ images, currentSlide, onSlideChange, onMouseEnter, onMouseLeave }) => {
  return (
    <div className="absolute z-10 flex space-x-3 -translate-x-1/2 bottom-12 left-1/2">
      {images.map((_, index) => (
        <PaginationDot key={index} index={index} isActive={index === currentSlide} onClick={() => onSlideChange(index)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      ))}
    </div>
  );
};

const PaginationDot: React.FC<PaginationDotProps> = ({ index, isActive, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-light/50 ${
        isActive ? "bg-light shadow-lg scale-125" : "bg-light/50 hover:bg-light/75"
      }`}
      aria-label={`Go to slide ${index + 1}`}
      type="button"
    />
  );
};

const SlideCounter: React.FC<SlideCounterProps> = ({ current, total }) => {
  return (
    <div className="absolute z-10 px-3 py-1 text-sm font-medium transition-opacity duration-300 rounded-full opacity-0 top-4 right-4 bg-dark/50 backdrop-blur-md text-light group-hover:opacity-100">
      <span className="font-semibold">{current}</span>
      <span className="mx-1 opacity-75">/</span>
      <span>{total}</span>
    </div>
  );
};

const AutoPlayControl: React.FC<AutoPlayControlProps> = ({ isAutoPlay, onToggle }) => {
  const Icon = isAutoPlay ? FaPause : FaPlay;

  return (
    <div className="absolute z-10 top-4 left-4">
      <button
        onClick={onToggle}
        className={`bg-dark/50 backdrop-blur-md text-light px-3 py-2 rounded-full text-xs font-medium transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-dark/70 focus:outline-none focus:ring-2 focus:ring-light/50 flex items-center space-x-1 ${
          isAutoPlay ? "text-green-300" : "text-red-300"
        }`}
        aria-label={`${isAutoPlay ? "Pause" : "Play"} slideshow`}
        type="button"
      >
        <Icon className="w-3 h-3" />
        <span>Auto</span>
      </button>
    </div>
  );
};

// Custom Slide Component
const Slide: React.FC<SlideProps> = ({ image, isActive, alt }) => {
  return (
    <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${isActive ? "opacity-100" : "opacity-0"}`}>
      <Img src={image} alt={alt} className="w-full h-full" cover />
      <div className="absolute inset-0 bg-linear-to-t from-dark/30 via-transparent to-dark/20"></div>
    </div>
  );
};

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, isAutoPlay }) => {
  const progress = ((current + 1) / total) * 100;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-dark/20">
      <div className={`h-full bg-light transition-all duration-300 ${isAutoPlay ? "animate-pulse" : ""}`} style={{ width: `${progress}%` }} />
    </div>
  );
};

export const ImageSlider = ({
  images,
  alt,
  className = "h-72 sm:h-80 md:h-96 lg:h-80 xl:h-96",
  autoPlay = true,
  showCounter = true,
  showProgressBar = true,
  showNavigationArrows = true,
  showPagination = true,
  children,
}: ImageSliderProps) => {
  const [currentSlide, setCurrentSlide] = React.useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = React.useState<boolean>(autoPlay);
  const [isPaused, setIsPaused] = React.useState<boolean>(false);

  const nextSlide = React.useCallback((): void => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevSlide = React.useCallback((): void => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToSlide = React.useCallback((index: number): void => {
    setCurrentSlide(index);
  }, []);

  React.useEffect(() => {
    if (!isAutoPlay || isPaused) return;

    const interval = setInterval(nextSlide, 9000);
    return () => clearInterval(interval);
  }, [isAutoPlay, isPaused, nextSlide]);

  const handleMouseEnter = (): void => setIsPaused(true);
  const handleMouseLeave = (): void => setIsPaused(false);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-96 md:min-h-125 bg-gray">
        <p className="text-gray">No images to display</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden group mx-auto max-w-96 ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} role="region" aria-label="Image slideshow">
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <Slide key={index} image={image} alt={`${alt}-${index}`} isActive={index === currentSlide} />
        ))}
      </div>

      {showNavigationArrows && (
        <>
          <NavigationArrow direction="left" onClick={prevSlide} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
          <NavigationArrow direction="right" onClick={nextSlide} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
        </>
      )}

      {showPagination && <PaginationDots images={images} currentSlide={currentSlide} onSlideChange={goToSlide} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />}

      {showCounter && <SlideCounter current={currentSlide + 1} total={images.length} />}

      {autoPlay && <AutoPlayControl isAutoPlay={isAutoPlay} onToggle={() => setIsAutoPlay((prev) => !prev)} />}

      {showProgressBar && <ProgressBar current={currentSlide} total={images.length} isAutoPlay={isAutoPlay && !isPaused} />}

      {children}
    </div>
  );
};
