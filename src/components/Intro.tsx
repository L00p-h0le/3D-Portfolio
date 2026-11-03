export function Intro({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="absolute z-2 left-[5.2%] top-[18%] pointer-events-none *:pointer-events-auto wide:top-[22%] tablet:left-[4%] tablet:top-[14%] mobile:top-[25px] mobile:left-[7%] mobile:right-[7%] short:top-[12%]" aria-labelledby="welcome-title">
      <h1 id="welcome-title" className="font-display font-medium tracking-[-3px] text-[length:clamp(40px,4.1vw,66px)] leading-[1.14] mt-0 mx-0 mb-[23px] tablet:text-[43px] mobile:leading-[1.1] mobile:tracking-[-2.4px] mobile:mb-[14px] short:text-[47px] short:mb-[20px]">
        A little room.<br />A lot of <em className="not-italic text-[#829267]">me.</em>
      </h1>
      <p className="text-[12px] leading-[1.9] text-[#83877b] night:text-[#a1afa0] tablet:text-[11px] mobile:leading-[1.7] mobile:max-w-[230px]">
        A space for the things I build, <br className="mobile:hidden" />the tools I love, and a little everyday life.
      </p>
      <button className="inline-flex items-center justify-center h-[42px] px-[22px] bg-ink text-bg text-[12px] rounded-[6px] mt-[27px] hover:bg-accent hover:text-bg mobile:h-[34px] mobile:px-[14px] mobile:text-[10px] mobile:mt-[16px]" onClick={onExplore}>
        Take a look around
      </button>
      <div className="mt-[28px] flex gap-[12px] text-[10px] text-muted leading-[1.7] mobile:hidden short:mt-[19px]">
        <span className="text-[30px] leading-none rotate-[-12deg]">↳</span><span>Everything has a story.<br />Click something to find it.</span>
      </div>
    </section>
  );
}
