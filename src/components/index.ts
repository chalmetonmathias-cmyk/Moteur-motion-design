/**
 * Registre des composants.
 *
 * Pour ajouter un composant : créer un fichier qui exporte un
 * `ComponentDefinition`, puis l'ajouter à `REGISTRY` ci-dessous.
 * Il devient instanciable depuis le JSON :
 *   { "type": "component", "ref": "mon-composant", "props": { … } }
 */
import type { ComponentDefinition } from './types.ts';
import { titleCard } from './title-card.ts';
import { lowerThird } from './lower-third.ts';
import { logoReveal } from './logo-reveal.ts';

export type { ComponentDefinition, ComponentContext, PropSpec, ResolvedProps } from './types.ts';

const REGISTRY = new Map<string, ComponentDefinition>();

export function registerComponent(def: ComponentDefinition): void {
  REGISTRY.set(def.name, def);
}

export function getComponent(name: string): ComponentDefinition | undefined {
  return REGISTRY.get(name);
}

export function listComponents(): ComponentDefinition[] {
  return [...REGISTRY.values()];
}

for (const def of [titleCard, lowerThird, logoReveal]) registerComponent(def);
