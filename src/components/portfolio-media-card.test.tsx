import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortfolioMediaCard, type PortfolioMediaItem } from "./portfolio-media-card";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

const videoItem: PortfolioMediaItem = {
  caption: "Lemon raspberry cake",
  src: "/portfolio/lemon-raspberry-cake-spinning.mp4",
  alt: "Lemon raspberry cake spinning on display",
  kind: "video"
};

describe("PortfolioMediaCard video playback", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("autoplays once on first reveal and does not restart on re-entry", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<PortfolioMediaCard {...videoItem} />);

    const observer = MockIntersectionObserver.instances[0];
    observer.trigger(true);
    observer.trigger(true);
    observer.trigger(false);

    expect(play).toHaveBeenCalledTimes(1);
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("toggles playback from the centered accessible button", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    render(<PortfolioMediaCard {...videoItem} />);

    const video = screen.getByLabelText(videoItem.alt);
    const button = screen.getByRole("button", { name: "Play Lemon raspberry cake" });

    fireEvent.play(video);
    expect(screen.getByRole("button", { name: "Pause Lemon raspberry cake" })).toBeInTheDocument();
    Object.defineProperty(video, "paused", { configurable: true, value: false });

    fireEvent.click(button);
    expect(pause).toHaveBeenCalledTimes(1);

    fireEvent.pause(video);
    expect(play).not.toHaveBeenCalled();
  });

  it("hides the playback button after one second and reveals it on interaction", () => {
    vi.useFakeTimers();
    const { container } = render(<PortfolioMediaCard {...videoItem} />);
    const video = screen.getByLabelText(videoItem.alt);
    const button = container.querySelector<HTMLButtonElement>(".portfolio-play-button");
    const mediaFrame = video.parentElement;

    expect(button).not.toBeNull();
    expect(mediaFrame).not.toBeNull();

    fireEvent.play(video);
    expect(button).toHaveClass("is-visible");

    act(() => vi.advanceTimersByTime(999));
    expect(button).toHaveClass("is-visible");

    act(() => vi.advanceTimersByTime(1));
    expect(button).toHaveClass("is-hidden");
    expect(button).toHaveAttribute("aria-hidden", "true");

    fireEvent.mouseMove(mediaFrame!);
    expect(button).toHaveClass("is-visible");
    expect(button).toHaveAttribute("aria-hidden", "false");

    fireEvent.pointerDown(mediaFrame!);
    expect(button).toHaveClass("is-visible");
    vi.useRealTimers();
  });

  it("rewinds a completed video when replayed", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<PortfolioMediaCard {...videoItem} />);

    const video = screen.getByLabelText(videoItem.alt) as HTMLVideoElement;
    Object.defineProperty(video, "ended", { configurable: true, value: true });
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 12 });

    fireEvent.ended(video);
    fireEvent.click(screen.getByRole("button", { name: "Play Lemon raspberry cake" }));

    expect(video.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
