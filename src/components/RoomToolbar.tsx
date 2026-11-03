export function RoomToolbar({ night, onToggle }: { night: boolean; onToggle: () => void }) {
  return (
    <div className="absolute top-[8px] left-[36%] right-[4.3%] flex items-center justify-between z-3 wide:left-[34%] wide:top-[20px] tablet:left-[37%] mobile:top-[227px] mobile:left-[7%] mobile:right-[7%]">
      <span className="text-[8px] tracking-[1.5px] text-muted tablet:text-[6px] mobile:text-[7px] mobile:tracking-[1px]">
        ROOM 001 <span className="mx-[10px] text-[#b9bcae] mobile:mx-[4px]">/</span> THE EVERYDAY STUDIO
      </span>
      <button className="flex items-center gap-[8px] text-[10px] py-[8px] px-[10px] mobile:text-[9px] mobile:py-[5px] mobile:px-0" aria-label={night ? 'Open curtains and switch to day mode' : 'Close curtains and switch to night mode'} onClick={onToggle}>
        <span className="text-[21px]">{night ? '☾' : '☼'}</span>
        <span>{night ? 'After hours' : 'Daylight'}</span>
        <span className="block bg-[#e1e4d6] w-[28px] h-[16px] rounded-[12px] p-[3px] ml-[4px] night:bg-[#53613f]">
          <i className="block w-[10px] h-[10px] bg-[#7d8b61] rounded-full [transition:transform_.5s] night:[transform:translateX(12px)] night:bg-[#cfdbad]"></i>
        </span>
      </button>
    </div>
  );
}
