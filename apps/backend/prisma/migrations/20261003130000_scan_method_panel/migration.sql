-- Sellos que el dueño suma desde la ficha del cliente en el panel, sin escanear en caja.
-- Se distinguen de MANUAL (búsqueda por RUT/teléfono/correo en el escáner) en el historial y en los reportes.
ALTER TYPE "ScanMethod" ADD VALUE 'PANEL';
