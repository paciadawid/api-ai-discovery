export type NamedRef = { name: string; url: string };
export type Pokemon = { id: number; name: string; species: NamedRef; types: { slot: number; type: NamedRef }[] };
export type Species = { id: number; name: string; evolution_chain: { url: string }; evolves_from_species: NamedRef | null };
export type ChainLink = { species: NamedRef; evolves_to: ChainLink[] };
export type EvolutionChain = { id: number; chain: ChainLink };
export type PokemonType = { name: string; pokemon: { pokemon: NamedRef }[] };

/** Flattens a chain into species names, root first, depth first. */
export function speciesInChain(link: ChainLink): string[] {
  return [link.species.name, ...link.evolves_to.flatMap(speciesInChain)];
}
