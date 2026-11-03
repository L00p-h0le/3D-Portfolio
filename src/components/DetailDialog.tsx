import type { MouseEvent, ReactNode, RefObject, SyntheticEvent } from 'react';

interface Props {
  dialogRef: RefObject<HTMLDialogElement>;
  closeRef: RefObject<HTMLButtonElement>;
  location: string;
  isBusy: () => boolean;
  onBusyClose: () => void;
  onClosed: () => void;
  children: ReactNode;
}

export function DetailDialog({ dialogRef, closeRef, location, isBusy, onBusyClose, onClosed, children }: Props) {
  const onCancel = (e: SyntheticEvent) => { if (isBusy()) e.preventDefault(); };
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    const dialog = e.currentTarget;
    if (e.target === dialog && !isBusy()) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    }
  };
  const onCloseButton = () => { if (isBusy()) { onBusyClose(); return; } dialogRef.current?.close(); };
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="panel-title"
      className="fixed left-auto right-[24px] top-1/2 [transform:translateY(-50%)] m-0 w-[390px] max-w-[calc(100%-32px)] max-h-[calc(100dvh-48px)] p-[25px] border border-line rounded-[16px] bg-surface text-ink shadow-[0_20px_80px_#17251b24] overflow-auto backdrop:bg-[#26332226] backdrop:[backdrop-filter:blur(3px)] mobile:right-[16px] mobile:rounded-[12px] mobile:p-[22px] mobile:max-h-[calc(100dvh-32px)]"
      onCancel={onCancel}
      onClose={onClosed}
      onClick={onBackdrop}
    >
      <div className="flex items-center justify-between mb-[16px]">
        <span className="block text-[8px] tracking-[1.1px] text-muted font-medium">{location}</span>
        <button ref={closeRef} className="h-[30px] w-[30px] border border-line rounded-full text-[20px]" aria-label="Close panel" onClick={onCloseButton}>×</button>
      </div>
      <div>{children}</div>
    </dialog>
  );
}
