'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Ensure GSAP plugins are registered (this is important!)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Define initial image properties with improved positioning - use all available images
const initialImages = [
  {
    src: '/images/-post-ai-image-1089.png.webp',
    top: '17vh', left: '17vw', width: '14vw', height: 'auto',
    speed: -0.2
  },
  {
    src: '/images/b5523e19642d4d5ba21db1b3494f0666.jpg',
    top: '17vh', left: '55vw', width: '18vw', height: 'auto',
    speed: 0.3
  },
  {
    src: '/images/-post-ai-image-3494.png.webp',
    top: '50vh', left: '5vw', width: '18vw', height: 'auto',
    speed: -0.1
  },
  {
    src: '/images/11062b_a5f0c551c3bf4fefbd09cf3ad35aace7~mv2.jpeg',
    top: '70vh', left: '65vw', width: '16vw', height: 'auto',
    speed: 0.2
  },
  {
    src: '/images/-post-ai-image-1090.png.webp',
    top: '65vh', left: '30vw', width: '16vw', height: 'auto',
    speed: 0.15
  },
  {
    src: '/images/-post-ai-image-3495.png.webp',
    top: '30vh', left: '80vw', width: '20vw', height: 'auto',
    speed: -0.25
  },
  {
    src: '/images/11062b_e85883f1ab314a908d31400c5a82264e~mv2.jpeg',
    top: '120vh', left: '12vw', width: '26vw', height: 'auto',
    speed: 0.1
  }
];

export function FloatingImages() {
  // Create references for the images
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Safety check for window/document existence (SSR)
    if (typeof window === 'undefined') return;

    // Clear any existing animation
    const cleanup = () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };

    // Initialize image animations with a slight delay to ensure DOM is ready
    const initAnimations = () => {
      // Ensure all images are loaded before animating
      Promise.all(
        Array.from(document.querySelectorAll('.floating-image'))
          .map(img => {
            return new Promise(resolve => {
              if ((img as HTMLImageElement).complete) {
                resolve(true);
              } else {
                img.addEventListener('load', () => resolve(true));
                img.addEventListener('error', () => resolve(false));
              }
            });
          })
      ).then(() => {
        // Apply initial animation to make images appear with a stagger
        gsap.from('.floating-image', {
          opacity: 0,
          scale: 0.8,
          y: 30,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power2.out',
        });

        // Setup scroll-based animations for each image
        imageRefs.current.forEach((img, i) => {
          if (!img) return;
          
          // Create random subtle rotation
          const rotation = Math.random() * 10 - 5; // Between -5 and 5 degrees
          
          // Apply movement based on scroll
          gsap.to(img, {
            y: `${initialImages[i].speed * 100}%`, // Movement relative to scroll
            rotation: rotation, // Subtle rotation
            ease: 'none',
            scrollTrigger: {
              trigger: 'body',
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1,
              invalidateOnRefresh: true,
            }
          });

          // Add subtle floating animation independent of scroll
          gsap.to(img, {
            y: '+=15', // Move up and down slightly
            duration: 3 + Math.random() * 2, // Random duration between 3-5s
            repeat: -1, // Infinite repeat
            yoyo: true, // Go back and forth
            ease: 'sine.inOut',
          });
        });
      });
    };

    // Small delay to ensure DOM is fully ready
    const timer = setTimeout(initAnimations, 100);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-[200vh] pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {initialImages.map((img, i) => (
        <img
          key={i}
          ref={el => { imageRefs.current[i] = el; }}
          src={img.src}
          alt={`Decorative background element ${i + 1}`}
          className="floating-image absolute rounded-lg shadow-xl"
          style={{
            // For the first 5 images, keep them in the top section
            top: i < 5 ? img.top : `calc(${img.top})`, 
            left: img.left,
            width: img.width,
            height: img.height,
            opacity: 0.9, // Increased opacity for better visibility
            filter: 'saturate(1.2) brightness(1.1)',
            transform: 'scale(1)',
          }}
        />
      ))}
    </div>
  );
} 