export const dynamic='force-dynamic';
// The open app compares this with its own build and reloads itself after a new deploy.
export function GET(){return Response.json({build:process.env.VERCEL_GIT_COMMIT_SHA||''},{headers:{'Cache-Control':'no-store'}});}
