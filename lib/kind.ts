import type {Kind} from '@/lib/tickets';
// Cinemas mostly sell films, but also screen matches and concerts. So a cinema purchase is a film unless the mail says otherwise
// with real signs: a match needs team or league words ("מכבי", "ליגה", "גמר"), not just "נגד" ("קיוטי נגד אקמי" is a cartoon).
const CINEMA=/(?:^|\.)(?:cinema-city|planetcinema|yesplanet|rav-hen|lev|hotcinema|globusmax|jer-cin|cinematheque)\.co(?:\.il)?$|jer-cin\.org\.il$/i;
const SPORT=/מכבי|הפועל|בית"ר|בית״ר|ליגה|ליגת|יורוליג|מונדיאל|גביע|גמר|דרבי|נבחרת|כדורגל|כדורסל|טניס|אגרוף|UFC|NBA|NFL|F1|פורמולה|world cup|champions|league|final/i;
// A name that says it is a party ("מסיבת יום העצמאות…", "Halloween Party") is a party, whatever the mail's reading said.
const PARTY=/(?:^|\s)מסיב|\bparty\b|\brave\b|רייב/i;
// A convention ("כנס אנימה, קומיקס ופנטזיה", "קומיקון") is a convention, not a festival.
const CON=/כנס|קומיקון|(?:^|\s)קון(?=\s|!|$)|comic.?con|\bcon\b|convention/i;
export const fixKind=(k:Kind,seller?:string,title=''):Kind=>PARTY.test(title)&&k!=='movie'?'party':CON.test(title)&&k!=='movie'?'con':!seller||!CINEMA.test(seller)?k:k==='sport'&&!SPORT.test(title)?'movie':k==='other'?'movie':k;
