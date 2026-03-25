import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="rounded-[2.5rem] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-rateup-blue/20 via-[#0a0f1c] to-[#0a0f1c] border border-white/10 p-12 md:p-16 text-center shadow-[0_0_80px_-20px_rgba(46,91,255,0.2)] relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] bg-rateup-blue/30 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Stop Losing Customers <br />
            <span className="text-gray-400">you already earned</span>
          </h2>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Join thousands of businesses already using Rateup to automate
            support, increase retention, and boost customer lifetime value.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-rateup-blue hover:bg-rateup-blue-2 text-white h-14 px-8 text-lg rounded-full shadow-[0_0_20px_rgba(46,91,255,0.3)] hover:shadow-[0_0_30px_rgba(46,91,255,0.5)] transition-all"
            >
              Start for free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-lg border-white/20 hover:bg-white/5 rounded-full text-white bg-transparent"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
