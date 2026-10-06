import { Link } from 'react-router-dom';
import WalletIcon from '../../assets/home/wallet.svg?react';
import { ROUTES } from '../routing/routePaths';

export function PanelBrand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to={ROUTES.dashboard} onClick={onClick} aria-label="Fidelity Wallet, panel de inicio" className="inline-flex items-center gap-2.5 whitespace-nowrap">
      <span className="grid h-9 w-9 shrink-0 -rotate-6 place-items-center rounded-xl bg-panel-primary text-white shadow-sm">
        <WalletIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-extrabold tracking-[-0.8px]">
        fidelity<span className="font-medium">wallet</span><span className="text-panel-gold">.</span>
      </span>
    </Link>
  );
}
