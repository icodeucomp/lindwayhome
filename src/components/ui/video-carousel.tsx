"use client";

import * as React from "react";

import { FaChevronLeft, FaChevronRight, FaPause, FaPlay, FaVolumeMute, FaVolumeUp } from "react-icons/fa";

import { configParametersApi } from "@/utils";

import { ApiResponse, ConfigParameterData, Files } from "@/types";

export const VideoCarousel = () => {
  const [videos, setVideos] = React.useState<Files[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [playingVideo, setPlayingVideo] = React.useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = React.useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [dragStart, setDragStart] = React.useState<number>(0);
  const [dragOffset, setDragOffset] = React.useState<number>(0);

  const videoRefs = React.useRef<{ [key: string]: HTMLVideoElement | null }>({});
  // Tracks which slide index was "active" when a play() was initiated,
  // so async callbacks can bail out if the slide has already changed.
  const activeSlideRef = React.useRef<number>(currentIndex);

  const { data: parameter, isLoading } = configParametersApi.useGetConfigParametersPublic<ApiResponse<ConfigParameterData>>({
    key: ["config-parameters-public"],
    keyParams: ["videos_curated_collection"],
  });

  const pauseAll = React.useCallback(() => {
    Object.values(videoRefs.current).forEach((v) => {
      if (v && !v.paused) v.pause();
    });
    setPlayingVideo(null);
  }, []);

  const goToSlide = React.useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const nextSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  }, [videos.length]);

  const prevSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  }, [videos.length]);

  const handlePlayPause = (videoFilename: string) => {
    const video = videoRefs.current[videoFilename];
    if (!video) return;

    if (playingVideo === videoFilename) {
      video.pause();
      setPlayingVideo(null);
    } else {
      pauseAll();
      video
        .play()
        .then(() => {
          setPlayingVideo(videoFilename);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error(err);
        });
    }
  };

  const handleMuteToggle = (videoFilename: string) => {
    const video = videoRefs.current[videoFilename];
    if (!video) return;

    setMutedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoFilename)) {
        next.delete(videoFilename);
        video.muted = false;
      } else {
        next.add(videoFilename);
        video.muted = true;
      }
      return next;
    });
  };

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setDragOffset(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    setDragOffset(clientX - dragStart);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset > 100) prevSlide();
    else if (dragOffset < -100) nextSlide();
    setDragOffset(0);
  };

  // Populate videos from API
  React.useEffect(() => {
    if (parameter?.data) {
      setVideos(parameter.data.videos_curated_collection);
    }
  }, [parameter]);

  // Reset refs when video list changes
  React.useEffect(() => {
    videoRefs.current = {};
  }, [videos]);

  // Auto-play the current slide
  React.useEffect(() => {
    if (videos.length === 0) return;

    const slideIndex = currentIndex;
    activeSlideRef.current = slideIndex;

    // Pause everything first, synchronously
    pauseAll();

    const currentVideo = videos[slideIndex];
    if (!currentVideo) return;

    const videoEl = videoRefs.current[currentVideo.filename];
    if (!videoEl) return;

    videoEl
      .play()
      .then(() => {
        // Only update state if this slide is still active
        if (activeSlideRef.current === slideIndex) {
          setPlayingVideo(currentVideo.filename);
        }
      })
      .catch((err) => {
        // AbortError is expected when slides change quickly — ignore it
        if (err.name !== "AbortError") console.error(err);
      });
  }, [currentIndex, videos, pauseAll]);

  const currentVideo = videos[currentIndex];
  const isCurrentVideoPlaying = currentVideo && playingVideo === currentVideo.filename;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative h-full overflow-hidden rounded cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))` }}>
          {videos.map((video, index) => (
            <div key={video.filename} className="relative shrink-0 w-full h-full">
              <div className="absolute inset-0 bg-dark/20"></div>

              <video
                ref={(el) => {
                  videoRefs.current[video.filename] = el;
                }}
                className="object-cover w-full h-full"
                preload="metadata"
                onEnded={() => setPlayingVideo(null)}
              >
                <source src={video.url} type="video/mp4" />
              </video>

              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => handlePlayPause(video.filename)}
                  className={`bg-light/90 hover:bg-light text-gray rounded-full p-2 sm:p-4 md:p-6 transition-all duration-300 hover:scale-110 ${
                    isCurrentVideoPlaying && index === currentIndex ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {playingVideo === video.filename ? <FaPause className="size-4 sm:size-8" /> : <FaPlay className="size-4 sm:size-8" />}
                </button>
              </div>

              <div className="absolute top-3 sm:top-6 right-3 sm:right-6">
                <button onClick={() => handleMuteToggle(video.filename)} className="p-3 transition-all duration-200 rounded-full bg-dark/60 hover:bg-dark/80 text-light backdrop-blur-sm">
                  {mutedVideos.has(video.filename) ? <FaVolumeMute className="size-3 sm:size-6" /> : <FaVolumeUp className="size-3 sm:size-6" />}
                </button>
              </div>

              {playingVideo === video.filename && (
                <div className="absolute hidden top-6 left-6 md:block">
                  <div className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 rounded-full text-light backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-light animate-pulse"></div>
                    PLAYING
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button onClick={prevSlide} className="absolute z-10 p-2 transition-all duration-200 -translate-y-1/2 rounded-full sm:p-4 left-6 top-1/2 bg-dark/50 hover:bg-dark/70 text-light backdrop-blur-sm">
        <FaChevronLeft className="size-4 md:size-8" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute z-10 p-2 transition-all duration-200 -translate-y-1/2 rounded-full sm:p-4 right-6 top-1/2 bg-dark/50 hover:bg-dark/70 text-light backdrop-blur-sm"
      >
        <FaChevronRight className="size-4 md:size-8" />
      </button>

      <div className="absolute z-10 flex gap-3 -translate-x-1/2 bottom-4 sm:bottom-8 left-1/2">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`size-2 sm:size-3 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-light scale-125" : "bg-light/40 hover:bg-light/60"}`}
          />
        ))}
      </div>
    </>
  );
};
