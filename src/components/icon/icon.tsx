// A design system icon (src/design-system/icons.ts). It takes the colour of its
// text (currentColor) and the size of its font (1em). For an icon the design
// system doesn't have, use Tabler (@tabler/icons-react) instead; never draw one.

import { dsIcons, type DsIconName } from "@/design-system/icons";
import styles from "./icon.module.css";

export function Icon({ name, className }: { name: DsIconName; className?: string }) {
  return (
    <span
      className={className ? `${styles.icon} ${className}` : styles.icon}
      // The markup is generated from the design system's own SVGs, never from input.
      dangerouslySetInnerHTML={{ __html: dsIcons[name] }}
    />
  );
}
