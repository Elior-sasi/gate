import {auth,signIn} from '@/auth';
import App from './ui';
export const dynamic='force-dynamic';
// Local preview with sample tickets (never in production): GATE_DEMO=1 npm run dev
const DEMO=process.env.NODE_ENV!=='production'&&process.env.GATE_DEMO==='1';
export default async function Page(){if(DEMO)return <App gmail user={{id:'demo',name:'אליאור',email:'demo@example.com'}} configured login={async()=>{'use server';}}/>;
 const configured=!!(process.env.AUTH_GOOGLE_SECRET&&process.env.AUTH_SECRET);const session=configured?await auth():null;
 return <App gmail={!!(session as {gmail?:boolean}|null)?.gmail} user={session?.user?{id:session.user.id||'',name:session.user.name||'',email:session.user.email||''}:null} configured={configured} login={async()=>{'use server';await signIn('google',{redirectTo:'/'});}}/>;
}
