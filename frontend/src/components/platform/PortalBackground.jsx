import { useEffect } from "react";

const BG_URL = "/images/super-admin-bg.png";

/**
 * PortalBackground
 * Directly sets the background image on document.body via JS style attribute.
 * This approach cannot be overridden by any CSS (Tailwind, global styles, etc.)
 * Cleans up on unmount to restore normal app background.
 */
export default function PortalBackground() {
  useEffect(() => {
    const prev = {
      backgroundImage:    document.body.style.backgroundImage,
      backgroundSize:     document.body.style.backgroundSize,
      backgroundRepeat:   document.body.style.backgroundRepeat,
      backgroundPosition: document.body.style.backgroundPosition,
      minHeight:          document.body.style.minHeight,
    };

    document.body.style.backgroundImage    = `url('${BG_URL}')`;
    document.body.style.backgroundSize     = "100% 100%";
    document.body.style.backgroundRepeat   = "no-repeat";
    document.body.style.backgroundPosition = "top left";
    document.body.style.minHeight          = "100vh";

    return () => {
      document.body.style.backgroundImage    = prev.backgroundImage;
      document.body.style.backgroundSize     = prev.backgroundSize;
      document.body.style.backgroundRepeat   = prev.backgroundRepeat;
      document.body.style.backgroundPosition = prev.backgroundPosition;
      document.body.style.minHeight          = prev.minHeight;
    };
  }, []);

  return null; // renders nothing — side-effect only
}
