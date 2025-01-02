import type { FC, PropsWithChildren } from 'react';

const Overlay: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className='fixed flex inset-0 bg-black/50 z-50'>{children}</div>
  );
};

export default Overlay;
