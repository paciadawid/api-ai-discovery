import { test as base, expect } from '@playwright/test';
import { PokeApi } from '../../src/api/pokeapi.api';
import { speciesInChain, type EvolutionChain, type PokemonType, type Species } from '../../src/domain/pokemon';

const test = base.extend<{ poke: PokeApi }>({
  poke: async ({ request }, use) => use(new PokeApi(request)),
});

test.describe('pokeapi chaining', () => {
  test('bulbasaur reaches venusaur through species and evolution chain, and each step points back', async ({ poke }) => {
    const pokemon = await poke.pokemon('bulbasaur');
    expect(pokemon.status, 'bulbasaur exists').toBe(200);

    // Follow the URLs the API hands out instead of building ids ourselves.
    const species = await poke.get<Species>(pokemon.body.species.url);
    expect(species.body.name, 'the species link leads to the bulbasaur species').toBe('bulbasaur');
    expect(species.body.evolves_from_species, 'bulbasaur is the start of its line').toBeNull();

    const chain = await poke.get<EvolutionChain>(species.body.evolution_chain.url);
    expect(speciesInChain(chain.body.chain), 'the chain is bulbasaur > ivysaur > venusaur').toEqual([
      'bulbasaur',
      'ivysaur',
      'venusaur',
    ]);

    // Second, independent view: the last species says where it evolved from.
    const venusaurRef = chain.body.chain.evolves_to[0].evolves_to[0].species;
    const venusaur = await poke.get<Species>(venusaurRef.url);
    expect(venusaur.body.evolves_from_species?.name, 'venusaur evolves from ivysaur').toBe('ivysaur');
  });

  test('eevee branches into eight evolutions and every branch names eevee as its origin', async ({ poke }) => {
    const species = await poke.get<Species>('pokemon-species/eevee');
    const chain = await poke.get<EvolutionChain>(species.body.evolution_chain.url);
    const branches = chain.body.chain.evolves_to.map((l) => l.species);
    expect(chain.body.chain.species.name, 'the chain starts at eevee').toBe('eevee');
    expect(branches, 'eevee has eight direct evolutions').toHaveLength(8);

    for (const branch of branches) {
      const child = await poke.get<Species>(branch.url);
      expect(child.body.evolves_from_species?.name, `${branch.name} evolves from eevee`).toBe('eevee');
    }
  });

  test('a type lists the pokemon whose own record carries that type', async ({ poke }) => {
    const bulbasaur = await poke.pokemon('bulbasaur');
    const ownTypes = bulbasaur.body.types.map((t) => t.type.name);
    expect(ownTypes, 'bulbasaur says it is grass').toContain('grass');

    const grassUrl = bulbasaur.body.types.find((t) => t.type.name === 'grass')!.type.url;
    const grass = await poke.get<PokemonType>(grassUrl);
    expect(grass.body.pokemon.map((p) => p.pokemon.name), 'the grass type lists bulbasaur').toContain('bulbasaur');

    // Negative with a control: the same call shape for a name that does not exist.
    const missing = await poke.pokemon('not-a-pokemon');
    expect(missing.status, 'an unknown name is not found').toBe(404);
  });
});
