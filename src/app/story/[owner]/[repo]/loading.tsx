import { BootSequence } from "@/components/BootSequence";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <BootSequence stage="route" />
    </main>
  );
}
