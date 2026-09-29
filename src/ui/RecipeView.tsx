import { EntityLink } from './EntityLink';
import { IdList } from './IdList';
import { Unverified } from './Unverified';

export interface RecipeLike {
  stationId: string;
  stationLevel: number | null;
  materials: { itemId: string; count: number | null }[];
}

export function RecipeView({ recipe }: { recipe: RecipeLike | undefined }) {
  if (!recipe) return <span className="muted">Not crafted</span>;
  return (
    <div className="recipe">
      <div>
        At <EntityLink id={recipe.stationId} />, level{' '}
        {recipe.stationLevel === null ? <Unverified /> : recipe.stationLevel}
      </div>
      <IdList items={recipe.materials.map((m) => ({ id: m.itemId, count: m.count }))} />
    </div>
  );
}
