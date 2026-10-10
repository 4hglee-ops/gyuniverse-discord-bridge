import type { AdminStore } from "./service.js";

export interface AdminReadStore extends AdminStore {
  list<T>(table: string, query?: Record<string,string>): Promise<T[]>;
}

export class SupabaseAdminReadStore implements AdminReadStore {
  constructor(private readonly base:string, private readonly key:string){}
  private async request<T>(path:string, init?:RequestInit):Promise<T>{
    const res=await fetch(this.base+"/rest/v1/"+path,{
      cache:"no-store",...init,
      headers:{apikey:this.key,Authorization:"Bearer "+this.key,"Cache-Control":"no-store",
        ...(init?.headers as Record<string,string>??{})},
    });
    if(!res.ok) throw new Error("Admin DB request failed ("+res.status+")");
    return await res.json() as T;
  }
  list<T>(table:string,query:Record<string,string>={}):Promise<T[]>{
    return this.request<T[]>(table+"?"+new URLSearchParams({select:"*",...query}));
  }
  rpc<T>(name:string,payload:Record<string,unknown>):Promise<T>{
    return this.request<T>("rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)});
  }
}

export function configuredAdminReadStore():AdminReadStore {
  const base=process.env.BRIDGE_SUPABASE_URL?.trim();
  const key=process.env.BRIDGE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if(!base||!key) throw new Error("Admin storage not configured");
  const parsed=new URL(base);
  if(parsed.protocol!=="https:"&&!(parsed.protocol==="http:"&&
     ["localhost","127.0.0.1"].includes(parsed.hostname))) throw Error("HTTPS required");
  return new SupabaseAdminReadStore(parsed.toString().replace(/\/$/,""),key);
}

export async function adminOverview(store:AdminReadStore) {
  const [guilds,users,channels,grants,allowedChannels,credentials,audit] = await Promise.all([
    store.list<{id:string;name:string;enabled:boolean;synced_at:string|null}>("bridge_guilds",{order:"name.asc"}),
    store.list<{id:string;display_name:string;role:string;enabled:boolean}>("bridge_users",{order:"created_at.asc"}),
    store.list<{id:string;guild_id:string;name:string;active:boolean}>("bridge_channels",{order:"name.asc"}),
    store.list<{user_id:string;guild_id:string;access_mode:string}>("bridge_guild_access"),
    store.list<{user_id:string;guild_id:string;channel_id:string}>("bridge_channel_access",{can_read:"eq.true"}),
    store.list<{id:string;user_id:string;revoked_at:string|null;created_at:string}>("bridge_credentials",{order:"created_at.desc"}),
    store.list<{id:number;actor:string;action:string;target_type:string;target_id:string;created_at:string}>("bridge_audit_logs",{order:"created_at.desc",limit:"40"}),
  ]);
  // Never expose token_hash, service-role key or API authentication credentials.
  return {guilds,users,channels,grants,allowedChannels,credentials,audit};
}
