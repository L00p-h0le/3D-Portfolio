export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div role="status" className={`fixed bottom-[120px] left-1/2 z-15 py-[12px] px-[18px] border border-line rounded-[8px] bg-surface shadow-[0_6px_20px_var(--shadow)] text-[11px] pointer-events-none [transition:.3s] max-w-[90%] text-center mobile:bottom-[25px] ${visible ? 'opacity-100 [transform:translateX(-50%)_translateY(0)]' : 'opacity-0 [transform:translateX(-50%)_translateY(10px)]'}`}>
      {message}
    </div>
  );
}
