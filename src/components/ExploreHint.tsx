export function ExploreHint() {
  return (
    <div className="absolute left-[62%] [transform:translateX(-50%)] bottom-[2px] text-[8px] text-[#a1a497] flex items-center gap-[9px] whitespace-nowrap wide:bottom-[14px] mobile:left-1/2 mobile:bottom-auto mobile:top-[805px] short:bottom-[-2px]">
      <svg className="w-[10px] h-[14px]" viewBox="0 0 16 20" fill="none" aria-hidden="true"><rect x="3" y="1" width="10" height="16" rx="5" stroke="currentColor"/><path d="M8 4v4" stroke="currentColor"/></svg>
      Drag to look around <span className="mx-[2px]">·</span> Scroll to get closer
    </div>
  );
}
