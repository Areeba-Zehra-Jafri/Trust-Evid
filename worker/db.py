"""Service-role Supabase client. Never log keys."""
from supabase import Client, create_client

from config import supabase_service_key, supabase_url


def get_admin_client() -> Client:
    return create_client(supabase_url(), supabase_service_key())
