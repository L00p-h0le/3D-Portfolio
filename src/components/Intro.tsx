export function Intro({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="absolute z-2 left-[5.2%] top-[18%] pointer-events-none *:pointer-events-auto wide:top-[22%] tablet:left-[4%] tablet:top-[14%] mobile:top-[25px] mobile:left-[7%] mobile:right-[7%] short:top-[12%]" aria-labelledby="welcome-title">
      <div className="text-[8px] tracking-[1.3px] flex items-center gap-[8px] font-semibold tablet:text-[6px] tablet:tracking-[1px] mobile:text-[7px]">
        <span className="h-[5px] w-[5px] bg-[#829460] rounded-full shadow-[0_0_0_4px_#84936410]"></span> WELCOME TO MY CORNER OF THE INTERNET
      </div>
      <h1 id="welcome-title" className="font-display font-medium tracking-[-3px] text-[length:clamp(40px,4.1vw,66px)] leading-[1.14] mt-[26px] mx-0 mb-[23px] tablet:text-[43px] mobile:leading-[1.1] mobile:tracking-[-2.4px] mobile:mt-[20px] mobile:mb-[14px] short:text-[47px] short:my-[20px]">
        A little room.<br />A lot of <em className="not-italic text-[#829267]">me.</em>
      </h1>
      <p className="text-[12px] leading-[1.9] text-[#83877b] night:text-[#a1afa0] tablet:text-[11px] mobile:leading-[1.7] mobile:max-w-[230px]">
        A space for the things I build, <br className="mobile:hidden" />the tools I love, and a little everyday life.
      </p>
      <button className="flex items-center gap-[35px] bg-ink text-bg text-[11px] py-[14px] px-[18px] rounded-[5px] mt-[27px] hover:bg-accent hover:text-bg mobile:absolute mobile:right-0 mobile:bottom-[8px] mobile:text-[0px] mobile:p-[13px]" onClick={onExplore}>
        Take a look around <span className="text-[17px] mobile:text-[21px]">↗</span>
      </button>
      <div className="mt-[28px] flex gap-[12px] text-[10px] text-muted leading-[1.7] mobile:hidden short:mt-[19px]">
        <span className="text-[30px] leading-none rotate-[-12deg]">↳</span><span>Everything has a story.<br />Click something to find it.</span>
      </div>
    </section>
  );
}
