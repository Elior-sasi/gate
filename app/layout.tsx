import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Unstage',description:'הכרטיסים שלך, במקום אחד',applicationName:'Unstage',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Unstage',statusBarStyle:'black-translucent'},icons:{apple:[{url:'/apple-touch-icon.png',sizes:'180x180'}]}};
export const viewport:Viewport={width:'device-width',initialScale:1,maximumScale:1,userScalable:false,themeColor:'#0a0f14'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>}
