/** Render a weapon effect template, substituting {0}/{1}… placeholders with the given values
 *  (highlighted). Shared by the weapon detail and weapon-compare pages. */
export function renderEffect(template: string, values: string[]) {
  return template.split(/(\{\d+\})/g).map((part, i) => {
    const m = part.match(/^\{(\d+)\}$/);
    if (m) {
      return (
        <b key={i} className="hl">
          {values[Number(m[1])] ?? part}
        </b>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
