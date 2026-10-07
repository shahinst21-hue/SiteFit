// Supabase signInWithOAuth returns its authorisation URL. Authenticated manual
// linkIdentity returns the provider URL directly. Admit only those exact paths.
export function googleAuthRedirect(value:string,supabaseOrigin:string,linking:boolean){
 const url=new URL(value),supabase=new URL(supabaseOrigin);
 if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error('invalid_oauth_url');
 if(url.origin===supabase.origin&&url.pathname==='/auth/v1/authorize'&&url.searchParams.get('provider')==='google')return url.href;
 if(linking&&url.origin==='https://accounts.google.com'&&['/o/oauth2/v2/auth','/o/oauth2/auth'].includes(url.pathname)&&url.searchParams.get('redirect_uri')===`${supabase.origin}/auth/v1/callback`)return url.href;
 throw Error('invalid_oauth_url');
}
