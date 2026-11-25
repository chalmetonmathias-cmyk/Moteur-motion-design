/**
 * Contrat des composants réutilisables.
 *
 * Un composant est une MACRO : à partir de props validées, il produit des
 * calques JSON ordinaires (`LayerInput[]`), qui sont ensuite validés et
 * normalisés par le parser comme n'importe quel calque. Conséquences :
 *  - le moteur de rendu ignore tout des composants (zéro code spécifique) ;
 *  - un composant peut utiliser toutes les fonctionnalités du format
 *    (split, keyframes, gradients, "$palette"…) ;
 *  - la sortie est déterministe et inspectable.
 */
import type { LayerInput, SafeArea } from '../types/storyboard.ts';

export type PropType = 'string' | 'number' | 'boolean' | 'color' | 'enum';

export interface PropSpec {
  type: PropType;
  description: string;
  required?: boolean;
  default?: string | number | boolean;
  /** Valeurs autorisées (type "enum"). */
  values?: readonly string[];
  min?: number;
  max?: number;
}

export interface ComponentContext {
  /** Id de l'instance (préfixe des ids enfants). */
  id: string;
  width: number;
  height: number;
  safeArea: SafeArea;
  /** Polices du thème (theme.fonts). */
  fonts: string[];
}

/** Props après validation : les valeurs par défaut sont appliquées. */
export type ResolvedProps = Record<string, string | number | boolean | undefined>;

export interface ComponentDefinition {
  name: string;
  description: string;
  props: Record<string, PropSpec>;
  expand(props: ResolvedProps, ctx: ComponentContext): LayerInput[];
}
