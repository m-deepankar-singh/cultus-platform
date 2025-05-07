import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins here to ensure they are available throughout the application
// and to prevent tree-shaking issues with build tools.
gsap.registerPlugin(ScrollTrigger);

// You can export GSAP and its plugins from here to ensure a consistent setup
export { gsap, ScrollTrigger }; 