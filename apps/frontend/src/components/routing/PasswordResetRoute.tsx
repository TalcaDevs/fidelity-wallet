import { useNavigate } from 'react-router-dom';
import { UpdatePassword } from '../../auth/UpdatePassword';
import { ROUTES } from './routePaths';

// UpdatePassword no conoce el router: este envoltorio traduce su "ya terminé"
// en apagar la bandera de recuperación y entrar al panel.
export function PasswordResetRoute({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();

  const handleDone = () => {
    onDone();
    navigate(ROUTES.dashboard, { replace: true });
  };

  return <UpdatePassword onDone={handleDone} />;
}
