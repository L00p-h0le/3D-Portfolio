import { Icon, type IconName } from './Icon';
import type { PanelType } from '../lib/room';

const ITEMS: { action: PanelType; icon: IconName; label: string; key: string }[] = [
  { action:'projects', icon:'drawer', label:'Projects', key:'1' },
  { action:'stack', icon:'monitor', label:'My stack', key:'2' },
  { action:'about', icon:'person', label:'About me', key:'3' },
  { action:'music', icon:'music', label:'The playlist', key:'4' },
  { action:'wardrobe', icon:'shirt', label:'Wardrobe', key:'5' },
];

export function RoomDock({ active, onAction }: { active: PanelType | null; onAction: (type: PanelType) => void }) {
  const button = (item: typeof ITEMS[number]) => (
    <button key={item.action} className={`flex items-center gap-[8px] text-[10px] p-[10px] rounded-[6px] hover:bg-[#e9eddf] night:hover:bg-[#47543f] tablet:py-[10px] tablet:px-[7px] tablet:gap-[5px] mobile:flex-col mobile:gap-[7px] mobile:text-[8px] mobile:py-[8px] mobile:px-[5px] mobile:min-w-[49px] ${active === item.action ? 'bg-[#e9eddf] night:bg-[#47543f]' : ''}`} onClick={() => onAction(item.action)}>
      <span className="flex"><Icon name={item.icon} className="w-[16px] h-[16px] mobile:w-[19px] mobile:h-[19px]" /></span>
      <span>{item.label}</span>
      <kbd className="text-[8px] border border-[#d9ddcd] text-[#99a08a] rounded-[3px] py-[1px] px-[3px] ml-[2px] [font-family:inherit] tablet:hidden">{item.key}</kbd>
    </button>
  );
  return (
    <nav className="absolute bottom-[31px] left-[62%] [transform:translateX(-50%)] flex items-center gap-[4px] bg-[#fafaf3e6] border border-white rounded-[12px] p-[8px] shadow-[0_6px_26px_var(--shadow)] z-4 whitespace-nowrap night:bg-[#303c34ed] night:border-[#495745] wide:bottom-[45px] mobile:left-1/2 mobile:bottom-auto mobile:top-[724px] mobile:w-[90%] mobile:max-w-[450px] mobile:justify-between mobile:py-[8px] mobile:px-[6px] short:bottom-[23px]" aria-label="Explore the room">
      {ITEMS.slice(0, 3).map(button)}
      <span className="h-[22px] w-px bg-line mx-[4px] mobile:hidden"></span>
      {ITEMS.slice(3).map(button)}
    </nav>
  );
}
