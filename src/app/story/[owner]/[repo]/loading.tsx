import { BootSequence } from "@/components/BootSequence";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 md:px-8">
      <h1 className="sr-only">Loading commit story</h1>
      <BootSequence stage="route" />
    </main>
  );
}
