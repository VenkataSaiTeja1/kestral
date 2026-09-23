import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

export function BackToTop() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className="fixed bottom-6 right-6 rounded-full h-12 w-12 shadow-lg bg-[#26A69A] hover:bg-[#2bbeaf] text-white z-50"
      onClick={scrollToTop}
    >
      <ChevronUp className="h-6 w-6" />
    </Button>
  );
}
