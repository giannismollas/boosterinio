import Link from "next/link";
import { LogoMark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="crt w-full max-w-lg p-8 text-center sm:p-10">
        <LogoMark className="mx-auto h-10" />
        <p className="t-display t-phosphor mt-6 text-[3.75rem] leading-none">404</p>
        <h1 className="t-display mt-2 text-4xl text-[#ffffff] uppercase">Game over</h1>
        <p className="mt-3 text-[#c8c3d0]">This page doesn&apos;t exist, or the listing was sold or removed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-coin">
            Continue · Home
          </Link>
          <Link href="/games" className="btn btn-ghost">
            Browse games
          </Link>
        </div>
      </div>
    </div>
  );
}
