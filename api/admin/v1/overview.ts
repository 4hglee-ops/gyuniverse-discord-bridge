import { adminRequestMode } from "../../../src/admin/session.js";
import { configuredAdminReadStore, adminOverview } from "../../../src/admin/read.js";

export async function GET(request:Request):Promise<Response>{
 if(!adminRequestMode(request))return Response.json({error:"Unauthorized"},{status:401});
 try{
   return Response.json(await adminOverview(configuredAdminReadStore()),{headers:{"Cache-Control":"no-store"}});
 }catch{
   return Response.json({error:"Admin data unavailable"},{status:503});
 }
}
