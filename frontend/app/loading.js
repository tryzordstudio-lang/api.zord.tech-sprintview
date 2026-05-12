import { LoadingLogo } from "@/components/loading-logo";

export default function Loading() {
  return (
    <main className="simple-loading-screen">
      <div className="brand-loading-stage">
        <LoadingLogo />
      </div>
    </main>
  );
}
