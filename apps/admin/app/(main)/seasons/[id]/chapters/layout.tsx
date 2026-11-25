// The chapter push waits for Expo delivery receipts (~10-15s), longer than some
// hosts' default server action timeout.
export const maxDuration = 60;

export default function ChaptersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
