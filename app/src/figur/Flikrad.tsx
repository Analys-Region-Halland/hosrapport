// figur/Flikrad.tsx: vyval och nivåval på figurens titelrad (stilguiden 5.4 och 6.1).
// Ägare: WP4. Tunt skal runt ui/Flikar; placeringen (högerställd på desktop,
// under undertiteln på mobil) sköts av Figur. Visas bara med mer än ett val.

import Flikar from "../ui/Flikar";

export interface FlikradProps {
  flikar: { id: string; etikett: string }[];
  aktiv: string;
  onByt(id: string): void;
  etikett: string;          // tillgängligt namn för fliklistan
  panel?: string;           // id för panelen (plotytan) som flikarna styr
}

export default function Flikrad(props: FlikradProps) {
  return <Flikar {...props} />;
}
