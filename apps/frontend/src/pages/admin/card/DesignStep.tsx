import {
  BACKGROUND_SWATCHES,
  CARD_THEMES,
  IMAGE_FIELD_OF,
  STAMP_ICONS,
  STAMP_ICON_PATHS,
  STAMP_SWATCHES,
  contrastRatio,
  type CardImageKind,
  type StampIcon,
} from '@fidelity/shared';
import { uploadCardImage } from '../../../services/cardService';
import type { CardEditor } from './useCardEditor';
import { ColorSwatches, ImagePicker, Section } from './ui';

const ICON_LABELS: Record<StampIcon, string> = {
  // Genéricos de fidelidad
  STAR: 'Estrella',
  HEART: 'Corazón',
  SPARKLE: 'Destello',
  CHECK: 'Visto bueno',
  CIRCLE: 'Círculo',
  DIAMOND: 'Diamante',
  TRIANGLE: 'Triángulo',
  // Comida y Bebidas
  COFFEE: 'Café / Cafetería',
  BURGER: 'Hamburguesa / Comida rápida',
  PIZZA: 'Pizza / Pizzería',
  FRIES: 'Papas fritas / Snack',
  SANDWICH: 'Sándwich / Almuerzo',
  CUP: 'Bebida / Refresco',
  BEER: 'Cerveza / Bar',
  WINE: 'Copa de vino',
  ICE_CREAM: 'Helado / Postre',
  CAKE: 'Pastel / Cafetería',
  UTENSILS: 'Plato / Restaurante',
  // Premios y Beneficios universales
  GIFT: 'Regalo / Sorpresa',
  TAG: 'Descuento / Oferta',
  TICKET: 'Cupón / Entrada',
  TROPHY: 'Trofeo / Premio mayor',
  CROWN: 'Corona / Membresía VIP',
  // Servicios de canje
  SCISSORS: 'Corte / Barbería',
  BONE: 'Snack / Premio mascota',
};

/** WCAG AA para texto normal. */
const GOOD_CONTRAST = 4.5;

export function DesignStep({ brandId, editor }: { brandId: string; editor: CardEditor }) {
  const { config, updateDesign } = editor;
  if (!config) return null;
  const { design } = config;
  const isStamps = config.type === 'STAMPS';
  const ratio = contrastRatio(design.textColor, design.backgroundColor);

  const upload = (kind: CardImageKind) => async (file: File) => {
    const { url } = await uploadCardImage(brandId, kind, file);
    updateDesign({ [IMAGE_FIELD_OF[kind]]: url });
  };
  const remove = (kind: CardImageKind) => () => updateDesign({ [IMAGE_FIELD_OF[kind]]: null });

  return (
    <div>
      <Section title="Temas de marca" description="Un punto de partida: después puedes ajustar cada color.">
        <div role="radiogroup" aria-label="Temas de marca" className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CARD_THEMES.map((theme) => {
            const selected = theme.design.backgroundColor === design.backgroundColor;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateDesign(theme.design)}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={`w-full aspect-[4/5] rounded-2xl flex items-center justify-center border border-black/10 ${
                    selected ? 'ring-4 ring-brand-blue/50' : ''
                  }`}
                  style={{ backgroundColor: theme.design.backgroundColor }}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill={theme.design.stampFilledColor}>
                    <path d={STAMP_ICON_PATHS[design.stampIcon]} />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{theme.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Logotipos e imagen">
        <div className="grid sm:grid-cols-2 gap-6">
          <ImagePicker
            label="Logotipo cuadrado"
            hint="Arriba a la izquierda del pase, recortado en círculo. Si no lo subes, usamos el ícono del sello."
            value={design.logoUrl}
            aspect="square"
            onUpload={upload('logo')}
            onRemove={remove('logo')}
          />
          <ImagePicker
            label="Logotipo horizontal"
            hint="Opcional. Reemplaza al logo cuadrado y al nombre de la marca en la cabecera. Entre más apaisado, mejor se aprovecha."
            value={design.wideLogoUrl}
            aspect="wide"
            onUpload={upload('wideLogo')}
            onRemove={remove('wideLogo')}
          />
        </div>
        <div className="mt-6">
          <ImagePicker
            label="Imagen destacada"
            hint={
              isStamps
                ? 'Una foto de tu negocio detrás de los sellos. Se recorta a 1032 × 336.'
                : 'Un banner de ancho completo en el frente del pase. Se recorta a 1032 × 336.'
            }
            value={design.heroImageUrl}
            aspect="banner"
            onUpload={upload('hero')}
            onRemove={remove('hero')}
          />
        </div>
      </Section>

      <Section title="Colores de la tarjeta">
        <div className="space-y-5">
          <ColorSwatches
            label="Fondo de la tarjeta"
            value={design.backgroundColor}
            swatches={BACKGROUND_SWATCHES}
            onChange={(backgroundColor) => updateDesign({ backgroundColor })}
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <ColorSwatches
              label="Texto (Apple Wallet)"
              value={design.textColor}
              swatches={STAMP_SWATCHES}
              onChange={(textColor) => updateDesign({ textColor })}
            />
            <ColorSwatches
              label="Etiquetas (Apple Wallet)"
              value={design.labelColor}
              swatches={STAMP_SWATCHES}
              onChange={(labelColor) => updateDesign({ labelColor })}
            />
          </div>
          <p
            role="status"
            className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${
              ratio >= GOOD_CONTRAST
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
            }`}
          >
            <span aria-hidden="true" className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${ratio >= GOOD_CONTRAST ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>
              <strong>{ratio >= GOOD_CONTRAST ? 'Buen contraste' : 'Contraste bajo'} · {ratio.toFixed(1)}:1.</strong>{' '}
              {ratio >= GOOD_CONTRAST ? 'El texto se lee bien sobre el fondo.' : 'Al texto le cuesta leerse sobre este fondo.'} En
              Google Wallet el color del texto lo elige Google según el fondo.
            </span>
          </p>
        </div>
      </Section>

      {isStamps && (
        <Section title="Sellos" description="Cómo se dibuja cada sello en la tira del pase.">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Ícono</p>
              <div role="radiogroup" aria-label="Ícono del sello" className="flex flex-wrap gap-2">
                {STAMP_ICONS.map((icon) => {
                  const selected = design.stampIcon === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={ICON_LABELS[icon]}
                      title={ICON_LABELS[icon]}
                      onClick={() => updateDesign({ stampIcon: icon })}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                        selected
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                        <path d={STAMP_ICON_PATHS[icon]} />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
            <ColorSwatches
              label="Fondo del sello puesto"
              value={design.stampFilledColor}
              swatches={STAMP_SWATCHES}
              onChange={(stampFilledColor) => updateDesign({ stampFilledColor })}
            />
            <ColorSwatches
              label="Ícono del sello puesto"
              value={design.stampIconColor}
              swatches={[...STAMP_SWATCHES, design.backgroundColor]}
              onChange={(stampIconColor) => updateDesign({ stampIconColor })}
            />
            <ColorSwatches
              label="Sello vacío"
              value={design.stampEmptyColor}
              swatches={STAMP_SWATCHES}
              onChange={(stampEmptyColor) => updateDesign({ stampEmptyColor })}
            />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Imágenes del sello</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Opcional. Si las subes, reemplazan al ícono. Mejor con fondo transparente.</p>
              <div className="flex flex-wrap gap-6">
                <ImagePicker
                  label="Sello vacío"
                  value={design.stampEmptyImageUrl}
                  aspect="square"
                  onUpload={upload('stampEmpty')}
                  onRemove={remove('stampEmpty')}
                />
                <ImagePicker
                  label="Sello puesto"
                  value={design.stampFilledImageUrl}
                  aspect="square"
                  onUpload={upload('stampFilled')}
                  onRemove={remove('stampFilled')}
                />
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
