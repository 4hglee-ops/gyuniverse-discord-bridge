import { createAdminSession, currentAdminSession, sessionCookieHeader, sameOrigin } from "../../../src/admin/session.js";

const headers={"Cache-Control":"no-store"};
export async function GET(request:Request):Promise<Response>{
 const session=currentAdminSession(request);
 return Response.json(session?{authenticated:true,...session}:{authenticated:false},{headers});
}
export async function POST(request:Request):Promise<Response>{
 if(!sameOrigin(request)) return Response.json({error:"Origin rejected"},{status:403,headers});
 let body:unknown;
 try{body=await request.json();}catch{return Response.json({error:"Invalid JSON"},{status:400,headers});}
 if(!body||typeof body!=="object"||typeof (body as {password?:unknown}).password!=="string")
   return Response.json({error:"Password required"},{status:400,headers});
 try{
   const session=createAdminSession(request,(body as {password:string}).password);
   if(!session) return Response.json({error:"Invalid credentials"},{status:401,headers});
   return Response.json({authenticated:true,csrf:session.csrf,expiresAt:session.expiresAt},
     {headers:{...headers,"Set-Cookie":session.cookie}});
 }catch{return Response.json({error:"Admin session not configured"},{status:503,headers});}
}
export async function DELETE(request:Request):Promise<Response>{
 if(!sameOrigin(request)) return Response.json({error:"Origin rejected"},{status:403,headers});
 const session=currentAdminSession(request);
 if(!session || request.headers.get("x-bridge-csrf")!==session.csrf)
   return Response.json({error:"Unauthorized"},{status:401,headers});
 return Response.json({authenticated:false},{headers:{...headers,
   "Set-Cookie":sessionCookieHeader(request,"",true)}});
}
