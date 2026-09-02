import sirPhoto from "../assets/sir.jpg";
import { cn } from "../utils/cn";

/**
 * The one and only place Sir's photograph is referenced.
 * To use the original, unedited photo: overwrite `src/assets/sir.jpg`
 * with the original file — nothing else needs to change.
 */
interface Props {
  className?: string;
}

export default function Portrait({ className }: Props) {
  return (
    <span className={cn("block overflow-hidden rounded-full border border-lab-200", className)}>
      <img
        src={sirPhoto}
        alt="Sir George Sarkar in his classroom"
        className="h-full w-full scale-[1.5] object-cover"
        style={{ transformOrigin: "50% 30%" }}
      />
    </span>
  );
}
