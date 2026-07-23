import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchFoods, fetchCharacters } from "../api";
import { Card, Icon, RarityStars } from "../components/ui";

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A short "who should eat this" recommendation derived from the buff (#9). */
function foodAdvice(effect: string, type: string): string {
  const e = effect.toLowerCase();
  if (/crit/.test(e)) return "Crit-reliant on-field carries — any DPS whose damage hinges on landing crits.";
  if (/physical dmg/.test(e)) return "Physical DPS such as Eula or Razor.";
  if (/\batk\b|attack/.test(e)) return "On-field DPS and attack-scaling carries who want more raw damage.";
  if (/\bdef\b|defense/.test(e)) return "DEF-scaling units like Noelle or Albedo.";
  if (/elemental mastery|\bem\b/.test(e)) return "Reaction-driving units (Sucrose, Kazuha, Nahida) that scale on EM.";
  if (type === "Revival" || /reviv|revive/.test(e)) return "Any team — a clutch revive/heal before or after a hard fight.";
  if (type === "Adventure") return "Overworld exploration — stamina, climbing and environmental relief.";
  return "Handy party-wide utility for tougher content.";
}

/** Per-food detail page (#9): buff, lore, in-game recipe, specialty owner + who to use it on. */
export function FoodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const foodsQ = useQuery({ queryKey: ["foods"], queryFn: fetchFoods });
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const food = foodsQ.data?.find((f) => f.id === id);

  if (foodsQ.isLoading) return <p className="muted">Loading food…</p>;
  if (!food) return <p className="muted">Food not found.</p>;

  const specialtyId = food.specialtyName ? slug(food.specialtyName) : "";
  const specialtyChar = rosterQ.data?.find((c) => c.id === specialtyId);
  const recipeQuery = encodeURIComponent(`${food.name.replace(/["']/g, "")} recipe`);

  return (
    <div className="character">
      <Link to="/food" className="back">
        ← Back to food
      </Link>

      <header className={`food-hero rarity-${food.rarity}`}>
        <Icon src={food.icon} alt={food.name} size={72} />
        <div>
          <h1>{food.name}</h1>
          <div className="char-tags">
            <RarityStars rarity={food.rarity} />
            <span className="badge muted-badge">{food.type}</span>
            {food.specialtyName ? <span className="badge">Special dish</span> : null}
          </div>
        </div>
      </header>

      <div className="detail-masonry">
        <Card title="Buff">
          <p className="food-effect">{food.effect}</p>
          <p className="muted small">Values shown are at max (Delicious) quality.</p>
        </Card>

        <Card title="Recommended for">
          {specialtyChar ? (
            <p>
              Signature dish of{" "}
              <Link to={`/character/${specialtyChar.id}`} className="food-owner">
                <Icon src={specialtyChar.icon} alt="" size={22} /> {specialtyChar.name}
              </Link>
              .
            </p>
          ) : food.specialtyName ? (
            <p>
              {food.specialtyName}'s specialty dish.
            </p>
          ) : null}
          <p>{foodAdvice(food.effect, food.type)}</p>
        </Card>

        {food.ingredients.length ? (
          <Card title="Recipe">
            <ul className="mat-list">
              {food.ingredients.map((ing) => (
                <li key={ing.name}>
                  <span>{ing.name}</span>
                  <span className="mat-count">×{ing.count}</span>
                </li>
              ))}
            </ul>
            <p className="muted small stat-foot">
              In-game ingredients.{" "}
              <a href={`https://www.google.com/search?q=${recipeQuery}`} target="_blank" rel="noreferrer">
                Search for a real-world recipe →
              </a>
            </p>
          </Card>
        ) : null}

        {food.description ? (
          <Card title="Lore">
            <p className="intro-lore">{food.description}</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
