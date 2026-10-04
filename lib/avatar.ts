/**
 * A round, deterministic generated avatar for anyone without an uploaded
 * photo — same seed always produces the same image, so a person's pin
 * looks consistent across visits without us storing anything. These are
 * stylized/illustrated (DiceBear), never a photo-realistic face, so there's
 * no implication that a real photo of a real person is being shown.
 */
export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}
