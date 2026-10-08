-- v2 administrator operations. Apply AFTER 001_bridge_acl.sql.
-- SECURITY DEFINER procedures must only be callable with the server-side service_role.
alter table public.bridge_channels
  add column if not exists active boolean not null default true;

create table if not exists public.bridge_audit_logs (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bridge_audit_logs_created_at_idx
  on public.bridge_audit_logs(created_at desc);
alter table public.bridge_audit_logs enable row level security;
revoke all on public.bridge_audit_logs from anon, authenticated;

create or replace function public.bridge_sync_guild(
  p_guild_id text, p_guild_name text, p_channels jsonb, p_create boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_exists boolean;
  v_count integer;
begin
  if p_guild_id is null or p_guild_id !~ '^[0-9]{16,22}$' then
    raise exception 'Invalid guild ID';
  end if;
  if p_guild_name is null or length(btrim(p_guild_name)) not between 1 and 100 then
    raise exception 'Invalid guild name';
  end if;
  if p_channels is null or jsonb_typeof(p_channels) <> 'array'
    or jsonb_array_length(p_channels) > 500 then
    raise exception 'Invalid channel list';
  end if;

  v_count := jsonb_array_length(p_channels);
  if exists (
    select 1 from jsonb_array_elements(p_channels) as c(value)
    where jsonb_typeof(c.value) <> 'object'
      or coalesce(c.value->>'id','') !~ '^[0-9]{16,22}$'
      or length(coalesce(c.value->>'name','')) not between 1 and 100
  ) then
    raise exception 'Invalid channel metadata';
  end if;
  if (
    select count(distinct c.value->>'id')
    from jsonb_array_elements(p_channels) as c(value)
  ) <> v_count then
    raise exception 'Duplicate channel IDs';
  end if;

  if exists (
    select 1
    from public.bridge_channels existing
    join jsonb_array_elements(p_channels) as incoming(value)
      on incoming.value->>'id' = existing.id
    where existing.guild_id <> p_guild_id
  ) then
    raise exception 'Cross-guild channel conflict';
  end if;

  select exists(select 1 from public.bridge_guilds where id = p_guild_id)
    into v_exists;
  if not v_exists and not p_create then
    raise exception 'Guild must be registered before sync';
  end if;

  insert into public.bridge_guilds(id, name, enabled, synced_at)
  values(p_guild_id, p_guild_name, true, v_now)
  on conflict(id) do update
    set name = excluded.name, synced_at = excluded.synced_at;
    -- An explicitly disabled guild must NOT be re-enabled by synchronization.

  insert into public.bridge_channels(id, guild_id, name, active, synced_at)
  select c.value->>'id', p_guild_id, c.value->>'name', true, v_now
  from jsonb_array_elements(p_channels) as c(value)
  on conflict(id) do update
    set name = excluded.name, active = true, synced_at = excluded.synced_at;

  update public.bridge_channels c
  set active = false, synced_at = v_now
  where c.guild_id = p_guild_id
    and not exists (
      select 1 from jsonb_array_elements(p_channels) as item(value)
      where item.value->>'id' = c.id
    );

  -- A removed channel must require new explicit approval if it returns.
  delete from public.bridge_channel_access a
  where a.guild_id = p_guild_id
    and not exists (
      select 1 from public.bridge_channels c
      where c.id = a.channel_id and c.guild_id = a.guild_id and c.active
    );

  insert into public.bridge_audit_logs(actor,action,target_type,target_id,details)
  values('bootstrap-admin',case when v_exists then 'guild.sync' else 'guild.register' end,
         'guild',p_guild_id,jsonb_build_object('channelCount',v_count));

  return jsonb_build_object('guildId',p_guild_id,'channelCount',v_count,'syncedAt',v_now);
end;
$$;

create or replace function public.bridge_set_access(
  p_user_id uuid, p_guild_id text, p_mode text, p_channel_ids text[]
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if p_mode not in ('all_channels','selected_channels') or p_channel_ids is null then
    raise exception 'Invalid access mode';
  end if;
  if p_mode = 'all_channels' and cardinality(p_channel_ids) <> 0 then
    raise exception 'all_channels cannot include explicit channel IDs';
  end if;
  if cardinality(p_channel_ids) > 500
    or (select count(distinct c) from unnest(p_channel_ids) c) <> cardinality(p_channel_ids) then
    raise exception 'Invalid channel ID list';
  end if;
  if not exists (select 1 from public.bridge_users where id = p_user_id and enabled) then
    raise exception 'User not enabled';
  end if;
  if not exists (select 1 from public.bridge_guilds where id = p_guild_id and enabled) then
    raise exception 'Guild not enabled';
  end if;
  if exists (
    select 1 from unnest(p_channel_ids) as requested(id)
    where not exists (
      select 1 from public.bridge_channels c
      where c.id = requested.id and c.guild_id = p_guild_id and c.active
    )
  ) then
    raise exception 'Unknown, inactive or cross-guild channel';
  end if;

  insert into public.bridge_guild_access(user_id,guild_id,access_mode)
  values(p_user_id,p_guild_id,p_mode)
  on conflict(user_id,guild_id) do update set access_mode = excluded.access_mode;
  delete from public.bridge_channel_access
  where user_id = p_user_id and guild_id = p_guild_id;
  insert into public.bridge_channel_access(user_id,guild_id,channel_id,can_read)
  select p_user_id,p_guild_id,id,true from unnest(p_channel_ids) as id;
  v_count := cardinality(p_channel_ids);

  insert into public.bridge_audit_logs(actor,action,target_type,target_id,details)
  values('bootstrap-admin','access.set','user',p_user_id::text,
    jsonb_build_object('guildId',p_guild_id,'mode',p_mode,'channelCount',v_count));

  return jsonb_build_object('userId',p_user_id,'guildId',p_guild_id,
                            'mode',p_mode,'channelCount',v_count);
end;
$$;

create or replace function public.bridge_create_user(
  p_display_name text, p_role text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 80
    or p_role is null or p_role not in ('admin','member','viewer') then
    raise exception 'Invalid user';
  end if;
  insert into public.bridge_users(display_name,role)
  values (btrim(p_display_name),p_role) returning id into v_id;
  insert into public.bridge_audit_logs(actor,action,target_type,target_id)
  values('bootstrap-admin','user.create','user',v_id::text);
  return jsonb_build_object('id',v_id,'displayName',btrim(p_display_name),
                            'role',p_role,'enabled',true);
end;
$$;

create or replace function public.bridge_issue_credential(
  p_user_id uuid, p_token_hash text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
    or not exists (select 1 from public.bridge_users where id = p_user_id and enabled) then
    raise exception 'Invalid user or credential hash';
  end if;
  insert into public.bridge_credentials(user_id,token_hash)
  values(p_user_id,p_token_hash) returning id into v_id;
  insert into public.bridge_audit_logs(actor,action,target_type,target_id,details)
  values('bootstrap-admin','credential.issue','credential',v_id::text,
         jsonb_build_object('userId',p_user_id));
  return jsonb_build_object('id',v_id,'userId',p_user_id);
end;
$$;

create or replace function public.bridge_revoke_credential(
  p_credential_id uuid
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid;
begin
  update public.bridge_credentials
  set revoked_at = now()
  where id = p_credential_id and revoked_at is null
  returning user_id into v_user_id;
  if v_user_id is null then raise exception 'Credential not found or already revoked'; end if;
  insert into public.bridge_audit_logs(actor,action,target_type,target_id,details)
  values('bootstrap-admin','credential.revoke','credential',p_credential_id::text,
         jsonb_build_object('userId',v_user_id));
  return jsonb_build_object('credentialId',p_credential_id,'revoked',true);
end;
$$;

revoke all on function public.bridge_sync_guild(text,text,jsonb,boolean) from PUBLIC,anon,authenticated;
revoke all on function public.bridge_set_access(uuid,text,text,text[]) from PUBLIC,anon,authenticated;
revoke all on function public.bridge_create_user(text,text) from PUBLIC,anon,authenticated;
revoke all on function public.bridge_issue_credential(uuid,text) from PUBLIC,anon,authenticated;
revoke all on function public.bridge_revoke_credential(uuid) from PUBLIC,anon,authenticated;

grant execute on function public.bridge_sync_guild(text,text,jsonb,boolean) to service_role;
grant execute on function public.bridge_set_access(uuid,text,text,text[]) to service_role;
grant execute on function public.bridge_create_user(text,text) to service_role;
grant execute on function public.bridge_issue_credential(uuid,text) to service_role;
grant execute on function public.bridge_revoke_credential(uuid) to service_role;
