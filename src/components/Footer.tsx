import { outfits } from '../data/outfits';

export function Footer({ localTime, outfitDay }: { localTime: string; outfitDay: number }) {
  return (
    <footer className="h-[52px] flex items-center justify-end my-0 mx-[4.2%] border-t border-line text-[7px] tracking-[1.5px] text-[#9a9e90] mobile:h-[80px] mobile:mt-[50px] mobile:mx-[7%] mobile:mb-0 mobile:gap-[17px] mobile:flex-col mobile:justify-center mobile:text-[6px] mobile:tracking-[1px] short:h-[45px]">
      <span className="flex items-center gap-[7px]">
        <span>{localTime}</span><span className="mx-[10px] text-[#c4c6b9]">/</span><span>{outfits[outfitDay].day.toUpperCase()}</span>’S FIT
        <span className="w-[7px] h-[7px] rounded-[2px] ml-[3px]" style={{ background: outfits[outfitDay].color }}></span>
      </span>
    </footer>
  );
}
