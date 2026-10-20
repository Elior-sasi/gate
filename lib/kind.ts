import type {Kind} from '@/lib/tickets';
// Cinema chains sell films (and the odd talk): what they sell is never a sports match or a concert, whatever the title says
// ("קיוטי נגד אקמי" is a cartoon, not a game).
const CINEMA=/(?:^|\.)(?:cinema-city|planetcinema|yesplanet|rav-hen|lev|hotcinema|globusmax|jer-cin|cinematheque)\.co(?:\.il)?$|jer-cin\.org\.il$/i;
export const fixKind=(k:Kind,seller?:string):Kind=>seller&&CINEMA.test(seller)&&!['lecture','movie'].includes(k)?'movie':k;
