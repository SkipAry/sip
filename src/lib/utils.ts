import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class-name helper used by registry components. `twMerge` matters here: it
 * lets a caller's utility class beat the component's own default instead of
 * both landing in the class list and the cascade deciding at random.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
