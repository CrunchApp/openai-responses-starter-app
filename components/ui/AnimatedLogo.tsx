import React from 'react';

interface AnimatedLogoProps {
  size?: number; // Size of the square frame (width and height)
  className?: string; // Optional additional CSS classes
}

/**
 * Renders the animated Vista logo SVG within a square frame.
 * Uses an <object> tag to preserve SVG animations driven by scripts.
 * The wrapping div with overflow: hidden crops the SVG content.
 */
export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 80, className = '' }) => {
  // Style for the wrapping div to create the square frame and crop
  const wrapperStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    overflow: 'hidden', // Important for cropping the SVG content
    display: 'block', // Changed to block display
    position: 'relative', // Needed for potential absolute positioning of children if required later
    aspectRatio: '1 / 1', // Explicitly enforce a square aspect ratio
  };

  // Style for the <object> tag itself.
  // Adjust transform (scale, translate) to focus on the desired part of the SVG animation.
  // These values are initial guesses and might need tweaking.
  const objectStyle: React.CSSProperties = {
    position: 'absolute', // Allows precise positioning within the wrapper
    top: '-75%', // Adjusted to shift SVG down slightly within the frame
    left: '50%',  // Adjusted to shift SVG left slightly within the frame
    width: '350%', // Scale the SVG content (adjust as needed)
    height: '350%',
    pointerEvents: 'none', // Disable interactions with the SVG object itself
  };

  return (
    <div style={wrapperStyle} className={className}>
      <object
        type="image/svg+xml"
        data="/VistaAnimated.svg" // Path relative to the public folder
        aria-label="Loading logo"
        style={objectStyle}
      >
        {/* Fallback content if the SVG object fails to load */}
        Loading...
      </object>
    </div>
  );
};

export default AnimatedLogo; 