export function RoomToolbar({ night, onToggle }: { night: boolean; onToggle: () => void }) {
  return (
    <button className="flex items-center gap-[8px] text-[10px] py-[8px] px-[10px] mobile:text-[9px] mobile:py-[5px] mobile:px-0" aria-label={night ? 'Open curtains and switch to day mode' : 'Close curtains and switch to night mode'} onClick={onToggle}>
      <span className="text-[21px]">{night ? '☾' : '☼'}</span>
      <span>{night ? 'After hours' : 'Daylight'}</span>
      <span className="block bg-[#e1e4d6] w-[28px] h-[16px] rounded-[12px] p-[3px] ml-[4px] night:bg-[#53613f]">
        <i className="block w-[10px] h-[10px] bg-[#7d8b61] rounded-full [transition:transform_.5s] night:[transform:translateX(12px)] night:bg-[#cfdbad]"></i>
      </span>
    </button>
  );
}
