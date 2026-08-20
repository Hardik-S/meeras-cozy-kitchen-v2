"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type PortfolioMediaItem = {
  caption: string;
  src: string;
  alt: string;
  kind: "image" | "video";
};

type PortfolioMediaCardProps = PortfolioMediaItem;

export function PortfolioMediaCard({ caption, src, alt, kind }: PortfolioMediaCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoplayTriggeredRef = useRef(false);
  const controlsHideTimeoutRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const clearControlsHideTimeout = () => {
    if (controlsHideTimeoutRef.current !== null) {
      window.clearTimeout(controlsHideTimeoutRef.current);
      controlsHideTimeoutRef.current = null;
    }
  };

  const scheduleControlsHide = () => {
    clearControlsHideTimeout();
    setControlsVisible(true);
    controlsHideTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      controlsHideTimeoutRef.current = null;
    }, 1000);
  };

  const revealControls = () => {
    clearControlsHideTimeout();
    setControlsVisible(true);
    if (isPlaying) {
      scheduleControlsHide();
    }
  };

  useEffect(() => {
    if (kind !== "video") {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const attemptPlay = () => {
      try {
        const playPromise = video.play();
        if (playPromise) {
          void playPromise.catch(() => {
            setIsPlaying(false);
          });
        }
      } catch {
        setIsPlaying(false);
      }
    };

    const playOnce = () => {
      if (autoplayTriggeredRef.current) {
        return;
      }

      autoplayTriggeredRef.current = true;
      attemptPlay();
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      playOnce();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          playOnce();
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [kind]);

  useEffect(() => {
    return () => {
      if (controlsHideTimeoutRef.current !== null) {
        window.clearTimeout(controlsHideTimeoutRef.current);
      }
    };
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }

      try {
        const playPromise = video.play();
        if (playPromise) {
          void playPromise.catch(() => {
            setIsPlaying(false);
          });
        }
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    video.pause();
  };

  return (
    <article aria-label={caption} className="portfolio-card surface overflow-hidden" tabIndex={0}>
      <div
        className="portfolio-image relative aspect-[3/4] overflow-hidden bg-[var(--surface-alt)]"
        onMouseMove={revealControls}
        onPointerDown={revealControls}
      >
        {kind === "image" ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            sizes="(min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              aria-label={alt}
              className="h-full w-full object-contain"
              muted
              playsInline
              preload="metadata"
              onEnded={() => {
                clearControlsHideTimeout();
                setControlsVisible(true);
                setIsPlaying(false);
              }}
              onPause={() => {
                clearControlsHideTimeout();
                setControlsVisible(true);
                setIsPlaying(false);
              }}
              onPlay={() => {
                setIsPlaying(true);
                scheduleControlsHide();
              }}
            >
              <source src={src} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <button
              type="button"
              className={`portfolio-play-button ${controlsVisible ? "is-visible" : "is-hidden"}`}
              aria-label={`${isPlaying ? "Pause" : "Play"} ${caption}`}
              aria-hidden={!controlsVisible}
              aria-pressed={isPlaying}
              tabIndex={controlsVisible ? 0 : -1}
              onClick={togglePlayback}
            >
              {isPlaying ? <Pause aria-hidden="true" size={24} /> : <Play aria-hidden="true" size={24} />}
            </button>
          </>
        )}
      </div>
      <div className="p-5">
        <h2 className="text-2xl font-black">{caption}</h2>
      </div>
    </article>
  );
}
