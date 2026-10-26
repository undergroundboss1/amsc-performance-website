/**
 * The week's study card, rendered from the structured study_card JSON
 * (extracted once from the Coach Resource Library). Weeks 9 to 12 carry only
 * a focus line until their full card is issued.
 */
function Heading({ children }) {
  return <h3 className="font-display text-sm font-bold tracking-widest uppercase text-accent mt-6 mb-2">{children}</h3>;
}

function Bullets({ items }) {
  return (
    <ul className="space-y-2 font-body text-sm text-white leading-relaxed list-disc pl-5 marker:text-accent">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
}

export default function StudyCard({ week }) {
  const card = week.study_card;
  if (!card) return null;

  if (!card.key_ideas) {
    return (
      <div>
        {card.focus && <p className="font-body text-white leading-relaxed">{card.focus}</p>}
        <p className="text-secondary text-sm font-body mt-3">The full study card is issued as this session gets closer.</p>
      </div>
    );
  }

  return (
    <div>
      {week.takeaway && (
        <p className="border-l-2 border-accent pl-4 font-body text-white">
          <span className="font-semibold">One sentence: </span>{week.takeaway}
        </p>
      )}

      <Heading>Key ideas</Heading>
      <Bullets items={card.key_ideas} />

      {card.words?.length > 0 && (
        <>
          <Heading>Words to know</Heading>
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {card.words.map((w) => (
              <div key={w.term} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="font-body font-semibold text-white">{w.term}</dt>
                <dd className="font-body text-sm text-secondary sm:col-span-2 mt-1 sm:mt-0">{w.meaning}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {card.try_it?.length > 0 && (
        <>
          <Heading>Try it this week</Heading>
          <Bullets items={card.try_it} />
        </>
      )}

      {card.think_about_it && (
        <>
          <Heading>Think about it</Heading>
          <p className="font-body text-sm text-white leading-relaxed bg-surface-light rounded-lg p-4">{card.think_about_it}</p>
        </>
      )}
    </div>
  );
}
