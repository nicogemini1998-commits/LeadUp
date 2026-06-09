# routers/__init__.py
from . import auth
from . import leads
from . import admin
from . import notes
from . import contacts
from . import reminders
from . import companies

__all__ = ["auth", "leads", "admin", "notes", "contacts", "reminders", "companies"]
