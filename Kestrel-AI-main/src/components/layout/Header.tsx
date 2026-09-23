import { ModeToggle } from "@/components/theme/mode-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl text-[#26A69A]">
              SQL Generator
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center">
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
